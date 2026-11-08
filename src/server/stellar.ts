import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

export interface StellarAsset {
  code: string;
  issuer: string | null;
  toSdkAsset(): Asset;
}

export const nativeXlm: StellarAsset = {
  code: "XLM",
  issuer: null,
  toSdkAsset: () => Asset.native(),
};

export interface StellarConfig {
  network: "testnet";
  horizonUrl: string;
  sourceSecret: string;
}

export function getStellarConfig(env: Record<string, string | undefined> = process.env): StellarConfig {
  const network = env.STELLAR_NETWORK;
  if (network !== "testnet") throw new Error("STELLAR_NETWORK must be testnet.");
  const horizonUrl = env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org";
  let parsedHorizon: URL;
  try { parsedHorizon = new URL(horizonUrl); } catch { throw new Error("Invalid STELLAR_HORIZON_URL."); }
  if (parsedHorizon.protocol !== "https:") throw new Error("STELLAR_HORIZON_URL must use HTTPS.");
  const sourceSecret = env.STELLAR_SOURCE_SECRET;
  if (!sourceSecret) throw new Error("STELLAR_SOURCE_SECRET is required.");
  if (!StrKey.isValidEd25519SecretSeed(sourceSecret)) throw new Error("Invalid Stellar source secret.");
  return { network, horizonUrl, sourceSecret };
}

export function isValidAddress(address: string): boolean {
  return StrKey.isValidEd25519PublicKey(address);
}

export function parsePositiveAmount(value: string | number): string {
  const text = String(value).trim();
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(text)) throw new Error("Amount must be numeric with at most 7 decimal places.");
  if (Number(text) <= 0) throw new Error("Amount must be positive.");
  return text;
}

export function validatePayoutAmount(value: string | number, env: Record<string, string | undefined> = process.env): string {
  const amount = parsePositiveAmount(value);
  const maximum = parsePositiveAmount(env.BORDERFLOW_MAX_PAYOUT_XLM ?? "10");
  const toStroops = (text: string) => {
    const [whole, fraction = ""] = text.split(".");
    return BigInt(whole) * BigInt(10_000_000) + BigInt(fraction.padEnd(7, "0"));
  };
  if (toStroops(amount) > toStroops(maximum)) throw new Error(`Amount exceeds the configured maximum of ${maximum} XLM.`);
  return amount;
}

export function explorerTransactionUrl(hash: string, baseUrl?: string): string {
  if (!/^[a-f0-9]{64}$/i.test(hash)) throw new Error("Invalid Stellar transaction hash.");
  return `${(baseUrl ?? "https://stellar.expert/explorer/testnet").replace(/\/$/, "")}/tx/${hash}`;
}

export async function loadAccount(horizonUrl: string, publicKey: string, fetcher = fetch) {
  const response = await fetcher(`${horizonUrl.replace(/\/$/, "")}/accounts/${encodeURIComponent(publicKey)}`);
  if (!response.ok) throw new Error(`Unable to load Stellar account (${response.status}).`);
  return response.json() as Promise<{ sequence: string }>;
}

export async function buildNativePayment(params: {
  sourceSecret: string;
  destinationAddress: string;
  amount: string;
  horizonUrl: string;
}) {
  if (!isValidAddress(params.destinationAddress)) throw new Error("Invalid Stellar destination address.");
  const amount = parsePositiveAmount(params.amount);
  const keypair = Keypair.fromSecret(params.sourceSecret);
  const account = await loadAccount(params.horizonUrl, keypair.publicKey());
  const transaction = new TransactionBuilder(new Account(keypair.publicKey(), account.sequence), {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({
      destination: params.destinationAddress,
      asset: nativeXlm.toSdkAsset(),
      amount,
    }))
    .setTimeout(30)
    .build();
  transaction.sign(keypair);
  return transaction;
}

export async function submitTransaction(transaction: string, horizonUrl: string, fetcher = fetch) {
  const body = new URLSearchParams({ tx: transaction });
  const response = await fetcher(`${horizonUrl.replace(/\/$/, "")}/transactions`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    return { submitted: false, failureReason: safeStellarError(data) };
  }
  return { submitted: true, hash: String(data.hash ?? ""), ledger: asNumber(data.ledger), feeCharged: asNumber(data.fee_charged) };
}

export async function reconcileTransaction(hash: string, horizonUrl: string, fetcher = fetch) {
  const response = await fetcher(`${horizonUrl.replace(/\/$/, "")}/transactions/${encodeURIComponent(hash)}`);
  if (response.status === 404) return { state: "missing" as const };
  if (!response.ok) return { state: "pending" as const };
  const data = await response.json() as Record<string, unknown>;
  if (data.successful === false) return { state: "failed" as const, failureReason: safeStellarError(data) };
  return {
    state: "confirmed" as const,
    ledger: asNumber(data.ledger),
    feeCharged: asNumber(data.fee_charged),
  };
}

function asNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function safeStellarError(data: Record<string, unknown>): string {
  const extras = data.extras as { result_codes?: { transaction?: unknown; operations?: unknown[] } } | undefined;
  const transaction = extras?.result_codes?.transaction;
  return typeof transaction === "string" ? transaction : "Stellar transaction rejected";
}
