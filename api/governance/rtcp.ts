import { rtcpPublicDocument } from '../../transport/rtcp';

const headers = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type, x-kopano-request-id',
  'cache-control': 'public, max-age=60, s-maxage=300',
};

export default {
  async fetch(request: Request) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'GET') return Response.json({ gate: 'BLOCK', reason: 'METHOD_NOT_ALLOWED' }, { status: 405, headers });
    return Response.json(rtcpPublicDocument, { status: 200, headers });
  },
};
