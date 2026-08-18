import { rtcpTransportHealth } from '../transport/rtcp';

const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'cache-control': 'no-store',
};

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return Response.json({ gate: 'BLOCK', reason: 'METHOD_NOT_ALLOWED' }, { status: 405, headers });
    return Response.json({
      ...rtcpTransportHealth,
      service: 'Kopano Sovereign Hub · Vercel Transport',
      receipt: {
        gate: 'ALLOW',
        adapterId: 'kpgs.rtcp.vercel.health',
        truthBoundary: 'This endpoint proves the public Vercel transport is alive. It does not prove an external model provider is bound.',
      },
    }, { status: 200, headers });
  },
};
