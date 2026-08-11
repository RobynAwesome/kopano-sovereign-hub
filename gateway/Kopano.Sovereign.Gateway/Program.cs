using System.Threading.RateLimiting;
using Kopano.Sovereign.Gateway.Youtube;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddFilter("System.Net.Http.HttpClient.YouTube", LogLevel.Warning);
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("YouTube", client =>
{
    client.BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/");
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Kopano-Sovereign-Gateway/0.1");
});
builder.Services.AddSingleton<YoutubeGatewayClient>();

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("youtube-read", limiter =>
    {
        limiter.PermitLimit = 30;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 0;
        limiter.AutoReplenishment = true;
    });
});

var app = builder.Build();
app.UseRateLimiter();

app.MapGet("/health", (IConfiguration configuration) => Results.Ok(new
{
    status = "ok",
    service = "Kopano Sovereign Gateway",
    runtime = ".NET 10",
    adapter = "youtube.public-media.read",
    configured = !string.IsNullOrWhiteSpace(configuration["YOUTUBE_API_KEY"]),
}));

app.MapGet("/api/youtube/uploads", async (
    int? limit,
    HttpContext context,
    YoutubeGatewayClient gateway,
    CancellationToken cancellationToken) =>
{
    var boundedLimit = Math.Clamp(limit ?? 6, 1, 12);

    try
    {
        var result = await gateway.GetUploadsAsync(boundedLimit, context.TraceIdentifier, cancellationToken);
        return Results.Ok(result);
    }
    catch (YoutubeGatewayConfigurationException exception)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status503ServiceUnavailable,
            title: "Gateway is not configured",
            detail: exception.Message,
            extensions: new Dictionary<string, object?>
            {
                ["gate"] = "BLOCK",
                ["adapterId"] = "youtube.public-media.read",
                ["requestId"] = context.TraceIdentifier,
            });
    }
    catch (YoutubeGatewayNotFoundException exception)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status404NotFound,
            title: "Configured YouTube channel was not found",
            detail: exception.Message,
            extensions: new Dictionary<string, object?>
            {
                ["gate"] = "BLOCK",
                ["adapterId"] = "youtube.public-media.read",
                ["requestId"] = context.TraceIdentifier,
            });
    }
    catch (YoutubeGatewayUpstreamException exception)
    {
        return Results.Problem(
            statusCode: StatusCodes.Status502BadGateway,
            title: "YouTube upstream request failed",
            detail: exception.Message,
            extensions: new Dictionary<string, object?>
            {
                ["gate"] = "REVIEW",
                ["adapterId"] = "youtube.public-media.read",
                ["requestId"] = context.TraceIdentifier,
            });
    }
})
.RequireRateLimiting("youtube-read");

app.Run();
