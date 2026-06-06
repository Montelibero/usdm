import { readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { normalizeHtmlToText } from '../scripts/extract-site-text.mjs';

function lineDifferenceRatio(a, b) {
  const before = a.trim().split('\n');
  const after = b.trim().split('\n');
  const afterCounts = new Map();
  for (const line of after) {
    afterCounts.set(line, (afterCounts.get(line) ?? 0) + 1);
  }

  let unchanged = 0;
  for (const line of before) {
    const count = afterCounts.get(line) ?? 0;
    if (count > 0) {
      unchanged += 1;
      afterCounts.set(line, count - 1);
    }
  }

  const changed = Math.max(before.length, after.length) - unchanged;
  return changed / Math.max(before.length, after.length, 1);
}

function stripFeatureSection(html, section) {
  return html.replace(
    new RegExp(`<section class="section" data-section="${section}">[\\s\\S]*?<\\/section>`, 'g'),
    '',
  );
}

test('static build contains the USDM reference page content', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');

  assert.match(html, /USDM/);
  assert.match(html, /Montelibero/);
  assert.match(html, /GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM/);
  assert.match(html, /assets\/app\.js/);
  assert.match(html, /site\.webmanifest/);
});

test('site uses the original USDM token icon asset and exposes a theme toggle', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const manifest = JSON.parse(
    await readFile(new URL('../public/site.webmanifest', import.meta.url), 'utf8'),
  );
  const css = await readFile(new URL('../public/assets/styles.css', import.meta.url), 'utf8');
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');
  const logo = await stat(new URL('../public/assets/usdm-logo.png', import.meta.url));

  assert.ok(logo.size > 0);
  assert.match(html, /assets\/usdm-logo\.png/);
  assert.doesNotMatch(html, /assets\/usdm-logo\.svg/);
  assert.match(html, /data-theme-toggle/);
  assert.match(css, /\[data-theme="dark"\]/);
  assert.match(css, /overflow-wrap:anywhere/);
  assert.match(script, /usdm-theme/);
  assert.match(script, /applyTheme/);
  assert.equal(manifest.icons[0].src, 'assets/usdm-logo.png');
  assert.equal(manifest.icons[0].type, 'image/png');
});

test('component refactor preserves site text and links within 10 percent', async () => {
  const baseline = await readFile(
    new URL('./fixtures/site-before-components.txt', import.meta.url),
    'utf8',
  );
  const currentHtml = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const current = normalizeHtmlToText(
    stripFeatureSection(stripFeatureSection(currentHtml, 'swap'), 'pools'),
  );
  const ratio = lineDifferenceRatio(baseline, current);

  assert.ok(
    ratio <= 0.1,
    `Normalized site text/link snapshot changed by ${(ratio * 100).toFixed(2)}%`,
  );
});

test('monitoring account snapshot is available for the monthly payouts block', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const snapshot = JSON.parse(
    await readFile(new URL('../public/data/monitoring-account.json', import.meta.url), 'utf8'),
  );

  assert.match(html, /data-section="monitoring"/);
  assert.match(html, /data-monitoring-table/);
  assert.doesNotMatch(html, />На 1000</);
  assert.doesNotMatch(html, />Per 1000</);
  assert.doesNotMatch(html, />Por 1000</);
  assert.match(html, />% годовых</);
  assert.match(html, />Annual %</);
  assert.equal(snapshot.account, 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON');
  assert.equal(snapshot.baseAmount, 1000);
  assert.ok(snapshot.monthly.length > 0);
  assert.ok(snapshot.totals.amount > 0);
  assert.ok(snapshot.payments.length >= snapshot.totals.payments);
});

test('large USDM liquidity pools snapshot is available and filtered by liquidity', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const packageJson = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  );
  const snapshot = JSON.parse(
    await readFile(new URL('../public/data/usdm-pools.json', import.meta.url), 'utf8'),
  );
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');

  assert.match(html, /data-section="pools"/);
  assert.match(html, /data-pools-table/);
  assert.match(html, /Крупные пулы ликвидности USDM/);
  assert.match(html, /Large USDM liquidity pools/);
  assert.match(html, /Pools grandes de liquidez USDM/);
  assert.equal(snapshot.thresholdUsd, 1000);
  assert.equal(snapshot.pools.length, 7);
  assert.ok(snapshot.pools.every((pool) => pool.estimatedUsd >= snapshot.thresholdUsd));
  assert.match(packageJson.scripts.build, /data:pools/);
  assert.match(script, /usdm-pools-cache/);
  assert.match(script, /POOL_CACHE_TTL_MS = 60\*60\*1000/);
  assert.match(script, /liquidity_pools\//);
  assert.ok(snapshot.pools.some((pool) => pool.pair === 'USDM/EURMTL'));
  assert.ok(snapshot.pools.some((pool) => pool.pair === 'GOLD/USDM'));
  assert.equal(
    snapshot.pools.some((pool) =>
      pool.id === 'cc8e282251f0f027c12ac5b599b2155e3381df1961ddde815c88abf2ff9e86da'
    ),
    false,
  );
});

test('USDM EURMTL swap quotes block is available', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');

  assert.match(html, /data-section="swap"/);
  assert.match(html, /data-swap-sell-table/);
  assert.match(html, /Свап-стакан USDM\/EURMTL/);
  assert.match(html, /USDM\/EURMTL swap quotes/);
  assert.match(html, /Cotizaciones swap USDM\/EURMTL/);
  assert.match(script, /paths\/strict-send/);
  assert.match(script, /GACKTN5DAZGWXRWB2WLM6OPBDHAMT6SJNGLJZPQMEZBUR4JUGBX2UK7V/);
});

test('browser swap quote helper calculates viewer-style average prices', async () => {
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');
  const context = {
    console,
    document: {
      addEventListener() {},
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      documentElement: {},
    },
    fetch() {
      throw new Error('network should not run in swap helper test');
    },
    history: { replaceState() {} },
    location: { hash: '' },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    navigator: { language: 'en' },
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.runInNewContext(script, context);

  const snapshot = context.__USDM_APP__.buildSwapSnapshot({
    orderBook: {
      bids: [{ price: '0.8114081' }],
      asks: [{ price: '0.845262' }],
    },
    sellQuotes: [
      { amount: 1, received: 0.8274075 },
      { amount: 10, received: 8.2721762 },
    ],
    buyQuotes: [
      { amount: 1, received: 1.206419 },
      { amount: 10, received: 12.0640661 },
    ],
    generatedAt: '2026-06-06T21:00:00Z',
  });

  assert.equal(snapshot.avgSwapPrice, 0.8281534561137134);
  assert.equal(snapshot.avgBookPrice, 0.82833505);
  assert.equal(snapshot.sellRows[0].price, 0.8274075);
  assert.equal(snapshot.buyRows[0].price, 0.8288994122274268);
});

test('USDM pools refresh script filters Horizon pools by estimated liquidity', async () => {
  const { buildPoolsSnapshot } = await import('../scripts/fetch-usdm-pools.mjs');
  const snapshot = buildPoolsSnapshot({
    generatedAt: '2026-06-06T20:00:00Z',
    horizonPools: [
      {
        id: 'large',
        total_shares: '10.0000000',
        reserves: [
          {
            asset: 'USDM:GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
            amount: '600.0000000',
          },
          { asset: 'native', amount: '1000.0000000' },
        ],
      },
      {
        id: 'small',
        total_shares: '1.0000000',
        reserves: [
          {
            asset: 'USDM:GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
            amount: '400.0000000',
          },
          { asset: 'native', amount: '700.0000000' },
        ],
      },
    ],
  });

  assert.equal(snapshot.pools.length, 1);
  assert.equal(snapshot.pools[0].id, 'large');
  assert.equal(snapshot.pools[0].pair, 'USDM/XLM');
  assert.equal(snapshot.pools[0].estimatedUsd, 1200);
  assert.equal(snapshot.pools[0].usdmReserve, 600);
});

test('faq urls are clickable links', async () => {
  const html = await readFile(new URL('../dist/index.html', import.meta.url), 'utf8');
  const faqBlocks = [...html.matchAll(/<div class="faq">([\s\S]*?)<\/div>/g)].map(
    (match) => match[1],
  );

  assert.equal(faqBlocks.length, 3);
  for (const block of faqBlocks) {
    assert.doesNotMatch(block, /<p>[^<]*https:\/\//);
  }
  assert.match(html, /<a href="https:\/\/eurmtl\.me\/asset\/USDM"/);
  assert.match(html, /<a href="https:\/\/t\.me\/mtl_helper_bot"/);
});

test('monitoring account merge preserves payments no longer returned by Horizon', async () => {
  const { buildMonitoringSnapshot } = await import('../scripts/fetch-monitoring-account.mjs');
  const oldPayment = {
    id: 'old-payment',
    createdAt: '2024-01-15T00:00:00Z',
    amount: 1.25,
    transactionHash: 'old-hash',
    from: 'GOLD',
    to: 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON',
  };
  const snapshot = buildMonitoringSnapshot({
    existing: { payments: [oldPayment] },
    account: {
      balances: [
        {
          balance: '1107.9497169',
          asset_code: 'USDM',
          asset_issuer: 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
        },
      ],
    },
    horizonPayments: [
      {
        id: 'new-payment',
        type: 'payment',
        created_at: '2026-06-06T02:04:11Z',
        asset_code: 'USDM',
        asset_issuer: 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
        from: 'GDAA7YDU6O7F27XUOSU27IHDDHE2XX7CRP427AA73VIJVZQ447E5UDIV',
        to: 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON',
        amount: '0.2096933',
        transaction_hash: 'new-hash',
      },
    ],
    generatedAt: '2026-06-06T20:00:00Z',
  });

  assert.deepEqual(snapshot.payments.map((payment) => payment.id), [
    'old-payment',
    'new-payment',
  ]);
  assert.equal(snapshot.monthly.length, 1);
  assert.equal(snapshot.monthly[0].month, '2024-01');
  assert.equal(snapshot.totals.payments, 1);
  assert.equal(snapshot.totals.amount, 1.25);
});

test('monitoring account summary excludes incomplete current month and annualizes percent', async () => {
  const { buildMonitoringSnapshot } = await import('../scripts/fetch-monitoring-account.mjs');
  const snapshot = buildMonitoringSnapshot({
    account: {
      balances: [
        {
          balance: '1107.9497169',
          asset_code: 'USDM',
          asset_issuer: 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
        },
      ],
    },
    horizonPayments: [
      {
        id: 'complete-month',
        type: 'payment',
        created_at: '2026-05-06T02:04:11Z',
        asset_code: 'USDM',
        asset_issuer: 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
        from: 'GDAA7YDU6O7F27XUOSU27IHDDHE2XX7CRP427AA73VIJVZQ447E5UDIV',
        to: 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON',
        amount: '10.0000000',
        transaction_hash: 'complete-hash',
      },
      {
        id: 'incomplete-month',
        type: 'payment',
        created_at: '2026-06-06T02:04:11Z',
        asset_code: 'USDM',
        asset_issuer: 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
        from: 'GDAA7YDU6O7F27XUOSU27IHDDHE2XX7CRP427AA73VIJVZQ447E5UDIV',
        to: 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON',
        amount: '20.0000000',
        transaction_hash: 'incomplete-hash',
      },
    ],
    generatedAt: '2026-06-06T20:00:00Z',
  });

  assert.deepEqual(snapshot.monthly.map((row) => row.month), ['2026-05']);
  assert.equal(snapshot.monthly[0].annualPercentOf1000, 12);
  assert.equal(snapshot.totals.amount, 10);
});

test('monitoring account merge deduplicates by transaction hash', async () => {
  const { buildMonitoringSnapshot } = await import('../scripts/fetch-monitoring-account.mjs');
  const snapshot = buildMonitoringSnapshot({
    existing: {
      payments: [
        {
          id: 'stellar-expert:same-hash',
          createdAt: '2025-05-04T12:52:18Z',
          amount: 6.908967,
          transactionHash: 'same-hash',
          from: 'GDAA7YDU6O7F27AA73VIJVZQ447E5UDIV',
          to: 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON',
        },
      ],
    },
    account: {
      balances: [
        {
          balance: '1107.9497169',
          asset_code: 'USDM',
          asset_issuer: 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
        },
      ],
    },
    horizonPayments: [
      {
        id: 'horizon-id',
        type: 'payment',
        created_at: '2025-05-04T12:52:18Z',
        asset_code: 'USDM',
        asset_issuer: 'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM',
        from: 'GDAA7YDU6O7F27AA73VIJVZQ447E5UDIV',
        to: 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON',
        amount: '6.9089670',
        transaction_hash: 'same-hash',
      },
    ],
  });

  assert.equal(snapshot.payments.length, 1);
  assert.equal(snapshot.totals.amount, 6.908967);
});

test('docker image serves the static build with Caddy on port 80', async () => {
  const dockerfile = await readFile(new URL('../Dockerfile', import.meta.url), 'utf8');
  const caddyfile = await readFile(new URL('../Caddyfile', import.meta.url), 'utf8');

  assert.match(dockerfile, /FROM node:/);
  assert.match(dockerfile, /FROM caddy:/);
  assert.match(dockerfile, /COPY --from=build \/app\/dist/);
  assert.match(dockerfile, /HEALTHCHECK/);
  assert.match(dockerfile, /\/healthz/);
  assert.match(caddyfile, /:80/);
  assert.match(caddyfile, /handle \/healthz/);
  assert.match(caddyfile, /respond "ok" 200/);
  assert.match(caddyfile, /log\s*\{/);
  assert.match(caddyfile, /output stdout/);
  assert.match(caddyfile, /file_server/);
});

test('github actions builds and publishes the docker image on push', async () => {
  const workflow = await readFile(
    new URL('../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );

  assert.match(workflow, /on:\s*\n\s*push:/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /packages:\s*write/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /docker\/login-action@/);
  assert.match(workflow, /registry:\s*ghcr\.io/);
  assert.match(workflow, /docker\/build-push-action@/);
  assert.match(workflow, /push:\s*\$\{\{ github\.event_name == 'push' \}\}/);
  assert.match(workflow, /ghcr\.io\/montelibero\/usdm/);
});

test('browser metrics formatter handles StellarExpert metric records', async () => {
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');
  const context = {
    console,
    document: {
      addEventListener() {},
      querySelector() {
        return null;
      },
      querySelectorAll() {
        return [];
      },
      documentElement: {},
    },
    fetch() {
      throw new Error('network should not run in formatter test');
    },
    history: { replaceState() {} },
    location: { hash: '' },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    navigator: { language: 'en' },
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;

  vm.runInNewContext(script, context);

  assert.equal(context.__USDM_APP__.formatTrustlines([2552, 2552, 360]), '2,552 / 360');
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.__USDM_APP__.buildMetrics({
      record: {
        supply: '2600672270965',
        payments: 80692,
        trades: 1141248,
        trustlines: [2552, 2552, 360],
        rating: { average: 7.3 },
        created: 1684600306,
      },
      supply: 260067.2270965,
      rating: { rating: { average: 7.3 } },
      orderBook: { asks: [{ price: '0.9937724' }] },
      now: new Date('2026-06-06T19:46:39Z'),
    }))),
    {
      supply: '260,067.23',
      trustlines: '2,552 / 360',
      payments: '80,692',
      trades: '1,141,248',
      rating: '7.3',
      first: '2023-05-20 16:31 UTC',
      price: '0.9938 USDC',
      updated: '2026-06-06 19:46 UTC',
    },
  );
});

test('browser liquidity pool renderer paints verified pool rows', async () => {
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');
  const state = { html: '', count: '', total: '' };
  const table = {
    dataset: { empty: 'No pools' },
    set innerHTML(value) {
      state.html = value;
    },
  };
  const section = {
    querySelector(selector) {
      if (selector === '[data-pools-table]') return table;
      if (selector === '[data-pools-count]') return { set textContent(value) { state.count = value; } };
      if (selector === '[data-pools-total]') return { set textContent(value) { state.total = value; } };
      if (selector === '[data-pools-updated]') return { textContent: '' };
      return null;
    },
    querySelectorAll() {
      return [];
    },
  };
  const context = {
    console,
    document: {
      addEventListener() {},
      querySelector() {
        return null;
      },
      querySelectorAll(selector) {
        return selector === '[data-pools]' ? [section] : [];
      },
      documentElement: {},
    },
    fetch() {
      throw new Error('network should not run in pool renderer test');
    },
    history: { replaceState() {} },
    location: { hash: '' },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    navigator: { language: 'en' },
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.runInNewContext(script, context);

  context.__USDM_APP__.renderPools({
    pools: [
      {
        id: '3f82380ac929dfb12081d0e04ec099823e296d83c34e473fd2f7aa59111e8728',
        pair: 'USDM/EURMTL',
        usdmReserve: 39071.8838619,
        estimatedUsd: 78143.7677238,
        shares: 35176.3138341,
        reserves: [
          { code: 'USDM', amount: 39071.8838619 },
          { code: 'EURMTL', amount: 32426.4777018 },
        ],
      },
    ],
  });

  assert.match(state.html, /3f82…8728/);
  assert.match(state.html, /USDM\/EURMTL/);
  assert.match(state.html, /78,143\.77/);
  assert.equal(state.count, '1');
  assert.equal(state.total, '$78,143.77');
});

test('browser theme helper applies and persists the selected theme', async () => {
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');
  const store = {};
  const root = { dataset: {}, style: {} };
  const icon = { textContent: '' };
  const button = {
    attrs: {},
    setAttribute(name, value) {
      this.attrs[name] = value;
    },
    querySelector(selector) {
      return selector === '[data-theme-toggle-icon]' ? icon : null;
    },
  };
  const context = {
    console,
    document: {
      addEventListener() {},
      querySelector() {
        return null;
      },
      querySelectorAll(selector) {
        return selector === '[data-theme-toggle]' ? [button] : [];
      },
      documentElement: root,
    },
    fetch() {
      throw new Error('network should not run in theme test');
    },
    history: { replaceState() {} },
    location: { hash: '' },
    localStorage: {
      getItem(key) {
        return store[key] ?? null;
      },
      setItem(key, value) {
        store[key] = value;
      },
    },
    navigator: { language: 'en' },
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.runInNewContext(script, context);

  context.__USDM_APP__.applyTheme('dark', { persist: true });

  assert.equal(root.dataset.theme, 'dark');
  assert.equal(root.style.colorScheme, 'dark');
  assert.equal(store['usdm-theme'], 'dark');
  assert.equal(button.attrs['aria-pressed'], 'true');
  assert.equal(icon.textContent, '☀');
});

test('monitoring table renders only the latest 10 months until expanded', async () => {
  const script = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');
  const state = { rows: [], button: null };
  const table = {
    dataset: { empty: 'No data' },
    set innerHTML(value) {
      state.rows = [...value.matchAll(/<tr>/g)];
    },
  };
  const section = {
    querySelector(selector) {
      if (selector === '[data-monitoring-table]') return table;
      if (selector === '[data-monitoring-toggle]') {
        state.button ??= {
          hidden: true,
          textContent: '',
          onclick: null,
          addEventListener(_event, handler) {
            this.onclick = handler;
          },
        };
        return state.button;
      }
      return {
        href: '',
        textContent: '',
      };
    },
    querySelectorAll() {
      return [];
    },
  };
  const context = {
    console,
    document: {
      addEventListener() {},
      querySelector() {
        return null;
      },
      querySelectorAll(selector) {
        return selector === '[data-monitoring]' ? [section] : [];
      },
      documentElement: {},
    },
    fetch() {
      throw new Error('network should not run in renderer test');
    },
    history: { replaceState() {} },
    location: { hash: '' },
    localStorage: {
      getItem() {
        return null;
      },
      setItem() {},
    },
    navigator: { language: 'en' },
    setTimeout,
    clearTimeout,
  };
  context.globalThis = context;
  vm.runInNewContext(script, context);

  context.__USDM_APP__.renderMonitoring({
    account: 'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON',
    accountUrl: 'https://example.test',
    currentBalance: 100,
    totals: { amount: 42 },
    monthly: Array.from({ length: 12 }, (_, index) => ({
      month: `2025-${String(index + 1).padStart(2, '0')}`,
      payments: 1,
      amount: 1,
      per1000: 1,
      annualPercentOf1000: 1.2,
    })),
  });

  assert.equal(state.rows.length, 10);
  assert.equal(state.button.hidden, false);
  assert.equal(state.button.textContent, 'Show all');

  state.button.onclick();

  assert.equal(state.rows.length, 12);
  assert.equal(state.button.textContent, 'Show latest 10');
});
