namespace Kopano.Sovereign.Gateway.Youtube;

public sealed record YoutubeThumbnail(string? Url, int? Width, int? Height);

public sealed record YoutubeUpload(
    string VideoId,
    string Title,
    string? Description,
    DateTimeOffset? PublishedAt,
    YoutubeThumbnail? Thumbnail,
    string WatchUrl);

public sealed record YoutubeChannelFeed(
    string ChannelId,
    string ChannelHandle,
    string ChannelTitle,
    string UploadsPlaylistId,
    IReadOnlyList<YoutubeUpload> Uploads,
    string? NextPageToken);

public sealed record KcGatewayReceipt(
    string ReceiptId,
    string RequestId,
    string AdapterId,
    string CapabilityId,
    string Operation,
    string Gate,
    string Outcome,
    DateTimeOffset EmittedAt,
    IReadOnlyList<string> Reasons);

public sealed record YoutubeGatewayResponse(
    YoutubeChannelFeed Feed,
    KcGatewayReceipt Receipt,
    string Transport,
    string Provider);
