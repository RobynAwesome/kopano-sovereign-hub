using System.Threading.RateLimiting;
using Kopano.Sovereign.Gateway.Governance;
using Kopano.Sovereign.Gateway.Youtube;
using Microsoft.AspNetCore.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

var configuredOrigins = builder.Configuration["KOPANO_ALLOWED_ORIGINS"];
var allowedOrigins = (string.IsNullOrWhiteSpace(configuredOrigins)
        ? new[]
        {
            "https://kopanolabs.com",
            "https://www.kopanolabs.com",
            "https://fivesarena.com",
            "https://www.fivesarena.com",
            "https://kasilink.com",
            "https://www.kasilink.com",
            "https://crisisconnect.kopanolabs.com",
            "https://starfallsalvage.kopanolabs.com",
            "https://krrababalela.com",
            "https://www.krrababalela.com",
        }
        : configuredOrigins.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

builder.Logging.AddFilter("System.Net.Http.HttpClient.YouTube", LogLevel.Warning);
builder.Logging.AddFilter("System.Net.Http.HttpClient.YouTubePublic", LogLevel.Warning);
builder.Services.AddMemoryCache();
builder.Services.AddCors(options =>
{
    options.AddPolicy("kopano-web", policy =>
    {
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod();
    });
});
builder.Services.AddHttpClient("YouTube", client =>
{
    client.BaseAddress = new Uri("https://www.googleapis.com/youtube/v3/");
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Kopano-Sovereign-Gateway/0.6");
});
builder.Services.AddHttpClient("YouTubePublic", client =>
{
    client.BaseAddress = new Uri("https://www.youtube.com/");
    client.Timeout = TimeSpan.FromSeconds(12);
    client.DefaultRequestHeaders.UserAgent.ParseAdd("Kopano-Sovereign-Gateway/0.6");
});
builder.Services.AddSingleton<YoutubeGatewayClient>();
builder.Services.AddSingleton<ExperimentRegistry>();
builder.Services.AddSingleton<PublicEvidenceParser>();
builder.Services.AddSingleton<RtcpRegistry>();
builder.Services.AddSingleton<ProgressiveUpdateRuntime>();

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
    options.AddFixedWindowLimiter("rtcp-route", limiter =>
    {
        limiter.PermitLimit = 60;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 8;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiter.AutoReplenishment = true;
    });
    options.AddFixedWindowLimiter("progressive-update", limiter =>
    {
        limiter.PermitLimit = 120;
        limiter.Window = TimeSpan.FromMinutes(1);
        limiter.QueueLimit = 16;
        limiter.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
        limiter.AutoReplenishment = true;
    });
});

var app = builder.Build();
app.UseCors("kopano-web");
app.UseRateLimiter();

app.MapGet("/health", (
    IConfiguration configuration,
    ExperimentRegistry experiments,
    RtcpRegistry rtcp,
    ProgressiveUpdateRuntime progressive) =>
{
    var hasApiKey = !string.IsNullOrWhiteSpace(configuration["YOUTUBE_API_KEY"]);
    return Results.Ok(new
    {
        status = "ok",
        service = "Kopano Sovereign Gateway",
        runtime = ".NET 10",
        adapters = new[]
        {
            "youtube.public-media.read",
            "kpgs.experiment-estate.read",
            "kpgs.public-evidence.parse",
            "kpgs.rtcp.read",
            "kpgs.rtcp.route",
            "kpgs.progressive-update.execute",
            "kpgs.swfus.distribution.read",
        },
        configured = true,
        upstreamMode = hasApiKey ? "youtube-data-api-v3" : "youtube-public-feed",
        credentialRequired = false,
        browserIngress = new
        {
            corsPolicy = "kopano-web",
            origins = allowedOrigins,
            credentials = false,
        },
        experimentRegistry = new
        {
            schema = experiments.Document.Schema,
            snapshotDate = experiments.Document.SnapshotDate,
            nodes = experiments.Document.Nodes.Count,
            constitutionalAuthority = experiments.Document.Authority.Constitutional,
            renterAssertion = experiments.Document.Laws.RenterAssertion,
        },
        rtcp = new
        {
            schema = rtcp.Document.Schema,
            snapshotDate = rtcp.Document.SnapshotDate,
            seats = rtcp.Document.Council.Count,
            domains = rtcp.Document.Domains.Count,
            constitutionalAuthority = rtcp.Document.Authority.Constitutional,
            executionMode = "GOVERNANCE_ROUTE_ONLY",
        },
        progressiveUpdates = new
        {
            schema = ProgressiveUpdateContract.UpdateSchema,
            receiptSchema = ProgressiveUpdateContract.ReceiptSchema,
            boundaryMarker = ProgressiveUpdateContract.BoundaryMarker,
            canonicalRepository = ProgressiveUpdateContract.CanonicalRepository,
            canonicalCommit = ProgressiveUpdateContract.CanonicalCommit,
            projectionDurability = progressive.ProjectionDurability,
            projectionNodes = progressive.ProjectionCount,
            distributionEvents = progressive.DistributionCount,
            constitutionalAuthority = false,
            transportGrantsAuthority = false,
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

app.MapGet("/api/governance/rtcp", (RtcpRegistry rtcp) => Results.Ok(new
{
    schema = rtcp.Document.Schema,
    snapshotDate = rtcp.Document.SnapshotDate,
    authority = rtcp.Document.Authority,
    laws = rtcp.Document.Laws,
    council = rtcp.Document.Council,
    domains = rtcp.Document.Domains,
    receipt = new
    {
        gate = "ALLOW",
        outcome = "read",
        adapterId = "kpgs.rtcp.read",
        constitutionalAuthority = rtcp.Document.Authority.Constitutional,
        runtimeAuthority = rtcp.Document.Authority.Runtime,
        truthBoundary = "The Hub projects the Round Table for runtime coordination; MAIN-BRAIN remains constitutional authority.",
    },
}));

app.MapPost("/api/rtcp/route", (RtcpRouteRequest request, RtcpRegistry rtcp) => Results.Ok(rtcp.Route(request)))
    .RequireRateLimiting("rtcp-route");

static IResult ExecuteProgressiveUpdate(
    ProgressiveUpdateRequest request,
    ProgressiveUpdateRuntime runtime) => Results.Ok(runtime.Execute(request));

// Canonical adapter path expected by estate PWAs.
app.MapPost("/kpgs/progressive-updates", ExecuteProgressiveUpdate)
    .RequireRateLimiting("progressive-update");

// API-prefixed alias keeps the Hub's existing route convention without creating
// a second contract. Both paths execute the exact same singleton runtime.
app.MapPost("/api/kpgs/progressive-updates", ExecuteProgressiveUpdate)
    .RequireRateLimiting("progressive-update");

app.MapGet("/api/kpgs/progressive-updates/status", (ProgressiveUpdateRuntime progressive) =>
    Results.Ok(new
    {
        schema = "kpgs.progressive-update-runtime.v1",
        canonicalContract = new
        {
            repository = ProgressiveUpdateContract.CanonicalRepository,
            commit = ProgressiveUpdateContract.CanonicalCommit,
            updateSchema = ProgressiveUpdateContract.UpdateSchema,
            receiptSchema = ProgressiveUpdateContract.ReceiptSchema,
            boundaryMarker = ProgressiveUpdateContract.BoundaryMarker,
        },
        projection = new
        {
            durability = progressive.ProjectionDurability,
            nodes = progressive.ProjectionCount,
            authoritative = false,
        },
        idempotency = new
        {
            durability = progressive.ProjectionDurability,
            keys = progressive.IdempotencyCount,
        },
        distribution = new
        {
            events = progressive.DistributionCount,
            authoritative = false,
            transportGrantsAuthority = false,
        },
        truthBoundary = "This adapter may mutate only process-local non-authoritative projections. Synchronization receipts do not grant canonical authority.",
    }));

app.MapGet("/api/kpgs/progressive-updates/distribution", (int? limit, ProgressiveUpdateRuntime progressive) =>
    Results.Ok(new
    {
        schema = "kpgs.swfus.distribution-feed.v1",
        canonical = false,
        authorityEffect = "none",
        transportGrantsAuthority = false,
        events = progressive.ReadDistribution(limit ?? 25),
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
