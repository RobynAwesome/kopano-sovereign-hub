import { routeRtcpIntent, type RtcpRouteRequest } from '../../transport/rtcp';

const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-kopano-request-id',
  'cache-control': 'no-store',
};

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return Response.json({ gate: 'BLOCK', reason: 'METHOD_NOT_ALLOWED' }, { status: 405, headers });

    const contentLength = Number(request.headers.get('content-length') ?? '0');
    if (contentLength > 4096) return Response.json({ gate: 'BLOCK', reason: 'REQUEST_TOO_LARGE' }, { status: 413, headers });

    let input: RtcpRouteRequest;
    try {
      const text = await request.text();
      if (text.length > 4096) return Response.json({ gate: 'BLOCK', reason: 'REQUEST_TOO_LARGE' }, { status: 413, headers });
      input = text ? JSON.parse(text) as RtcpRouteRequest : {};
    } catch {
      return Response.json({ gate: 'BLOCK', reason: 'INVALID_JSON' }, { status: 400, headers });
    }

    if (typeof input.intent !== 'undefined' && typeof input.intent !== 'string') {
      return Response.json({ gate: 'BLOCK', reason: 'INVALID_INTENT' }, { status: 400, headers });
    }
    if (typeof input.domain !== 'undefined' && typeof input.domain !== 'string') {
      return Response.json({ gate: 'BLOCK', reason: 'INVALID_DOMAIN' }, { status: 400, headers });
    }

    const requestId = request.headers.get('x-kopano-request-id')?.trim();
    return Response.json(routeRtcpIntent({ ...input, requestId: input.requestId || requestId }), { status: 200, headers });
  },
};
