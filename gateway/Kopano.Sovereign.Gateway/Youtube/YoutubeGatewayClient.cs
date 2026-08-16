using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using Microsoft.Extensions.Caching.Memory;

namespace Kopano.Sovereign.Gateway.Youtube;

public sealed class YoutubeGatewayClient(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IMemoryCache cache)
{
    private const string AdapterId = "youtube.public-media.read";
    private const string CapabilityId = "youtube.channel.uploads.read";

    public async Task<YoutubeGatewayResponse> GetUploadsAsync(int limit, string requestId, CancellationToken cancellationToken)
    {
        var apiKey = configuration["YOUTUBE_API_KEY"];
        var handle = configuration["YOUTUBE_CHANNEL_HANDLE"] ?? "@kopanolabs";
        var boundedLimit = Math.Clamp(limit, 1, 12);
        var mode = string.IsNullOrWhiteSpace(apiKey) ? "public-feed" : "data-api-v3";
        var cacheKey = $"youtube:uploads:{mode}:{handle}:{boundedLimit}";

        if (cache.TryGetValue<YoutubeChannelFeed>(cacheKey, out var cachedFeed) && cachedFeed is not null)
        {
            return new YoutubeGatewayResponse(
                cachedFeed,
                Receipt(requestId, "ALLOW", "executed", ["Public read capability executed through the rigid gateway.", "Response served from bounded in-memory cache (cache-hit)."]),
                "dotnet-gateway",
                string.IsNullOrWhiteSpace(apiKey) ? "YouTube public Atom feed" : "YouTube Data API v3");
        }

        YoutubeChannelFeed feed;
        string provider;
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            feed = await ReadPublicFeedAsync(handle, boundedLimit, cancellationToken);
            provider = "YouTube public Atom feed";
        }
        else
        {
            var client = httpClientFactory.CreateClient("YouTube");
            var channel = await ResolveChannelAsync(client, apiKey, handle, cancellationToken);
            feed = await ReadUploadsAsync(client, apiKey, handle, channel, boundedLimit, cancellationToken);
            provider = "YouTube Data API v3";
        }

        cache.Set(cacheKey, feed, TimeSpan.FromMinutes(5));

        return new YoutubeGatewayResponse(
            feed,
            Receipt(requestId, "ALLOW", "executed", [
                "Public read capability executed through the rigid gateway.",
                "Upstream response normalized before returning to the APWA.",
                string.IsNullOrWhiteSpace(apiKey)
                    ? "Credentialless public-feed transport selected; no deployment secret required for this read-only proof."
                    : "Restricted API-key transport selected."
            ]),
            "dotnet-gateway",
            provider);
    }

    private async Task<YoutubeChannelFeed> ReadPublicFeedAsync(string handle, int limit, CancellationToken cancellationToken)
    {
        var client = httpClientFactory.CreateClient("YouTubePublic");
        var normalizedHandle = handle.StartsWith('@') ? handle : $"@{handle}";
        using var channelPage = await client.GetAsync(normalizedHandle, cancellationToken);
        EnsureYoutubeSuccess(channelPage);
        var html = await channelPage.Content.ReadAsStringAsync(cancellationToken);

        var channelIdMatch = Regex.Match(html, "\\\"(?:channelId|externalId)\\\":\\\"(?<id>UC[0-9A-Za-z_-]{20,})\\\"");
        if (!channelIdMatch.Success)
        {
            throw new YoutubeGatewayNotFoundException($"Could not resolve a public YouTube channel id for configured handle {handle}.");
        }

        var channelId = channelIdMatch.Groups["id"].Value;
        using var feedResponse = await client.GetAsync($"feeds/videos.xml?channel_id={Uri.EscapeDataString(channelId)}", cancellationToken);
        EnsureYoutubeSuccess(feedResponse);
        await using var stream = await feedResponse.Content.ReadAsStreamAsync(cancellationToken);
        var document = await XDocument.LoadAsync(stream, LoadOptions.None, cancellationToken);

        XNamespace atom = "http://www.w3.org/2005/Atom";
        XNamespace yt = "http://www.youtube.com/xml/schemas/2015";
        XNamespace media = "http://search.yahoo.com/mrss/";

        var channelTitle = document.Root?.Element(atom + "title")?.Value?.Trim();
        if (string.IsNullOrWhiteSpace(channelTitle))
        {
            channelTitle = handle;
        }

        var uploads = document.Root?
            .Elements(atom + "entry")
            .Take(limit)
            .Select(entry =>
            {
                var videoId = entry.Element(yt + "videoId")?.Value?.Trim();
                var title = entry.Element(atom + "title")?.Value?.Trim();
                if (string.IsNullOrWhiteSpace(videoId) || string.IsNullOrWhiteSpace(title))
                {
                    return null;
                }

                DateTimeOffset? publishedAt = null;
                if (DateTimeOffset.TryParse(entry.Element(atom + "published")?.Value, out var parsedPublishedAt))
                {
                    publishedAt = parsedPublishedAt;
                }

                var group = entry.Element(media + "group");
                var description = group?.Element(media + "description")?.Value;
                var thumb = group?.Elements(media + "thumbnail").FirstOrDefault();
                YoutubeThumbnail? thumbnail = null;
                if (thumb is not null)
                {
                    var width = int.TryParse(thumb.Attribute("width")?.Value, out var parsedWidth) ? parsedWidth : (int?)null;
                    var height = int.TryParse(thumb.Attribute("height")?.Value, out var parsedHeight) ? parsedHeight : (int?)null;
                    thumbnail = new YoutubeThumbnail(thumb.Attribute("url")?.Value, width, height);
                }

                return new YoutubeUpload(
                    videoId,
                    title,
                    description,
                    publishedAt,
                    thumbnail,
                    $"https://www.youtube.com/watch?v={Uri.EscapeDataString(videoId)}");
            })
            .Where(upload => upload is not null)
            .Cast<YoutubeUpload>()
            .ToList() ?? [];

        return new YoutubeChannelFeed(channelId, handle, channelTitle, "public-feed", uploads, null);
    }

    private static async Task<ResolvedChannel> ResolveChannelAsync(
        HttpClient client,
        string apiKey,
        string handle,
        CancellationToken cancellationToken)
    {
        var url = $"channels?part=snippet%2CcontentDetails&forHandle={Uri.EscapeDataString(handle)}&fields=items(id%2Csnippet(title)%2CcontentDetails%2FrelatedPlaylists%2Fuploads)&key={Uri.EscapeDataString(apiKey)}";
        using var response = await client.GetAsync(url, cancellationToken);
        EnsureYoutubeSuccess(response);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);
        var items = document.RootElement.GetProperty("items");

        if (items.GetArrayLength() == 0)
        {
            throw new YoutubeGatewayNotFoundException($"No YouTube channel matched configured handle {handle}.");
        }

        var item = items[0];
        var channelId = item.GetProperty("id").GetString();
        var title = item.GetProperty("snippet").GetProperty("title").GetString();
        var uploads = item.GetProperty("contentDetails").GetProperty("relatedPlaylists").GetProperty("uploads").GetString();

        if (string.IsNullOrWhiteSpace(channelId) || string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(uploads))
        {
            throw new YoutubeGatewayUpstreamException("YouTube returned an incomplete channel resource.");
        }

        return new ResolvedChannel(channelId, title, uploads);
    }

    private static async Task<YoutubeChannelFeed> ReadUploadsAsync(
        HttpClient client,
        string apiKey,
        string handle,
        ResolvedChannel channel,
        int limit,
        CancellationToken cancellationToken)
    {
        var url = $"playlistItems?part=snippet%2CcontentDetails&playlistId={Uri.EscapeDataString(channel.UploadsPlaylistId)}&maxResults={limit}&fields=nextPageToken%2Citems(contentDetails%2FvideoId%2Csnippet(title%2Cdescription%2CpublishedAt%2Cthumbnails%2Fhigh))&key={Uri.EscapeDataString(apiKey)}";
        using var response = await client.GetAsync(url, cancellationToken);
        EnsureYoutubeSuccess(response);

        await using var stream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(stream, cancellationToken: cancellationToken);

        var uploads = new List<YoutubeUpload>();
        foreach (var item in document.RootElement.GetProperty("items").EnumerateArray())
        {
            var contentDetails = item.GetProperty("contentDetails");
            var snippet = item.GetProperty("snippet");
            var videoId = contentDetails.GetProperty("videoId").GetString();
            var title = snippet.GetProperty("title").GetString();

            if (string.IsNullOrWhiteSpace(videoId) || string.IsNullOrWhiteSpace(title))
            {
                continue;
            }

            string? description = snippet.TryGetProperty("description", out var descriptionNode) ? descriptionNode.GetString() : null;
            DateTimeOffset? publishedAt = null;
            if (snippet.TryGetProperty("publishedAt", out var publishedNode) && DateTimeOffset.TryParse(publishedNode.GetString(), out var parsedPublishedAt))
            {
                publishedAt = parsedPublishedAt;
            }

            YoutubeThumbnail? thumbnail = null;
            if (snippet.TryGetProperty("thumbnails", out var thumbnails) && thumbnails.TryGetProperty("high", out var high))
            {
                thumbnail = new YoutubeThumbnail(
                    high.TryGetProperty("url", out var urlNode) ? urlNode.GetString() : null,
                    high.TryGetProperty("width", out var widthNode) ? widthNode.GetInt32() : null,
                    high.TryGetProperty("height", out var heightNode) ? heightNode.GetInt32() : null);
            }

            uploads.Add(new YoutubeUpload(
                videoId,
                title,
                description,
                publishedAt,
                thumbnail,
                $"https://www.youtube.com/watch?v={Uri.EscapeDataString(videoId)}"));
        }

        var nextPageToken = document.RootElement.TryGetProperty("nextPageToken", out var tokenNode) ? tokenNode.GetString() : null;
        return new YoutubeChannelFeed(channel.ChannelId, handle, channel.Title, channel.UploadsPlaylistId, uploads, nextPageToken);
    }

    private static void EnsureYoutubeSuccess(HttpResponseMessage response)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        throw new YoutubeGatewayUpstreamException($"YouTube upstream returned HTTP {(int)response.StatusCode}.");
    }

    private static KcGatewayReceipt Receipt(string requestId, string gate, string outcome, IReadOnlyList<string> reasons) =>
        new(
            $"youtube:{requestId}",
            requestId,
            AdapterId,
            CapabilityId,
            ["read"],
            gate,
            outcome,
            DateTimeOffset.UtcNow,
            reasons);

    private sealed record ResolvedChannel(string ChannelId, string Title, string UploadsPlaylistId);
}

public sealed class YoutubeGatewayConfigurationException(string message) : Exception(message);
public sealed class YoutubeGatewayNotFoundException(string message) : Exception(message);
public sealed class YoutubeGatewayUpstreamException(string message) : Exception(message);
