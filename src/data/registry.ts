export type SovereignSurface = {
  id: string;
  name: string;
  owner: 'Kopano Labs' | 'AMA-PHU Entertainment' | 'External';
  kind: 'game' | 'story' | 'anime' | 'music' | 'service' | 'integration';
  description: string;
  mode: 'local-first' | 'web' | 'gateway';
  trust: 'first-party' | 'governed' | 'external';
  status: 'live' | 'prototype' | 'planned';
  accent: string;
};

export const sovereignSurfaces: SovereignSurface[] = [
  {
    id: 'jennifer',
    name: 'Project: JENNIFER',
    owner: 'AMA-PHU Entertainment',
    kind: 'game',
    description: 'Interactive game-world surface and laboratory for governed AI behaviour.',
    mode: 'local-first',
    trust: 'first-party',
    status: 'prototype',
    accent: '#ff4fd8',
  },
  {
    id: 'protocol-13',
    name: 'Protocol 13',
    owner: 'AMA-PHU Entertainment',
    kind: 'story',
    description: 'Manga distribution lane and canonical narrative source.',
    mode: 'web',
    trust: 'first-party',
    status: 'prototype',
    accent: '#ff9f43',
  },
  {
    id: 'project-y',
    name: 'Project Y',
    owner: 'AMA-PHU Entertainment',
    kind: 'anime',
    description: 'Anime adaptation lane governed against the same story canon.',
    mode: 'web',
    trust: 'first-party',
    status: 'planned',
    accent: '#8f7cff',
  },
  {
    id: 'starfall',
    name: 'Starfall Salvage',
    owner: 'Kopano Labs',
    kind: 'game',
    description: 'Playable sovereign simulation surface exposed through a declared adapter.',
    mode: 'web',
    trust: 'governed',
    status: 'live',
    accent: '#45d6ff',
  },
  {
    id: 'music',
    name: 'AMA-PHU Music',
    owner: 'AMA-PHU Entertainment',
    kind: 'music',
    description: 'Music releases, playlists and direct-to-audience distribution.',
    mode: 'web',
    trust: 'first-party',
    status: 'planned',
    accent: '#7bf59b',
  },
  {
    id: 'service-delivery',
    name: 'Service Delivery Lane',
    owner: 'Kopano Labs',
    kind: 'service',
    description: 'Future governed interface for public information, skills and opportunity delivery.',
    mode: 'gateway',
    trust: 'governed',
    status: 'planned',
    accent: '#ffe66d',
  },
];

export const integrationCandidates: SovereignSurface[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    owner: 'External',
    kind: 'integration',
    description: 'Media discovery through supported web surfaces and APIs.',
    mode: 'gateway',
    trust: 'external',
    status: 'planned',
    accent: '#ff4b4b',
  },
  {
    id: 'spotify',
    name: 'Spotify',
    owner: 'External',
    kind: 'integration',
    description: 'Music integration through OAuth and supported platform APIs.',
    mode: 'gateway',
    trust: 'external',
    status: 'planned',
    accent: '#1ed760',
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    owner: 'External',
    kind: 'integration',
    description: 'Productivity and cloud capabilities behind explicit user consent and gateway policy.',
    mode: 'gateway',
    trust: 'external',
    status: 'planned',
    accent: '#4da3ff',
  },
  {
    id: 'google',
    name: 'Google',
    owner: 'External',
    kind: 'integration',
    description: 'Search, identity and productivity adapters without uncontrolled browser embedding.',
    mode: 'gateway',
    trust: 'external',
    status: 'planned',
    accent: '#fbbc05',
  },
];
