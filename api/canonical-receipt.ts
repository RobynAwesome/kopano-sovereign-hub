import { NextApiRequest, NextApiResponse } from 'next';

// In-memory store for the hackathon POC to pass data to the UI
let latestCanonicalReceipt: any = null;

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'POST') {
    // 1. Receive the canonical receipt from LEFA's SovereignHubBridge
    const receipt = req.body;
    
    if (!receipt || !receipt.receipt_id) {
      return res.status(400).json({ error: 'Invalid GovernanceReceipt payload' });
    }

    console.log(`[SOVEREIGN HUB] Received Canonical Receipt: ${receipt.receipt_id}`);
    console.log(`[SOVEREIGN HUB] Execution Jurisdiction: ${receipt.execution_jurisdiction}`);
    console.log(`[SOVEREIGN HUB] Proof Depth: ${receipt.proof_depth}`);

    // 2. Persist to active state
    latestCanonicalReceipt = receipt;

    // 3. (In a real implementation, this would trigger a Pub/Sub event to Vercel clients)
    
    return res.status(200).json({ success: true, message: 'Receipt ingested by Sovereign Hub' });
  } 
  
  if (req.method === 'GET') {
    // 1. Allow The Face (Stitch UI) to poll the latest receipt
    if (!latestCanonicalReceipt) {
      return res.status(204).end();
    }
    return res.status(200).json(latestCanonicalReceipt);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
