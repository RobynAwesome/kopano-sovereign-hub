using System.Text.Json;
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

        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new YoutubeGatewayConfigurationException("YOUTUBE_API_KEY is not configured.");
        }

        var boundedLimit = Math.Clamp(limit, 1, 12);
        var cacheKey = $"youtube:uploads:{handle}:{boundedLimit}";

        if (cache.TryGetValue<YoutubeChannelFeed>(cacheKey, out var cachedFeed) && cachedFeed is not null)
        {
            return new YoutubeGatewayResponse(
                cachedFeed,
                Receipt(requestId, "ALLOW", "executed", ["Public read capability executed through the rigid gateway.", "Response served from bounded in-memory cache (cache-hit)."]),
                "dotnet-gateway",
                "YouTube Data API v3");
        }

        var client = httpClientFactory.CreateClient("YouTube");
        var channel = await ResolveChannelAsync(client, apiKey, handle, cancellationToken);
        var feed = await ReadUploadsAsync(client, apiKey, handle, channel, boundedLimit, cancellationToken);

        cache.Set(cacheKey, feed, TimeSpan.FromMinutes(5));

        return new YoutubeGatewayResponse(
            feed,
            Receipt(requestId, "ALLOW", "executed", ["Public read capability executed through the rigid gateway.", "Upstream response normalized before returning to the APWA."]),
            "dotnet-gateway",
            "YouTube Data API v3");
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
