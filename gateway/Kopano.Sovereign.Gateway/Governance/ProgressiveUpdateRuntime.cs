using System.Collections.Concurrent;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Kopano.Sovereign.Gateway.Governance;

public static class ProgressiveUpdateContract
{
    public const string UpdateSchema = "kpgs.progressive-update.v1";
    public const string ReceiptSchema = "kpgs.swfus.receipt.v1";
    public const string BoundaryMarker = "#NB";
    public const string CanonicalRepository = "RobynAwesome/Introduction-to-MCP";
    public const string CanonicalCommit = "6eeb285d0775a7e74ceadc06e32b4068fcfbc595";

    public static readonly string[] StageOrder =
    [
        "TELEMETRY",
        "CLASSIFICATION",
        "ROUTING",
        "PROTOCOL_SELECTION",
        "INVARIANT_AUDIT",
        "POC_FOC_CHECK",
        "STATE_UPDATE",
        "DISTRIBUTION",
    ];

    public static readonly HashSet<string> Operations =
        new(StringComparer.Ordinal) { "CREATE", "READ", "UPDATE", "DELETE" };

    public static readonly HashSet<string> StateClasses =
        new(StringComparer.Ordinal)
        {
            "non_authoritative",
            "derived_projection",
            "pending_proposal",
        };

    public static readonly HashSet<string> ApuStatuses =
        new(StringComparer.Ordinal) { "GREEN", "YELLOW", "RED", "UNSPECIFIED" };
}

public sealed class ProgressiveUpdateRequest
{
    [JsonPropertyName("schema")]
    public string Schema { get; init; } = string.Empty;

    [JsonPropertyName("update_id")]
    public string UpdateId { get; init; } = string.Empty;

    [JsonPropertyName("node_id")]
    public string NodeId { get; init; } = string.Empty;

    [JsonPropertyName("operation")]
    public string Operation { get; init; } = string.Empty;

    [JsonPropertyName("lane")]
    public string Lane { get; init; } = string.Empty;

    [JsonPropertyName("context_route")]
    public string ContextRoute { get; init; } = string.Empty;

    [JsonPropertyName("protocol")]
    public string Protocol { get; init; } = string.Empty;

    [JsonPropertyName("idempotency_key")]
    public string IdempotencyKey { get; init; } = string.Empty;

    [JsonPropertyName("value")]
    public JsonElement Value { get; init; }

    [JsonPropertyName("apu_status")]
    public string ApuStatus { get; init; } = "UNSPECIFIED";

    [JsonPropertyName("poc_validated")]
    public bool PocValidated { get; init; }

    [JsonPropertyName("foc_detected")]
    public bool FocDetected { get; init; }

    [JsonPropertyName("invariant_passed")]
    public bool InvariantPassed { get; init; } = true;

    [JsonPropertyName("authority_effect")]
    public string AuthorityEffect { get; init; } = "none";

    [JsonPropertyName("state_class")]
    public string StateClass { get; init; } = "non_authoritative";

    [JsonPropertyName("evidence_refs")]
    public string[] EvidenceRefs { get; init; } = [];

    [JsonPropertyName("correlation_id")]
    public string CorrelationId { get; init; } = string.Empty;

    [JsonPropertyName("source")]
    public string Source { get; init; } = string.Empty;

    [JsonPropertyName("expected_version")]
    public int? ExpectedVersion { get; init; }

    [JsonPropertyName("boundary_marker")]
    public string BoundaryMarker { get; init; } = string.Empty;
}

public sealed record ProgressiveStageReceipt(
    [property: JsonPropertyName("stage")] string Stage,
    [property: JsonPropertyName("status")] string Status,
    [property: JsonPropertyName("reason")] string Reason);

public sealed record SwfusReceipt
{
    [JsonPropertyName("schema")]
    public string Schema { get; init; } = ProgressiveUpdateContract.ReceiptSchema;

    [JsonPropertyName("receipt_id")]
    public required string ReceiptId { get; init; }

    [JsonPropertyName("update_id")]
    public required string UpdateId { get; init; }

    [JsonPropertyName("node_id")]
    public required string NodeId { get; init; }

    [JsonPropertyName("operation")]
    public required string Operation { get; init; }

    [JsonPropertyName("disposition")]
    public required string Disposition { get; init; }

    [JsonPropertyName("stages")]
    public required IReadOnlyList<ProgressiveStageReceipt> Stages { get; init; }

    [JsonPropertyName("synchronized")]
    public bool Synchronized { get; init; }

    [JsonPropertyName("canonical_authority_changed")]
    public bool CanonicalAuthorityChanged { get; init; }

    [JsonPropertyName("state_digest")]
    public string? StateDigest { get; init; }

    [JsonPropertyName("evidence_refs")]
    public required IReadOnlyList<string> EvidenceRefs { get; init; }

    [JsonPropertyName("correlation_id")]
    public required string CorrelationId { get; init; }

    [JsonPropertyName("boundary_marker")]
    public required string BoundaryMarker { get; init; }

    [JsonPropertyName("replayed")]
    public bool Replayed { get; init; }

    [JsonPropertyName("created_at")]
    public required string CreatedAt { get; init; }
}

public sealed record ProgressiveDistributionEvent
{
    [JsonPropertyName("schema")]
    public string Schema { get; init; } = "kpgs.swfus.distribution.v1";

    [JsonPropertyName("update_id")]
    public required string UpdateId { get; init; }

    [JsonPropertyName("node_id")]
    public required string NodeId { get; init; }

    [JsonPropertyName("operation")]
    public required string Operation { get; init; }

    [JsonPropertyName("canonical")]
    public bool Canonical { get; init; }

    [JsonPropertyName("authority_effect")]
    public string AuthorityEffect { get; init; } = "none";

    [JsonPropertyName("transport_grants_authority")]
    public bool TransportGrantsAuthority { get; init; }

    [JsonPropertyName("state_digest")]
    public string? StateDigest { get; init; }

    [JsonPropertyName("evidence_refs")]
    public required IReadOnlyList<string> EvidenceRefs { get; init; }

    [JsonPropertyName("correlation_id")]
    public required string CorrelationId { get; init; }

    [JsonPropertyName("boundary_marker")]
    public string BoundaryMarker { get; init; } = ProgressiveUpdateContract.BoundaryMarker;

    [JsonPropertyName("created_at")]
    public required string CreatedAt { get; init; }
}

internal sealed record ProjectionRecord(
    JsonElement Value,
    int Version,
    string Lane,
    string StateClass,
    string UpdateId,
    string UpdatedAt);

internal sealed record IdempotencyRecord(string UpdateDigest, SwfusReceipt Receipt);

/// <summary>
/// Canonical .NET adapter for Introduction-to-MCP's Progressive Update contract.
///
/// This runtime owns only a volatile, non-authoritative projection and an in-process
/// SWFUS distribution journal. Neither survives process destruction and neither can
/// become constitutional/business truth. The purpose is to give existing PWAs a
/// rigid .NET ingress that preserves the canonical stage law while a durable event
/// plane remains a separate governed concern.
/// </summary>
public sealed class ProgressiveUpdateRuntime
{
    private readonly object _gate = new();
    private readonly Dictionary<string, ProjectionRecord> _projection =
        new(StringComparer.Ordinal);
    private readonly Dictionary<string, IdempotencyRecord> _idempotency =
        new(StringComparer.Ordinal);
    private readonly ConcurrentQueue<ProgressiveDistributionEvent> _distribution = new();

    public string ProjectionDurability => "process-local-non-authoritative";
    public int ProjectionCount
    {
        get { lock (_gate) return _projection.Count; }
    }

    public int IdempotencyCount
    {
        get { lock (_gate) return _idempotency.Count; }
    }

    public int DistributionCount => _distribution.Count;

    public IReadOnlyList<ProgressiveDistributionEvent> ReadDistribution(int limit = 25)
    {
        var bounded = Math.Clamp(limit, 1, 100);
        return _distribution.Reverse().Take(bounded).Reverse().ToArray();
    }

    public SwfusReceipt Execute(ProgressiveUpdateRequest request)
    {
        ArgumentNullException.ThrowIfNull(request);

        lock (_gate)
        {
            return ExecuteLocked(request);
        }
    }

    private SwfusReceipt ExecuteLocked(ProgressiveUpdateRequest request)
    {
        var operation = NormalizeUpper(request.Operation);
        var apuStatus = NormalizeUpper(request.ApuStatus);
        var updateDigest = ComputeUpdateDigest(request, operation, apuStatus);
        var stages = new List<ProgressiveStageReceipt>(ProgressiveUpdateContract.StageOrder.Length);

        // 1. TELEMETRY
        if (!NonEmpty(request.UpdateId) || !NonEmpty(request.NodeId))
        {
            Add(stages, "TELEMETRY", "REJECT", "update_id and node_id are required");
            return FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages);
        }

        if (!ProgressiveUpdateContract.Operations.Contains(operation))
        {
            Add(stages, "TELEMETRY", "REJECT", "unsupported CRUD operation");
            return FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages);
        }

        if (!NonEmpty(request.IdempotencyKey))
        {
            Add(stages, "TELEMETRY", "REJECT", "idempotency_key is required");
            return FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages);
        }

        if (_idempotency.TryGetValue(request.IdempotencyKey, out var prior))
        {
            if (string.Equals(prior.UpdateDigest, updateDigest, StringComparison.Ordinal))
            {
                return prior.Receipt with { Replayed = true };
            }

            Add(stages, "TELEMETRY", "REJECT", "idempotency key collision");
            return FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages);
        }

        Add(stages, "TELEMETRY", "PASS", "update identity accepted");

        if (!string.Equals(request.Schema, ProgressiveUpdateContract.UpdateSchema, StringComparison.Ordinal))
        {
            Add(stages, "CLASSIFICATION", "REJECT", "schema must be kpgs.progressive-update.v1");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }

        // 2. CLASSIFICATION
        if (!NonEmpty(request.Lane))
        {
            Add(stages, "CLASSIFICATION", "REJECT", "lane classification is required");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }

        if (!ProgressiveUpdateContract.StateClasses.Contains(request.StateClass))
        {
            Add(stages, "CLASSIFICATION", "REJECT", "authoritative state classes are not admitted");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }

        if (!ProgressiveUpdateContract.ApuStatuses.Contains(apuStatus))
        {
            Add(stages, "CLASSIFICATION", "REJECT", "invalid APU status");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }

        Add(stages, "CLASSIFICATION", "PASS", $"lane={request.Lane}; apu={apuStatus}");

        // 3. ROUTING
        if (!NonEmpty(request.ContextRoute))
        {
            Add(stages, "ROUTING", "REJECT", "context_route is required");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }
        Add(stages, "ROUTING", "PASS", $"route={request.ContextRoute}");

        // READ cannot mutate or distribute.
        if (operation == "READ")
        {
            Add(stages, "PROTOCOL_SELECTION", "SKIP", "read requires no mutation protocol");
            Add(stages, "INVARIANT_AUDIT", "SKIP", "observation is not mutation");
            Add(stages, "POC_FOC_CHECK", "SKIP", "read cannot promote state");
            _projection.TryGetValue(request.NodeId, out var observed);
            Add(stages, "STATE_UPDATE", "OBSERVE", "projection read only");
            Add(stages, "DISTRIBUTION", "SKIP", "reads are not synchronized mutations");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "OBSERVED", stages,
                    stateRecord: observed));
        }

        // 4. PROTOCOL SELECTION
        if (!NonEmpty(request.Protocol))
        {
            Add(stages, "PROTOCOL_SELECTION", "REJECT", "mutation protocol is required");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }
        Add(stages, "PROTOCOL_SELECTION", "PASS", $"protocol={request.Protocol}");

        // 5. INVARIANT AUDIT
        var invariantFailures = new List<string>();
        if (!string.Equals(request.AuthorityEffect, "none", StringComparison.Ordinal))
            invariantFailures.Add("authority_effect must remain none");
        if (!request.InvariantPassed)
            invariantFailures.Add("caller-declared invariant audit failed");
        if (!string.Equals(request.BoundaryMarker, ProgressiveUpdateContract.BoundaryMarker,
                StringComparison.Ordinal))
            invariantFailures.Add("#NB boundary marker is required");
        if (request.ExpectedVersion is < 0)
            invariantFailures.Add("expected_version cannot be negative");

        if (invariantFailures.Count > 0)
        {
            Add(stages, "INVARIANT_AUDIT", "REJECT", string.Join("; ", invariantFailures));
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }
        Add(stages, "INVARIANT_AUDIT", "PASS", "authority and update invariants preserved");

        // 6. POC / FOC CHECK
        if (apuStatus == "RED" || request.FocDetected)
        {
            Add(stages, "POC_FOC_CHECK", "REJECT", "FOC/RED update cannot mutate or distribute");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages));
        }

        if (apuStatus == "YELLOW")
        {
            Add(stages, "POC_FOC_CHECK", "HOLD", "APU YELLOW requires review before mutation");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "HELD", stages));
        }

        if (!request.PocValidated || request.EvidenceRefs.Length == 0 ||
            request.EvidenceRefs.Any(reference => !NonEmpty(reference)))
        {
            Add(stages, "POC_FOC_CHECK", "HOLD",
                "mutation requires POC validation and non-empty evidence refs");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "HELD", stages));
        }
        Add(stages, "POC_FOC_CHECK", "PASS", "POC admitted; no FOC signal detected");

        // 7. STATE UPDATE — bounded to the volatile non-authoritative projection.
        _projection.TryGetValue(request.NodeId, out var before);
        if (operation == "CREATE" && before is not null)
        {
            Add(stages, "STATE_UPDATE", "HOLD", "CREATE target already exists");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "HELD", stages, stateRecord: before));
        }

        if ((operation == "UPDATE" || operation == "DELETE") && before is null)
        {
            Add(stages, "STATE_UPDATE", "HOLD", $"{operation} target does not exist");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "HELD", stages));
        }

        if (before is not null && request.ExpectedVersion is not null &&
            before.Version != request.ExpectedVersion.Value)
        {
            Add(stages, "STATE_UPDATE", "HOLD",
                $"stale expected_version={request.ExpectedVersion.Value}; current={before.Version}");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "HELD", stages, stateRecord: before));
        }

        ProjectionRecord? after;
        if (operation == "DELETE")
        {
            _projection.Remove(request.NodeId);
            after = null;
            Add(stages, "STATE_UPDATE", "APPLY", "bounded projection deleted");
        }
        else
        {
            var nextVersion = before is null ? 1 : before.Version + 1;
            after = new ProjectionRecord(
                CloneValue(request.Value),
                nextVersion,
                request.Lane,
                request.StateClass,
                request.UpdateId,
                DateTimeOffset.UtcNow.ToString("O"));
            _projection[request.NodeId] = after;
            Add(stages, "STATE_UPDATE", "APPLY", $"bounded projection version={nextVersion}");
        }

        var stateDigest = ComputeStateDigest(after);

        // 8. DISTRIBUTION — in-process SWFUS journal only. This is synchronization
        // evidence, never canonical authority or durable business-state storage.
        try
        {
            _distribution.Enqueue(new ProgressiveDistributionEvent
            {
                UpdateId = request.UpdateId,
                NodeId = request.NodeId,
                Operation = operation,
                Canonical = false,
                AuthorityEffect = "none",
                TransportGrantsAuthority = false,
                StateDigest = stateDigest,
                EvidenceRefs = request.EvidenceRefs.ToArray(),
                CorrelationId = request.CorrelationId ?? string.Empty,
                CreatedAt = DateTimeOffset.UtcNow.ToString("O"),
            });
            Add(stages, "DISTRIBUTION", "PASS",
                "SWFUS event admitted to process-local non-authoritative journal");
        }
        catch
        {
            // Roll back projection so an adapter cannot claim applied state when
            // distribution failed.
            if (before is null)
                _projection.Remove(request.NodeId);
            else
                _projection[request.NodeId] = before;

            Add(stages, "DISTRIBUTION", "REJECT",
                "distribution failed; bounded projection rolled back");
            return Remember(request, updateDigest,
                FinalizeReceipt(request, operation, updateDigest, "REJECTED", stages,
                    stateRecord: before));
        }

        return Remember(request, updateDigest,
            FinalizeReceipt(request, operation, updateDigest, "APPLIED", stages,
                synchronized: true, stateRecord: after));
    }

    private SwfusReceipt Remember(
        ProgressiveUpdateRequest request,
        string updateDigest,
        SwfusReceipt receipt)
    {
        if (NonEmpty(request.IdempotencyKey))
            _idempotency[request.IdempotencyKey] = new IdempotencyRecord(updateDigest, receipt);
        return receipt;
    }

    private static SwfusReceipt FinalizeReceipt(
        ProgressiveUpdateRequest request,
        string operation,
        string updateDigest,
        string disposition,
        List<ProgressiveStageReceipt> stages,
        bool synchronized = false,
        ProjectionRecord? stateRecord = null)
    {
        FillRemainingStages(stages);
        var stateDigest = ComputeStateDigest(stateRecord);
        var receiptSeed = $"swfus-vnext:{updateDigest}:{disposition}:{stateDigest ?? "none"}";
        var receiptId = "swfus_" + Sha256(receiptSeed)[..24];

        return new SwfusReceipt
        {
            ReceiptId = receiptId,
            UpdateId = request.UpdateId ?? string.Empty,
            NodeId = request.NodeId ?? string.Empty,
            Operation = operation,
            Disposition = disposition,
            Stages = stages.ToArray(),
            Synchronized = synchronized,
            CanonicalAuthorityChanged = false,
            StateDigest = stateDigest,
            EvidenceRefs = request.EvidenceRefs?.ToArray() ?? [],
            CorrelationId = request.CorrelationId ?? string.Empty,
            BoundaryMarker = request.BoundaryMarker ?? string.Empty,
            Replayed = false,
            CreatedAt = DateTimeOffset.UtcNow.ToString("O"),
        };
    }

    private static void FillRemainingStages(List<ProgressiveStageReceipt> stages)
    {
        var seen = stages.Select(stage => stage.Stage).ToHashSet(StringComparer.Ordinal);
        foreach (var stage in ProgressiveUpdateContract.StageOrder)
        {
            if (!seen.Contains(stage))
            {
                stages.Add(new ProgressiveStageReceipt(
                    stage,
                    "NOT_REACHED",
                    "prior governance gate stopped progression"));
            }
        }
    }

    private static void Add(
        ICollection<ProgressiveStageReceipt> stages,
        string stage,
        string status,
        string reason) => stages.Add(new ProgressiveStageReceipt(stage, status, reason));

    private static bool NonEmpty(string? value) => !string.IsNullOrWhiteSpace(value);

    private static string NormalizeUpper(string? value) =>
        (value ?? string.Empty).Trim().ToUpperInvariant();

    private static JsonElement CloneValue(JsonElement value)
    {
        if (value.ValueKind == JsonValueKind.Undefined)
        {
            using var nullDoc = JsonDocument.Parse("null");
            return nullDoc.RootElement.Clone();
        }
        return value.Clone();
    }

    private static string ComputeUpdateDigest(
        ProgressiveUpdateRequest request,
        string operation,
        string apuStatus)
    {
        var parts = new[]
        {
            request.Schema ?? string.Empty,
            request.UpdateId ?? string.Empty,
            request.NodeId ?? string.Empty,
            operation,
            request.Lane ?? string.Empty,
            request.ContextRoute ?? string.Empty,
            request.Protocol ?? string.Empty,
            request.IdempotencyKey ?? string.Empty,
            CanonicalJson(request.Value),
            apuStatus,
            request.PocValidated.ToString(),
            request.FocDetected.ToString(),
            request.InvariantPassed.ToString(),
            request.AuthorityEffect ?? string.Empty,
            request.StateClass ?? string.Empty,
            string.Join("\u001e", request.EvidenceRefs ?? []),
            request.CorrelationId ?? string.Empty,
            request.Source ?? string.Empty,
            request.ExpectedVersion?.ToString() ?? "null",
            request.BoundaryMarker ?? string.Empty,
        };
        return Sha256(string.Join("\u001f", parts));
    }

    private static string? ComputeStateDigest(ProjectionRecord? record)
    {
        if (record is null) return null;
        var payload = string.Join("\u001f",
            CanonicalJson(record.Value),
            record.Version.ToString(),
            record.Lane,
            record.StateClass,
            record.UpdateId,
            record.UpdatedAt);
        return Sha256(payload);
    }

    private static string CanonicalJson(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Undefined) return "null";
        using var stream = new MemoryStream();
        using (var writer = new Utf8JsonWriter(stream))
        {
            WriteCanonical(writer, element);
        }
        return Encoding.UTF8.GetString(stream.ToArray());
    }

    private static void WriteCanonical(Utf8JsonWriter writer, JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var property in element.EnumerateObject().OrderBy(p => p.Name, StringComparer.Ordinal))
                {
                    writer.WritePropertyName(property.Name);
                    WriteCanonical(writer, property.Value);
                }
                writer.WriteEndObject();
                break;
            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray()) WriteCanonical(writer, item);
                writer.WriteEndArray();
                break;
            case JsonValueKind.String:
                writer.WriteStringValue(element.GetString());
                break;
            case JsonValueKind.Number:
                writer.WriteRawValue(element.GetRawText(), skipInputValidation: false);
                break;
            case JsonValueKind.True:
                writer.WriteBooleanValue(true);
                break;
            case JsonValueKind.False:
                writer.WriteBooleanValue(false);
                break;
            case JsonValueKind.Null:
            case JsonValueKind.Undefined:
                writer.WriteNullValue();
                break;
            default:
                throw new InvalidOperationException($"Unsupported JSON value kind: {element.ValueKind}");
        }
    }

    private static string Sha256(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();
}
