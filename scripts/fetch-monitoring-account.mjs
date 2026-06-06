import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ACCOUNT =
  'GCLQ6TKOOJW33ABVG5D5KKJBZANSDW46BCXTSQ3TKLRYFPAVFZENUMON';
const ISSUER =
  'GDHDC4GBNPMENZAOBB4NCQ25TGZPDRK6ZGWUGSI22TVFATOLRPSUUSDM';
const ASSET_CODE = 'USDM';
const HORIZON = 'https://horizon.stellar.org';
const OUTPUT = new URL('../public/data/monitoring-account.json', import.meta.url);
const BASE_AMOUNT = 1000;

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}: ${url}`);
  }
  return res.json();
}

async function fetchAllPayments() {
  const records = [];
  let url = `${HORIZON}/accounts/${ACCOUNT}/payments?limit=200&order=asc`;

  while (url) {
    const page = await fetchJson(url);
    const pageRecords = page._embedded?.records ?? [];
    records.push(...pageRecords);

    const nextUrl = page._links?.next?.href;
    if (!nextUrl || pageRecords.length === 0) break;
    url = nextUrl;
  }

  return records;
}

function monthKey(date) {
  return date.toISOString().slice(0, 7);
}

function currentMonthKey(date) {
  return date.toISOString().slice(0, 7);
}

function normalizePayment(payment) {
  return {
    id: payment.id,
    createdAt: payment.created_at,
    amount: Number(payment.amount),
    transactionHash: payment.transaction_hash,
    from: payment.from,
    to: payment.to,
  };
}

function isIncomingUsdmPayment(payment) {
  return (
    payment.type === 'payment' &&
    payment.to === ACCOUNT &&
    payment.asset_code === ASSET_CODE &&
    payment.asset_issuer === ISSUER
  );
}

function mergePayments(existingPayments = [], horizonPayments = []) {
  const merged = new Map();
  const idsByTransactionHash = new Map();

  function put(payment) {
    const existingId = idsByTransactionHash.get(payment.transactionHash);
    if (existingId) {
      merged.set(existingId, { ...merged.get(existingId), ...payment, id: existingId });
      return;
    }

    merged.set(payment.id, payment);
    if (payment.transactionHash) {
      idsByTransactionHash.set(payment.transactionHash, payment.id);
    }
  }

  for (const payment of existingPayments) {
    if (!payment?.id) continue;
    put(payment);
  }

  for (const payment of horizonPayments) {
    if (!isIncomingUsdmPayment(payment)) continue;
    const normalized = normalizePayment(payment);
    if (!normalized.id) continue;
    put(normalized);
  }

  return Array.from(merged.values()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
}

function summarizePayments(payments, { generatedAt = new Date().toISOString() } = {}) {
  const monthly = new Map();
  const incompleteMonth = currentMonthKey(new Date(generatedAt));

  for (const payment of payments) {
    const month = monthKey(new Date(payment.createdAt));
    if (month >= incompleteMonth) continue;
    const current = monthly.get(month) ?? {
      month,
      payments: 0,
      amount: 0,
      firstPaymentAt: payment.createdAt,
      lastPaymentAt: payment.createdAt,
    };

    current.payments += 1;
    current.amount += Number(payment.amount);
    current.firstPaymentAt =
      payment.createdAt < current.firstPaymentAt ? payment.createdAt : current.firstPaymentAt;
    current.lastPaymentAt =
      payment.createdAt > current.lastPaymentAt ? payment.createdAt : current.lastPaymentAt;
    monthly.set(month, current);
  }

  return Array.from(monthly.values()).map((row) => ({
    ...row,
    amount: Number(row.amount.toFixed(7)),
    per1000: Number(row.amount.toFixed(4)),
    annualPercentOf1000: Number(((row.amount / BASE_AMOUNT) * 12 * 100).toFixed(4)),
  }));
}

async function readExistingSnapshot() {
  try {
    return JSON.parse(await readFile(OUTPUT, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    if (error instanceof SyntaxError) {
      console.warn(`Ignoring invalid existing snapshot: ${OUTPUT.pathname}`);
      return null;
    }
    throw error;
  }
}

function buildMonitoringSnapshot({
  existing = null,
  account,
  horizonPayments,
  generatedAt = new Date().toISOString(),
}) {
  const payments = mergePayments(existing?.payments, horizonPayments);
  const monthly = summarizePayments(payments, { generatedAt });
  const usdmBalance = account.balances.find(
    (balance) =>
      balance.asset_code === ASSET_CODE && balance.asset_issuer === ISSUER,
  );
  const totalUsdm = monthly.reduce((sum, row) => sum + row.amount, 0);

  const data = {
    account: ACCOUNT,
    accountUrl: `https://stellar.expert/explorer/public/account/${ACCOUNT}`,
    asset: {
      code: ASSET_CODE,
      issuer: ISSUER,
    },
    baseAmount: BASE_AMOUNT,
    generatedAt,
    currentBalance: usdmBalance ? Number(usdmBalance.balance) : null,
    payments,
    totals: {
      months: monthly.length,
      payments: monthly.reduce((sum, row) => sum + row.payments, 0),
      amount: Number(totalUsdm.toFixed(7)),
      per1000: Number(totalUsdm.toFixed(4)),
      annualPercentOf1000: Number(((totalUsdm / BASE_AMOUNT) * 12 * 100).toFixed(4)),
    },
    monthly,
  };

  return data;
}

async function main() {
  const [existing, account, horizonPayments] = await Promise.all([
    readExistingSnapshot(),
    fetchJson(`${HORIZON}/accounts/${ACCOUNT}`),
    fetchAllPayments(),
  ]);
  const data = buildMonitoringSnapshot({
    existing,
    account,
    horizonPayments,
  });

  await mkdir(new URL('../public/data/', import.meta.url), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${OUTPUT.pathname}`);
  console.log(`Months: ${data.totals.months}`);
  console.log(`Payments: ${data.totals.payments}`);
  console.log(`Total USDM: ${data.totals.amount}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildMonitoringSnapshot,
  mergePayments,
  summarizePayments,
};
