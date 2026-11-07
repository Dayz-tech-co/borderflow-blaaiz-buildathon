"use client";

import { useState } from "react";

interface StellarPayout {
  id: string;
  recipientName: string;
  destinationAddress: string;
  amount: string;
  status: string;
  txHash: string | null;
  ledger: number | null;
  reconciledAt: string | null;
  failureReason: string | null;
}

export function StellarPayout() {
  const [recipientName, setRecipientName] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [payout, setPayout] = useState<StellarPayout | null>(null);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const response = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recipientName,
        destinationAddress,
        assetCode: "XLM",
        amount,
        idempotencyKey: crypto.randomUUID(),
      }),
    });
    const data = await response.json() as StellarPayout & { error?: string };
    if (!response.ok) { setError(data.error ?? "Unable to create payout."); return; }
    setPayout(data);
  }

  async function reconcile() {
    if (!payout) return;
    setError("");
    const response = await fetch(`/api/payouts/${payout.id}/reconcile`, { method: "POST" });
    const data = await response.json() as StellarPayout & { error?: string };
    if (!response.ok) { setError(data.error ?? "Unable to reconcile payout."); return; }
    setPayout(data);
  }

  return <form className="form-card" onSubmit={submit}>
    <div className="form-title"><div><span className="eyebrow">STELLAR TESTNET</span><h2>Real Testnet settlement</h2><p>XLM payment; submitted only when server credentials are configured.</p></div></div>
    <label className="field"><span>Recipient name</span><input value={recipientName} onChange={(event) => setRecipientName(event.target.value)} /></label>
    <label className="field"><span>Stellar destination address</span><input value={destinationAddress} onChange={(event) => setDestinationAddress(event.target.value)} placeholder="G..." /></label>
    <label className="field"><span>XLM amount</span><input type="number" min="0.0000001" step="0.0000001" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
    {error && <div className="form-error" role="alert">{error}</div>}
    <button className="primary wide" type="submit">Submit Testnet XLM payout</button>
    {payout && <div className="success">
      <p><b>Status:</b> {payout.status}</p>
      {payout.txHash && <p><b>Transaction:</b> <a target="_blank" rel="noreferrer" href={`https://stellar.expert/explorer/testnet/tx/${payout.txHash}`}>{payout.txHash.slice(0, 12)}...</a></p>}
      {payout.ledger && <p><b>Ledger:</b> {payout.ledger}</p>}
      {payout.reconciledAt && <p><b>Reconciled:</b> {payout.reconciledAt}</p>}
      {payout.failureReason && <p>{payout.failureReason}</p>}
      {payout.txHash && <button className="secondary" type="button" onClick={reconcile}>Refresh status</button>}
    </div>}
  </form>;
}
