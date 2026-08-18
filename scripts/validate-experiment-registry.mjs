import fs from 'node:fs';

const path = new URL('../governance/experiments.json', import.meta.url);
const registry = JSON.parse(fs.readFileSync(path, 'utf8'));
const failures = [];

const fail = (message) => failures.push(message);

if (registry.schema !== 'kopano.sovereign.experiment-estate.v1') fail('unexpected registry schema');
if (registry.laws?.renterAssertion !== 'I_AM_STATELESS_RENTER_NOT_LANDLORD') fail('stateless renter assertion missing');
if (!registry.authority?.constitutional?.includes('Introduction-to-MCP')) fail('MAIN-BRAIN constitutional authority missing');
if (registry.authority?.repoNamespace !== 'https://github.com/RobynAwesome') fail('RobynAwesome must remain canonical owned-repo namespace');
if (registry.laws?.realityIndex !== 'REALITY_STATE > INDEX_STATE') fail('Reality > Index law missing');

const ids = new Set();
for (const node of registry.nodes ?? []) {
  if (!node.id || !node.name || !node.lane || !node.state) fail(`node missing required fields: ${JSON.stringify(node)}`);
  if (ids.has(node.id)) fail(`duplicate node id: ${node.id}`);
  ids.add(node.id);

  if (node.repo && !node.repo.startsWith('https://github.com/RobynAwesome/')) {
    fail(`${node.id}: owned repo escaped RobynAwesome namespace`);
  }

  if (['VALIDATED_LIVE', 'VALIDATED_FIELD', 'DELIVERED_EXTERNAL'].includes(node.state) && !node.publicSurface) {
    fail(`${node.id}: promoted external validation state requires an inspectable public/evidence surface`);
  }
}

const byId = Object.fromEntries((registry.nodes ?? []).map((node) => [node.id, node]));
const lifecycleLocks = {
  'kopano-context': 'PLANT',
  'crisis-connect': 'PLANT',
  kasilink: 'WATER',
  'fivesarena-blog': 'WATER',
  portfolio: 'PRUNE',
  'starfall-salvage': 'PRUNE',
  'harvest-4-all': 'HARVEST',
  'bookit-fivesarena': 'HARVEST',
};

for (const [id, phase] of Object.entries(lifecycleLocks)) {
  if (byId[id]?.lifecycle !== phase) fail(`${id}: MAIN-BRAIN lifecycle must remain ${phase}`);
}

if (byId['cape-campass']?.state !== 'TARGET') fail('Cape Campass must remain TARGET until a current binding/backing receipt exists');
if (byId['cape-campass']?.repo !== null) fail('Cape Campass repo must remain unbound until a repository receipt exists');
if (byId['starfall-salvage']?.state !== 'REWORK') fail('Starfall Salvage public state must preserve REWORK boundary');
if (byId['cars4mars']?.state !== 'BUILD') fail('Cars4Mars must preserve BUILD rather than physical-validation claim');

if (failures.length) {
  console.error('KPGS experiment registry: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`KPGS experiment registry: PASS · ${registry.nodes.length} governed nodes`);
