interface ApiRequest {
  method?: string;
  body?: unknown;
}

interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): ApiResponse;
  end(): ApiResponse;
}

type CanonicalReceipt = Record<string, unknown> & {
  receipt_id: string;
};

// In-memory continuity remains POC-only; durable receipt storage is a separate backend concern.
let latestCanonicalReceipt: CanonicalReceipt | null = null;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCanonicalReceipt(value: unknown): value is CanonicalReceipt {
  return (
    isRecord(value) &&
    typeof value.receipt_id === 'string' &&
    value.receipt_id.trim().length > 0
  );
}

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method === 'POST') {
    const receipt = req.body;

    if (!isCanonicalReceipt(receipt)) {
      return res.status(400).json({ error: 'Invalid GovernanceReceipt payload' });
    }

    console.log(`[SOVEREIGN HUB] Received Canonical Receipt: ${receipt.receipt_id}`);

    // POC continuity only. Do not treat this process-local value as durable evidence.
    latestCanonicalReceipt = receipt;

    return res.status(200).json({
      success: true,
      message: 'Receipt ingested by Sovereign Hub',
      persistence: 'process_local',
    });
  }

  if (req.method === 'GET') {
    if (!latestCanonicalReceipt) {
      return res.status(204).end();
    }
    return res.status(200).json(latestCanonicalReceipt);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
