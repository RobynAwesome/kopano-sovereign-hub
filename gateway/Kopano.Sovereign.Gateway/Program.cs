using System.Threading.RateLimiting;
using Kopano.Sovereign.Gateway.Governance;
using Kopano.Sovereign.Gateway.Youtube;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.AddFilter("System.Net.Http.HttpClient.YouTube", LogLevel.Warning);
builder.Logging.AddFilter("System.Net.Http.HttpClient.YouTubePublic", LogLevel.Warning);
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient("YouTube", client =>
{
    client.BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/");
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Kopano-Sovereign-Gateway/0.3");
});
builder.Services.AddHttpClient("YouTubePublic", client =>
{
    client.BaseAddress = new Uri("https://www.youtube.com/");
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Kopano-Sovereign-Gateway/0.3");
});
builder.Services.AddSingleton<YoutubeGatewayClient>();
builder.Services.AddSingleton<ExperimentRegistry>();
builder.Services.AddSingleton<PublicEvidenceParser>();

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

app.MapGet("/health", (IConfiguration configuration, ExperimentRegistry experiments) =>
{
    var hasApiKey = !string.IsNullOrWhiteSpace(configuration["YOUTUBE_API_KEY"]);
    return Results.Ok(new
    {
        status = "ok",
        service = "Kopano Sovereign Gateway",
        runtime = ".NET 10",
        adapters = new[] { "youtube.public-media.read", "kpgs.experiment-estate.read", "kpgs.public-evidence.parse" },
        configured = true,
        upstreamMode = hasApiKey ? "youtube-data-api-v3" : "youtube-public-feed",
        credentialRequired = false,
        experimentRegistry = new
        {
            schema = experiments.Document.Schema,
            snapshotDate = experiments.Document.SnapshotDate,
            nodes = experiments.Document.Nodes.Count,
            constitutionalAuthority = experiments.Document.Authority.Constitutional,
            renterAssertion = experiments.Document.Laws.RenterAssertion,
        },
    });
});

app.MapGet("/api/governance/experiments", (ExperimentRegistry experiments) => Results.Ok(new
{
    schema = experiments.Document.Schema,
    snapshotDate = experiments.Document.SnapshotDate,
    authority = experiments.Document.Authority,
    laws = experiments.Document.Laws,
    lifecycle = experiments.Document.LegacyLifecycle,
    nodes = experiments.Document.Nodes,
    receipt = new
    {
        gate = "ALLOW",
        outcome = "read",
        adapterId = "kpgs.experiment-estate.read",
        constitutionalAuthority = experiments.Document.Authority.Constitutional,
        runtimeAuthority = experiments.Document.Authority.Runtime,
        truthBoundary = "The Sovereign Hub is a runtime projection. Introduction-to-MCP / MAIN-BRAIN remains constitutional source authority.",
    },
}));

app.MapGet("/api/public/evidence", (ExperimentRegistry experiments, PublicEvidenceParser parser) =>
{
    var summary = parser.Parse(experiments.Document);
    return Results.Ok(new
    {
        summary.Schema,
        summary.Headline,
        summary.Intro,
        summary.PrimaryAction,
        summary.PrimaryActionHref,
        summary.Items,
        summary.Technical,
        receipt = new
        {
            gate = "ALLOW",
            outcome = "parsed",
            adapterId = "kpgs.public-evidence.parse",
            sourceSchema = experiments.Document.Schema,
            sourceSnapshot = experiments.Document.SnapshotDate,
            truthBoundary = "The parser reduces governance detail for public usability; it does not promote or invent claims."
        }
    });
});

app.MapGet("/api/governance/experiments/{id}", (string id, ExperimentRegistry experiments) =>
{
    var node = experiments.Find(id);
    return node is null
        ? Results.NotFound(new
        {
            gate = "MAYBE",
            id,
            nextVerification = "Bind the node to the governed experiment registry before claiming runtime membership.",
        })
        : Results.Ok(new
        {
            node,
            receipt = new
            {
                gate = "ALLOW",
                outcome = "read",
                adapterId = "kpgs.experiment-estate.read",
                constitutionalAuthority = experiments.Document.Authority.Constitutional,
            },
        });
});

app.MapGet("/api/youtube/uploads", async (
    int? limit,
    string? requestId,
    HttpContext context,
    YoutubeGatewayClient gateway,
    CancellationToken cancellationToken) =>
{
    var boundedLimit = Math.Clamp(limit ?? 6, 1, 12);
    var headerRequestId = context.Request.Headers["X-Kopano-Request-Id"].FirstOrDefault();
    var effectiveRequestId = !string.IsNullOrWhiteSpace(requestId)
        ? requestId.Trim()
        : !string.IsNullOrWhiteSpace(headerRequestId)
            ? headerRequestId.Trim()
            : context.TraceIdentifier;

    try
    {
        var result = await gateway.GetUploadsAsync(boundedLimit, effectiveRequestId, cancellationToken);
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
                ["requestId"] = effectiveRequestId,
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
                ["requestId"] = effectiveRequestId,
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
                ["requestId"] = effectiveRequestId,
            });
    }
})
.RequireRateLimiting("youtube-read");

app.Run();
