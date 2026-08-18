namespace Kopano.Sovereign.Gateway.Governance;

public sealed record PublicEvidenceItem(
    string Id,
    string Name,
    string Area,
    string State,
    string Summary,
    string? Href);

public sealed record PublicEvidenceSummary(
    string Schema,
    string Headline,
    string Intro,
    string PrimaryAction,
    string PrimaryActionHref,
    IReadOnlyList<PublicEvidenceItem> Items,
    PublicEvidenceTechnical Technical);

public sealed record PublicEvidenceTechnical(
    string Source,
    string Runtime,
    string Rule,
    string DetailsHref);

public sealed class PublicEvidenceParser
{
    private static readonly IReadOnlyDictionary<string, string> FriendlyStates = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["VALIDATED_LIVE"] = "Live",
        ["VALIDATED_FIELD"] = "In the field",
        ["DELIVERED_EXTERNAL"] = "Delivered",
        ["GOVERNED_EXTERNAL"] = "Supporting system",
        ["LIVE"] = "Live",
        ["FIELD"] = "In the field",
        ["BUILD"] = "In build",
        ["POC"] = "Prototype",
        ["REWORK"] = "Improving",
        ["TARGET"] = "Exploring",
        ["PUBLIC"] = "Public",
    };

    private static readonly IReadOnlyDictionary<string, string> FriendlyAreas = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["client-operational-system"] = "Venue operations",
        ["client-field-validation"] = "Agriculture",
        ["client-delivery-validation"] = "Local business",
        ["client-editorial-organ"] = "Community media",
        ["cyber-physical-engineering"] = "Engineering",
        ["field-intelligence"] = "Field technology",
        ["opportunity-network"] = "Opportunity access",
        ["education-experiment"] = "Education",
        ["education-entrepreneurship"] = "Entrepreneurship",
    };

    private static readonly IReadOnlyDictionary<string, string> FriendlyNames = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["bookit-fivesarena"] = "Five's Arena × Hellenic FC",
        ["freddy-nw-alfalfa"] = "North West lucerne farm",
        ["flow-inc-ink"] = "Flow Inc Ink",
    };

    private static readonly IReadOnlyDictionary<string, string> FriendlySummaries = new Dictionary<string, string>(StringComparer.Ordinal)
    {
        ["bookit-fivesarena"] = "Booking, competitions and venue workflows operating in a real Cape Town football environment.",
        ["freddy-nw-alfalfa"] = "Decision support for frost, irrigation, crop regrowth, livestock and water security on a working farm.",
        ["flow-inc-ink"] = "Completed digital delivery for an operating tattoo and piercing business in Midrand.",
    };

    private static readonly string[] PrimaryStates =
    [
        "VALIDATED_LIVE",
        "VALIDATED_FIELD",
        "DELIVERED_EXTERNAL",
    ];

    public PublicEvidenceSummary Parse(ExperimentRegistryDocument registry)
    {
        var items = registry.Nodes
            .Where(node => node.Relation == "validation-input" && PrimaryStates.Contains(node.State, StringComparer.Ordinal))
            .OrderBy(node => Priority(node.State))
            .ThenBy(node => node.Name, StringComparer.OrdinalIgnoreCase)
            .Select(ToPublicItem)
            .ToArray();

        return new PublicEvidenceSummary(
            "kopano.public-evidence.v1",
            "Built in real environments.",
            "We test our systems with real operators, real constraints and real work — not only inside demos.",
            "Explore our work",
            "https://kopanolabs.com/content/",
            items,
            new PublicEvidenceTechnical(
                registry.Authority.Constitutional,
                registry.Authority.Runtime,
                "Detailed governance stays behind the interface. Public claims remain bounded by receipts.",
                "https://kopanolabs.com/proof/"));
    }

    private static PublicEvidenceItem ToPublicItem(ExperimentNode node)
    {
        var name = FriendlyNames.TryGetValue(node.Id, out var friendlyName) ? friendlyName : node.Name;
        var summary = FriendlySummaries.TryGetValue(node.Id, out var friendlySummary) ? friendlySummary : FirstSentence(node.Description);
        var state = FriendlyStates.TryGetValue(node.State, out var friendlyState) ? friendlyState : Humanize(node.State);
        var area = FriendlyAreas.TryGetValue(node.Lane, out var friendlyArea) ? friendlyArea : Humanize(node.Lane);

        return new PublicEvidenceItem(
            node.Id,
            name,
            area,
            state,
            summary,
            node.PublicSurface ?? node.Repo);
    }

    private static string FirstSentence(string value)
    {
        var trimmed = value.Trim();
        var index = trimmed.IndexOf('.');
        if (index < 0) return trimmed;
        return trimmed[..(index + 1)];
    }

    private static string Humanize(string value)
    {
        var normalized = value.Replace('_', ' ').Replace('-', ' ').ToLowerInvariant();
        return string.Join(' ', normalized.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Select(word => char.ToUpperInvariant(word[0]) + word[1..]));
    }

    private static int Priority(string state) => state switch
    {
        "VALIDATED_LIVE" => 0,
        "VALIDATED_FIELD" => 1,
        "DELIVERED_EXTERNAL" => 2,
        _ => 99,
    };
}
