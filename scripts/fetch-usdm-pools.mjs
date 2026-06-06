import { readFile, writeFile } from 'node:fs/promises';

const HORIZON = 'https://horizon.stellar.org';
const OUTPUT_URL = new URL('../public/data/usdm-pools.json', import.meta.url);
const USDM_ISSUER = 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM';
const THRESHOLD_USD = 1000;

const POOL_IDS = [
  '3f82380ac929dfb12081d0e04ec099823e296d83c34e473fd2f7aa59111e8728',
  '49a48dd6aa8b247a553a07acd2957efa85fc0233a40af5bb75cf5d27624d42d9',
  'a9a81f0eea80cfd8e5026e2c777f7a851822750aa544ae2ae7145d1cbfd08f0e',
  'ed01a8172b515a12ebe6f969e82a9f481d6e30bb379b3b3d4b41e0ef2a3d2ae0',
  'a71b735d4243dacf8749061a035c6f3d8db7eaa83f513f4c54acc24d0ae0496b',
  '37bfcae59fc8c2df3ce8fd1b0fe9742f024aea6a12486961678d31d7a81d7b32',
  'af9aa1db45df267bd6207fc273a9cb04eb1d480cbc8fd191bec58ff09793afbd',
  'cc8e282251f0f027c12ac5b599b2155e3381df1961ddde815c88abf2ff9e86da',
  '6731f57d13b48a9c7cbb65b55c9646b7265265491eb602960407b398c2c2a84b',
  '857e0bf39c6e8aa775df78af7c861b205d7a43701093e129b7fa91b44325f3c7',
  'cb94e169a644b1eedc7c7c2af8194632f6be9d4c2a8042678512b9bf8459eb2c',
  'a9d2e09fce4db02024f867a71640eea49eb2c86d1b0fb089efcddd4b99e0d381',
  '3d83ee426407a574cee6448af33e1334292e4f45519b61405a615af405ace826',
];

function parseAsset(asset) {
  if (asset === 'native') return { code: 'XLM', issuer: '' };
  const [code, issuer = ''] = String(asset).split(':');
  return { code, issuer };
}

function normalizePool(pool) {
  const reserves = pool.reserves.map((reserve) => ({
    ...parseAsset(reserve.asset),
    amount: Number(reserve.amount),
  }));
  const usdm = reserves.find((reserve) => reserve.code === 'USDM' && reserve.issuer === USDM_ISSUER);
  const usdmReserve = usdm?.amount ?? 0;
  const estimatedUsd = usdmReserve * 2;

  return {
    id: pool.id,
    pair: reserves.map((reserve) => reserve.code).join('/'),
    reserves: reserves.map(({ code, amount }) => ({ code, amount })),
    usdmReserve,
    estimatedUsd,
    shares: Number(pool.total_shares),
  };
}

export function buildPoolsSnapshot({
  horizonPools,
  generatedAt = new Date().toISOString(),
  thresholdUsd = THRESHOLD_USD,
}) {
  const pools = horizonPools
    .map(normalizePool)
    .filter((pool) => pool.estimatedUsd >= thresholdUsd)
    .sort((a, b) => b.estimatedUsd - a.estimatedUsd);

  return {
    generatedAt,
    source: 'https://horizon.stellar.org/liquidity_pools/{pool_id}',
    thresholdUsd,
    estimateMethod: 'For USDM pools, estimated USD liquidity is calculated as 2 * USDM reserve.',
    poolIds: POOL_IDS,
    pools,
  };
}

async function fetchPool(id) {
  const response = await fetch(`${HORIZON}/liquidity_pools/${id}`, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`${id}: ${response.status} ${response.statusText}`);
  return response.json();
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await readFile(OUTPUT_URL, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const results = await Promise.allSettled(POOL_IDS.map(fetchPool));
  const horizonPools = results
    .filter((result) => result.status === 'fulfilled')
    .map((result) => result.value);

  if (horizonPools.length === 0) {
    const existing = await readExistingSnapshot();
    if (existing) {
      console.warn('Could not refresh USDM pools from Horizon; keeping existing snapshot.');
      return;
    }
    throw new Error('Could not fetch any USDM liquidity pools from Horizon.');
  }

  const snapshot = buildPoolsSnapshot({ horizonPools });
  await writeFile(OUTPUT_URL, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Saved ${snapshot.pools.length} USDM liquidity pools to public/data/usdm-pools.json`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
