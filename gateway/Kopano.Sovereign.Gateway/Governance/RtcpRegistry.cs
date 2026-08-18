using System.Text.Json;

namespace Kopano.Sovereign.Gateway.Governance;

public sealed record RtcpAuthority(string Constitutional, string Runtime, string Rule);
public sealed record RtcpLaws(string RenterAssertion, string DecisionDefault, string Routing, string Identity, string DomainIsolation);
public sealed record RtcpSeat(int Seat, string Id, string Name, string Title, string Role, string Type, string Weight);
public sealed record RtcpDomain(string Id, string Label, string Host, string State, string Integration, IReadOnlyList<string> PrimaryCouncil, IReadOnlyList<string> IntentTerms);
public sealed record RtcpDocument(string Schema, string SnapshotDate, RtcpAuthority Authority, RtcpLaws Laws, IReadOnlyList<RtcpSeat> Council, IReadOnlyList<RtcpDomain> Domains);
public sealed record RtcpRouteRequest(string? Intent, string? Domain, string? RequestId);

public sealed class RtcpRegistry
{
    public const string RenterAssertion = "I_AM_STATELESS_RENTER_NOT_LANDLORD";
    private readonly RtcpDocument _document;

    public RtcpRegistry(IWebHostEnvironment environment)
    {
        var configured = Environment.GetEnvironmentVariable("KOPANO_RTCP_REGISTRY_PATH");
        var candidates = string.IsNullOrWhiteSpace(configured)
            ? new[]
            {
                Path.Combine(AppContext.BaseDirectory, "Governance", "rtcp.json"),
                Path.Combine(environment.ContentRootPath, "Governance", "rtcp.json"),
                Path.GetFullPath(Path.Combine(environment.ContentRootPath, "..", "..", "governance", "rtcp.json")),
            }
            : new[] { configured };

        var path = candidates.FirstOrDefault(File.Exists)
            ?? throw new FileNotFoundException($"RTCP registry was not found. Checked: {string.Join(" | ", candidates)}");

        _document = JsonSerializer.Deserialize<RtcpDocument>(File.ReadAllText(path), new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
        }) ?? throw new InvalidOperationException("RTCP registry could not be parsed.");

        if (!string.Equals(_document.Laws.RenterAssertion, RenterAssertion, StringComparison.Ordinal))
            throw new InvalidOperationException("RTCP registry failed the stateless renter contract.");
        if (_document.Council.Count != 10)
            throw new InvalidOperationException($"RTCP requires exactly 10 council seats; found {_document.Council.Count}.");
        if (_document.Council.Select(member => member.Seat).Distinct().Count() != 10)
            throw new InvalidOperationException("RTCP council seat numbers must be unique.");
        if (_document.Council.Select(member => member.Id).Distinct(StringComparer.OrdinalIgnoreCase).Count() != 10)
            throw new InvalidOperationException("RTCP council identities must be unique.");
    }

    public RtcpDocument Document => _document;

    public object Route(RtcpRouteRequest request)
    {
        var intent = (request.Intent ?? string.Empty).Trim();
        var requestedDomain = (request.Domain ?? string.Empty).Trim();
        var normalized = intent.ToLowerInvariant();

        var domain = !string.IsNullOrWhiteSpace(requestedDomain)
            ? _document.Domains.FirstOrDefault(item =>
                string.Equals(item.Id, requestedDomain, StringComparison.OrdinalIgnoreCase)
                || string.Equals(item.Host, requestedDomain, StringComparison.OrdinalIgnoreCase))
            : null;

        domain ??= _document.Domains
            .Select(item => new
            {
                Domain = item,
                Score = item.IntentTerms.Count(term => normalized.Contains(term, StringComparison.OrdinalIgnoreCase)),
            })
            .OrderByDescending(item => item.Score)
            .ThenBy(item => item.Domain.Id, StringComparer.Ordinal)
            .FirstOrDefault(item => item.Score > 0)?.Domain;

        domain ??= _document.Domains.First(item => item.Id == "kopanolabs");

        var seatIds = new HashSet<string>(domain.PrimaryCouncil, StringComparer.OrdinalIgnoreCase)
        {
            "kc",
            "khelos",
            "antigravity",
        };

        if (normalized.Contains("teach") || normalized.Contains("learn") || normalized.Contains("education")) seatIds.Add("cassey");
        if (normalized.Contains("build") || normalized.Contains("code") || normalized.Contains("architecture")) seatIds.Add("cassie");
        if (normalized.Contains("protocol") || normalized.Contains("research") || normalized.Contains("deep")) seatIds.Add("kessa");
        if (normalized.Contains("story") || normalized.Contains("culture") || normalized.Contains("anime")) seatIds.Add("yassie");
        if (normalized.Contains("strategy") || normalized.Contains("scale") || normalized.Contains("resource")) seatIds.Add("apex");
        if (normalized.Contains("safe") || normalized.Contains("guardian") || normalized.Contains("ethic")) seatIds.Add("thari");
        if (normalized.Contains("career") || normalized.Contains("personnel") || normalized.Contains("perimeter")) seatIds.Add("anchor");

        var selected = _document.Council.Where(member => seatIds.Contains(member.Id)).OrderBy(member => member.Seat).ToArray();
        var requestId = string.IsNullOrWhiteSpace(request.RequestId) ? Guid.NewGuid().ToString("N") : request.RequestId.Trim();

        return new
        {
            schema = "kopano.rtcp.route.v1",
            requestId,
            intent = string.IsNullOrWhiteSpace(intent) ? "explore Kopano ecosystem" : intent,
            domain = new
            {
                domain.Id,
                domain.Label,
                domain.Host,
                domain.State,
                domain.Integration,
            },
            council = selected.Select(member => new
            {
                member.Seat,
                member.Id,
                member.Name,
                member.Title,
                member.Role,
                member.Weight,
            }),
            execution = new
            {
                mode = "GOVERNANCE_ROUTE_ONLY",
                providerBinding = "UNBOUND",
                next = "Bind a verified provider/domain adapter before claiming model execution.",
            },
            receipt = new
            {
                gate = "ALLOW",
                outcome = "routed",
                adapterId = "kpgs.rtcp.route",
                constitutionalAuthority = _document.Authority.Constitutional,
                runtimeAuthority = _document.Authority.Runtime,
                truthBoundary = "RTCP routing selects governed identities and a domain lane. It does not imply a cloud model executed unless a provider receipt is attached.",
            },
        };
    }
}
