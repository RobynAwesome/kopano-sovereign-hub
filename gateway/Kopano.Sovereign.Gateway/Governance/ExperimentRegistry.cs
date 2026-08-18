using System.Text.Json;

namespace Kopano.Sovereign.Gateway.Governance;

public sealed record ExperimentAuthority(
    string Constitutional,
    string Runtime,
    string PublicEvidence,
    string RepoNamespace);

public sealed record ExperimentLaws(
    string RenterAssertion,
    string ClaimDefault,
    string RealityIndex,
    string Promotion,
    string Convergence);

public sealed record ExperimentLifecycle(
    string Source,
    IReadOnlyList<string> Phases,
    string Note);

public sealed record ExperimentNode(
    string Id,
    string Name,
    string Lane,
    string? Lifecycle,
    string State,
    string? Repo,
    string? PublicSurface,
    string? DeclaredDomain,
    string Backing,
    string Description);

public sealed record ExperimentRegistryDocument(
    string Schema,
    string SnapshotDate,
    ExperimentAuthority Authority,
    ExperimentLaws Laws,
    ExperimentLifecycle LegacyLifecycle,
    IReadOnlyList<ExperimentNode> Nodes);

public sealed class ExperimentRegistry
{
    public const string RenterAssertion = "I_AM_STATELESS_RENTER_NOT_LANDLORD";
    private readonly ExperimentRegistryDocument _document;

    public ExperimentRegistry(IWebHostEnvironment environment)
    {
        var configured = Environment.GetEnvironmentVariable("KOPANO_EXPERIMENT_REGISTRY_PATH");
        var path = string.IsNullOrWhiteSpace(configured)
            ? Path.Combine(environment.ContentRootPath, "Governance", "experiments.json")
            : configured;

        if (!File.Exists(path))
            throw new FileNotFoundException("Governed experiment registry was not found.", path);

        var json = File.ReadAllText(path);
        _document = JsonSerializer.Deserialize<ExperimentRegistryDocument>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? throw new InvalidOperationException("Governed experiment registry could not be parsed.");

        if (!string.Equals(_document.Laws.RenterAssertion, RenterAssertion, StringComparison.Ordinal))
            throw new InvalidOperationException("Experiment registry failed the stateless renter contract.");

        var duplicateIds = _document.Nodes
            .GroupBy(node => node.Id, StringComparer.OrdinalIgnoreCase)
            .Where(group => group.Count() > 1)
            .Select(group => group.Key)
            .ToArray();

        if (duplicateIds.Length > 0)
            throw new InvalidOperationException($"Duplicate experiment ids: {string.Join(", ", duplicateIds)}");
    }

    public ExperimentRegistryDocument Document => _document;

    public ExperimentNode? Find(string id) => _document.Nodes.FirstOrDefault(node =>
        string.Equals(node.Id, id, StringComparison.OrdinalIgnoreCase));
}
