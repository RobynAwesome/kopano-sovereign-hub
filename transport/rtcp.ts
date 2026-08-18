import rtcpJson from '../governance/rtcp.json';

type RtcpSeat = {
  seat: number;
  id: string;
  name: string;
  title: string;
  role: string;
  type: string;
  weight: string;
};

type RtcpDomain = {
  id: string;
  label: string;
  host: string;
  state: string;
  integration: 'ADAPT_EXISTING';
  primaryCouncil: string[];
  intentTerms: string[];
};

type RtcpDocument = {
  schema: 'kopano.rtcp.runtime.v1';
  snapshotDate: string;
  authority: { constitutional: string; runtime: string; rule: string };
  laws: {
    renterAssertion: string;
    decisionDefault: string;
    routing: string;
    identity: string;
    domainIsolation: string;
  };
  publicProjection: {
    consumer: string;
    policy: string;
    presentationMayTransform: boolean;
    claimsMayTransform: boolean;
    providerInternals: string;
    rule: string;
  };
  council: RtcpSeat[];
  domains: RtcpDomain[];
};

export type RtcpRouteRequest = {
  intent?: string;
  domain?: string;
  requestId?: string;
};

const document = rtcpJson as RtcpDocument;
const canonicalCouncilOrder = ['KC', 'CASSEY', 'CASSIE', 'KESSA', 'YASSIE', 'APEX', 'THARI', 'KHELOS', 'ANCHOR', 'ANTIGRAVITY'];

function assertRuntimeContract() {
  if (document.schema !== 'kopano.rtcp.runtime.v1') throw new Error(`Unsupported RTCP schema: ${document.schema}`);
  if (document.laws.renterAssertion !== 'I_AM_STATELESS_RENTER_NOT_LANDLORD') throw new Error('RTCP renter boundary drift');
  if (document.publicProjection.consumer !== 'https://github.com/RobynAwesome/Kopano-Labs-Website') throw new Error('RTCP public consumer drift');
  if (document.publicProjection.claimsMayTransform !== false) throw new Error('RTCP public projection cannot transform claims');
  if (document.council.length !== 10) throw new Error(`RTCP requires 10 seats; found ${document.council.length}`);
  if (document.council.map((seat) => seat.name).join('|') !== canonicalCouncilOrder.join('|')) throw new Error('RTCP council order drift');
  if (new Set(document.council.map((seat) => seat.id)).size !== 10) throw new Error('RTCP council identities must be unique');
  if (document.domains.some((domain) => domain.integration !== 'ADAPT_EXISTING')) throw new Error('RTCP transport cannot serve rebuild semantics');
  if (document.domains.some((domain) => /kopanocontext\.kopanolabs\.com/i.test(domain.host))) throw new Error('Dormant Kopano Context host leaked into RTCP transport');
}

assertRuntimeContract();

const seatById = new Map(document.council.map((seat) => [seat.id, seat]));

export const rtcpPublicDocument = {
  schema: document.schema,
  snapshotDate: document.snapshotDate,
  authority: document.authority,
  laws: document.laws,
  publicProjection: document.publicProjection,
  council: document.council,
  domains: document.domains,
  receipt: {
    gate: 'ALLOW',
    outcome: 'read',
    adapterId: 'kpgs.rtcp.vercel.read',
    constitutionalAuthority: document.authority.constitutional,
    runtimeAuthority: document.authority.runtime,
    truthBoundary: 'This Vercel Function is a public transport adapter over the governed Hub RTCP document. It does not become constitutional authority.',
  },
} as const;

function includesAny(value: string, terms: readonly string[]) {
  return terms.some((term) => value.includes(term));
}

export function routeRtcpIntent(input: RtcpRouteRequest) {
  const intent = (input.intent ?? '').trim();
  const requestedDomain = (input.domain ?? '').trim().toLowerCase();
  const normalized = intent.toLowerCase();

  let domain = requestedDomain
    ? document.domains.find((candidate) => candidate.id.toLowerCase() === requestedDomain || candidate.host.toLowerCase() === requestedDomain)
    : undefined;

  if (!domain) {
    const ranked = document.domains
      .map((candidate) => ({ candidate, score: candidate.intentTerms.filter((term) => normalized.includes(term.toLowerCase())).length }))
      .sort((left, right) => right.score - left.score || left.candidate.id.localeCompare(right.candidate.id));
    domain = ranked[0]?.score ? ranked[0].candidate : undefined;
  }

  domain ??= document.domains.find((candidate) => candidate.id === 'kopanolabs') ?? document.domains[0];

  const seatIds = new Set(domain.primaryCouncil);
  seatIds.add('kc');
  seatIds.add('khelos');
  seatIds.add('antigravity');

  if (includesAny(normalized, ['teach', 'learn', 'education'])) seatIds.add('cassey');
  if (includesAny(normalized, ['build', 'code', 'architecture'])) seatIds.add('cassie');
  if (includesAny(normalized, ['protocol', 'research', 'deep'])) seatIds.add('kessa');
  if (includesAny(normalized, ['story', 'culture', 'anime'])) seatIds.add('yassie');
  if (includesAny(normalized, ['strategy', 'scale', 'resource'])) seatIds.add('apex');
  if (includesAny(normalized, ['safe', 'guardian', 'ethic'])) seatIds.add('thari');
  if (includesAny(normalized, ['career', 'personnel', 'perimeter'])) seatIds.add('anchor');

  const council = [...seatIds]
    .map((id) => seatById.get(id))
    .filter((seat): seat is RtcpSeat => Boolean(seat))
    .sort((left, right) => left.seat - right.seat)
    .map(({ seat, id, name, title, role, weight }) => ({ seat, id, name, title, role, weight }));

  return {
    schema: 'kopano.rtcp.route.v1',
    requestId: input.requestId?.trim() || crypto.randomUUID(),
    intent: intent || 'explore Kopano ecosystem',
    domain: {
      id: domain.id,
      label: domain.label,
      host: domain.host,
      state: domain.state,
      integration: domain.integration,
    },
    council,
    execution: {
      mode: 'GOVERNANCE_ROUTE_ONLY',
      providerBinding: 'UNBOUND',
      next: 'Bind a verified provider/domain adapter before claiming model execution.',
    },
    receipt: {
      gate: 'ALLOW',
      outcome: 'routed',
      adapterId: 'kpgs.rtcp.vercel.route',
      constitutionalAuthority: document.authority.constitutional,
      runtimeAuthority: document.authority.runtime,
      truthBoundary: 'RTCP routing selected governed identities and a domain lane. No Azure, Hugging Face or model execution is claimed without a separate provider receipt.',
    },
  } as const;
}

export const rtcpTransportHealth = {
  schema: 'kopano.rtcp.transport-health.v1',
  status: 'ok',
  seats: document.council.length,
  domains: document.domains.length,
  executionMode: 'GOVERNANCE_ROUTE_ONLY',
  source: 'governance/rtcp.json',
} as const;
