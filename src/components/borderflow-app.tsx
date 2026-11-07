"use client";

import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowRight, BarChart3, Calculator, Check, ChevronRight, CircleDollarSign, Clock3, History, LayoutDashboard, Menu, Plus, RefreshCcw, Search, Send, ShieldCheck, Sparkles, Users, WalletCards, X, XCircle } from "lucide-react";
import { COUNTRIES, CURRENCIES } from "@/lib/demo-data";
import { usePayouts } from "@/hooks/use-payouts";
import type { CalculatorValues, Payout, PayoutStatus } from "@/lib/types";
import { StellarPayout } from "@/components/stellar-payout";

type View = "dashboard" | "calculator" | "create" | "history";
const currency = (value: number, code: string) => new Intl.NumberFormat("en", { style: "currency", currency: code, maximumFractionDigits: code === "NGN" ? 0 : 2 }).format(value);
const shortDate = (value: string) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
const statusStyles: Record<PayoutStatus, string> = { initiated: "status initiated", processing: "status processing", completed: "status completed", failed: "status failed" };

export function BorderFlowApp() {
  const { payouts, ready, addPayout, updateStatus, reset } = usePayouts();
  const [view, setView] = useState<View>("dashboard");
  const [selected, setSelected] = useState<Payout | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const completed = payouts.filter((p) => p.status === "completed");
  const volume = completed.reduce((sum, p) => sum + (p.sourceCurrency === "USD" ? p.sourceAmount : 0), 0);
  const nav = [
    ["dashboard", "Overview", LayoutDashboard], ["calculator", "Calculator", Calculator], ["create", "New payout", Send], ["history", "Transactions", History],
  ] as const;

  const go = (next: View) => { setView(next); setMobileNav(false); };
  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
      <button className="close-nav" onClick={() => setMobileNav(false)} aria-label="Close navigation"><X /></button>
      <div className="brand"><span className="brand-mark"><ArrowDownLeft /></span><span>Border<span>Flow</span></span></div>
      <div className="demo-badge"><span /> Demo environment</div>
      <nav>{nav.map(([id, label, Icon]) => <button key={id} className={view === id ? "active" : ""} onClick={() => go(id)}><Icon size={19} />{label}</button>)}</nav>
      <div className="sidebar-foot"><ShieldCheck size={20} /><div><b>Simulation only</b><small>No real money moves</small></div></div>
    </aside>
    {mobileNav && <button className="nav-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main>
      <header><button className="menu" onClick={() => setMobileNav(true)} aria-label="Open navigation"><Menu /></button><div className="header-title"><span className="eyebrow">Blaaiz Buildathon · Demo</span><b>{nav.find(([id]) => id === view)?.[1]}</b></div><button className="avatar" aria-label="Demo profile">BF</button></header>
      <div className="page-wrap">
        {view === "dashboard" && <Dashboard payouts={payouts} volume={volume} ready={ready} go={go} open={setSelected} />}
        {view === "calculator" && <PayoutCalculator onCreate={() => go("create")} />}
        {view === "create" && <>
          <StellarPayout />
          <CreatePayout addPayout={(p) => { addPayout(p); setSelected(p); }} />
        </>}
        {view === "history" && <TransactionHistory payouts={payouts} ready={ready} open={setSelected} reset={reset} />}
      </div>
    </main>
    {selected && <PayoutDrawer payout={payouts.find((p) => p.id === selected.id) ?? selected} close={() => setSelected(null)} updateStatus={updateStatus} />}
  </div>;
}

function Dashboard({ payouts, volume, ready, go, open }: { payouts: Payout[]; volume: number; ready: boolean; go: (v: View) => void; open: (p: Payout) => void }) {
  const active = payouts.filter((p) => p.status === "initiated" || p.status === "processing").length;
  return <>
    <section className="hero"><div><span className="pill"><Sparkles size={14} /> Transparent payouts</span><h1>Move with clarity.<br /><em>Track every step.</em></h1><p>Plan, simulate, and monitor cross-border payouts from one beautifully simple workspace.</p><div className="hero-actions"><button className="primary" onClick={() => go("create")}><Plus size={18} /> Create demo payout</button><button className="secondary" onClick={() => go("calculator")}>Estimate a payout <ArrowRight size={17} /></button></div></div><div className="flow-art" aria-hidden="true"><div className="orb o1">$</div><div className="route"><span /><span /><span /></div><div className="orb o2">₦</div><small>SIMULATED ROUTE</small></div></section>
    <section className="metric-grid">
      <Metric icon={<CircleDollarSign />} label="Completed volume" value={currency(volume, "USD")} note="USD-equivalent demo total" />
      <Metric icon={<Clock3 />} label="Active payouts" value={String(active)} note="Awaiting completion" />
      <Metric icon={<BarChart3 />} label="Success rate" value={`${payouts.length ? Math.round((payouts.filter((p) => p.status === "completed").length / payouts.length) * 100) : 0}%`} note="Across demo transactions" />
      <Metric icon={<Users />} label="Recipients" value={String(new Set(payouts.map((p) => p.recipient)).size)} note="Unique demo recipients" />
    </section>
    <section className="panel"><div className="panel-head"><div><span className="eyebrow">Latest activity</span><h2>Recent payouts</h2></div><button className="text-button" onClick={() => go("history")}>View all <ChevronRight size={16} /></button></div><PayoutTable payouts={payouts.slice(0, 5)} ready={ready} open={open} /></section>
  </>;
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) { return <article className="metric"><div className="metric-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{note}</small></article>; }

const initialCalc: CalculatorValues = { sourceCurrency: "USD", destinationCurrency: "NGN", amount: 1000, exchangeRate: 1580, feePercent: 1.25, flatFee: 3.5 };
function PayoutCalculator({ onCreate }: { onCreate: () => void }) {
  const [form, setForm] = useState(initialCalc);
  const percentageFee = form.amount * form.feePercent / 100;
  const totalFee = percentageFee + form.flatFee;
  const converted = form.amount * form.exchangeRate;
  const recipient = Math.max(0, (form.amount - totalFee) * form.exchangeRate);
  const update = (key: keyof CalculatorValues, value: string | number) => setForm((f) => ({ ...f, [key]: value }));
  return <div className="feature-layout"><section><span className="eyebrow">Illustrative calculator</span><h1 className="page-title">Know the numbers<br />before you send.</h1><p className="lead">Adjust every assumption yourself. These are sample values—not live Blaaiz rates or fees.</p><div className="notice"><ShieldCheck size={19} /><span><b>Demo assumptions</b> Rates and fees are editable and purely illustrative.</span></div></section><section className="calc-card"><div className="field-row"><Field label="You send"><input type="number" min="0" value={form.amount} onChange={(e) => update("amount", Number(e.target.value))} /></Field><Field label="From"><select value={form.sourceCurrency} onChange={(e) => update("sourceCurrency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field></div><div className="swap-line"><span /><button aria-label="Swap currencies" onClick={() => setForm((f) => ({ ...f, sourceCurrency: f.destinationCurrency, destinationCurrency: f.sourceCurrency, exchangeRate: f.exchangeRate ? 1 / f.exchangeRate : 1 }))}><RefreshCcw size={17} /></button><span /></div><div className="field-row"><Field label="Recipient currency"><select value={form.destinationCurrency} onChange={(e) => update("destinationCurrency", e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Illustrative rate"><input type="number" min="0" step="0.0001" value={form.exchangeRate} onChange={(e) => update("exchangeRate", Number(e.target.value))} /></Field></div><div className="field-row"><Field label="Fee percentage"><div className="input-suffix"><input type="number" min="0" step="0.1" value={form.feePercent} onChange={(e) => update("feePercent", Number(e.target.value))} /><span>%</span></div></Field><Field label={`Flat fee (${form.sourceCurrency})`}><input type="number" min="0" step="0.5" value={form.flatFee} onChange={(e) => update("flatFee", Number(e.target.value))} /></Field></div><div className="breakdown"><p><span>Converted amount</span><b>{currency(converted, form.destinationCurrency)}</b></p><p><span>Percentage fee</span><b>{currency(percentageFee, form.sourceCurrency)}</b></p><p><span>Flat fee</span><b>{currency(form.flatFee, form.sourceCurrency)}</b></p><p className="total"><span>Estimated recipient gets</span><strong>{currency(recipient, form.destinationCurrency)}</strong></p></div><button className="primary wide" onClick={onCreate}>Create payout with demo values <ArrowRight size={18} /></button></section></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="field"><span>{label}</span>{children}</label>; }

function CreatePayout({ addPayout }: { addPayout: (p: Payout) => void }) {
  const [recipient, setRecipient] = useState(""); const [country, setCountry] = useState("Nigeria"); const [sourceCurrency, setSourceCurrency] = useState("USD"); const [amount, setAmount] = useState(""); const [error, setError] = useState(""); const [created, setCreated] = useState("");
  const destinationCurrency = COUNTRIES.find((c) => c.name === country)?.currency ?? "NGN";
  const submit = (e: React.FormEvent) => { e.preventDefault(); const numericAmount = Number(amount); if (!recipient.trim() || !numericAmount || numericAmount <= 0) { setError("Enter a recipient name and a valid amount greater than zero."); return; } const rate = 1; const fee = numericAmount * 0.0125 + 3.5; const now = new Date().toISOString(); const reference = `BF-${crypto.randomUUID().slice(0, 6).toUpperCase()}`; const payout: Payout = { id: crypto.randomUUID(), reference, recipient: recipient.trim(), country, sourceCurrency, destinationCurrency, sourceAmount: numericAmount, exchangeRate: rate, fee, recipientAmount: Math.max(0, numericAmount - fee), status: "initiated", createdAt: now, updatedAt: now }; addPayout(payout); setCreated(reference); setError(""); setRecipient(""); setAmount(""); };
  return <div className="feature-layout"><section><span className="eyebrow">Safe simulation</span><h1 className="page-title">Create a demo<br />payout journey.</h1><p className="lead">Generate a trackable payout without touching a bank account or moving real funds.</p><ul className="steps-list"><li><span>01</span>Enter the payout basics</li><li><span>02</span>Get a unique demo reference</li><li><span>03</span>Simulate the status lifecycle</li></ul></section><form className="form-card" onSubmit={submit} noValidate><div className="form-title"><WalletCards /><div><h2>Payout details</h2><p>All fields below create local demo data only.</p></div></div>{created && <div className="success"><Check size={18} /> Demo payout <b>{created}</b> created. Open it from Transactions to simulate progress.</div>}{error && <div className="form-error" role="alert"><XCircle size={18} />{error}</div>}<Field label="Recipient full name"><input value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="e.g. Amara Okafor" autoComplete="name" /></Field><div className="field-row"><Field label="Destination country"><select value={country} onChange={(e) => setCountry(e.target.value)}>{COUNTRIES.map((c) => <option key={c.name}>{c.name}</option>)}</select></Field><Field label="Destination currency"><input value={destinationCurrency} disabled /></Field></div><div className="field-row"><Field label="Source currency"><select value={sourceCurrency} onChange={(e) => setSourceCurrency(e.target.value)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Field><Field label="Amount"><input type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" /></Field></div><div className="demo-warning"><Sparkles size={17} /> This action creates a local simulation. No API payout request will be sent.</div><button className="primary wide" type="submit"><Send size={18} /> Create demo payout</button></form></div>;
}

function TransactionHistory({ payouts, ready, open, reset }: { payouts: Payout[]; ready: boolean; open: (p: Payout) => void; reset: () => void }) {
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const filtered = useMemo(() => payouts.filter((p) => (status === "all" || p.status === status) && `${p.reference} ${p.recipient} ${p.country}`.toLowerCase().includes(query.toLowerCase())), [payouts, query, status]);
  return <><div className="page-heading"><div><span className="eyebrow">Demo ledger</span><h1>Transaction history</h1><p>Search, filter, and inspect every simulated payout.</p></div><button className="secondary danger" onClick={() => confirm("Reset all demo payouts to the original sample data?") && reset()}><RefreshCcw size={17} /> Reset demo</button></div><section className="panel"><div className="filters"><label className="search"><Search size={18} /><input aria-label="Search transactions" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or reference" /></label><select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="initiated">Initiated</option><option value="processing">Processing</option><option value="completed">Completed</option><option value="failed">Failed</option></select></div><PayoutTable payouts={filtered} ready={ready} open={open} /></section></>;
}

function PayoutTable({ payouts, ready, open }: { payouts: Payout[]; ready: boolean; open: (p: Payout) => void }) {
  if (!ready) return <div className="empty"><span className="loader" /><p>Loading your demo payouts…</p></div>;
  if (!payouts.length) return <div className="empty"><Search /><h3>No payouts found</h3><p>Try another search or create a new demo payout.</p></div>;
  return <div className="table-wrap"><table><thead><tr><th>Recipient</th><th>Reference</th><th>Amount</th><th>Status</th><th>Date</th><th /></tr></thead><tbody>{payouts.map((p) => <tr key={p.id} onClick={() => open(p)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && open(p)}><td><span className="recipient-avatar">{p.recipient.split(" ").map((n) => n[0]).slice(0, 2).join("")}</span><span><b>{p.recipient}</b><small>{p.country}</small></span></td><td><code>{p.reference}</code></td><td><b>{currency(p.sourceAmount, p.sourceCurrency)}</b><small>{p.destinationCurrency} payout</small></td><td><span className={statusStyles[p.status]}><i />{p.status}</span></td><td>{shortDate(p.createdAt)}</td><td><ChevronRight size={18} /></td></tr>)}</tbody></table></div>;
}

function PayoutDrawer({ payout, close, updateStatus }: { payout: Payout; close: () => void; updateStatus: (id: string, s: PayoutStatus) => void }) {
  const stages: PayoutStatus[] = payout.status === "failed" ? ["initiated", "processing", "failed"] : ["initiated", "processing", "completed"];
  const current = stages.indexOf(payout.status);
  return <div className="drawer-layer"><button className="drawer-scrim" onClick={close} aria-label="Close payout details" /><aside className="drawer"><div className="drawer-head"><div><span className="eyebrow">Payout details</span><h2>{payout.reference}</h2></div><button onClick={close} aria-label="Close"><X /></button></div><div className="drawer-amount"><span>{payout.recipient} receives</span><strong>{currency(payout.recipientAmount, payout.destinationCurrency)}</strong><span className={statusStyles[payout.status]}><i />{payout.status}</span></div><div className="detail-grid"><p><span>Sent</span><b>{currency(payout.sourceAmount, payout.sourceCurrency)}</b></p><p><span>Illustrative fee</span><b>{currency(payout.fee, payout.sourceCurrency)}</b></p><p><span>Destination</span><b>{payout.country}</b></p><p><span>Created</span><b>{shortDate(payout.createdAt)}</b></p></div><div className="timeline"><h3>Payout timeline</h3>{stages.map((stage, index) => <div className={index <= current ? `timeline-item active ${stage}` : "timeline-item"} key={stage}><span>{index <= current ? stage === "failed" ? <X size={15} /> : <Check size={15} /> : index + 1}</span><div><b>{stage[0].toUpperCase() + stage.slice(1)}</b><small>{index <= current ? stage === "failed" ? "Simulated payout stopped" : "Demo milestone reached" : "Waiting for simulation"}</small></div></div>)}</div><div className="simulator"><span className="eyebrow">Demo simulator</span><h3>Advance the payout</h3><p>These actions only update browser-local demo data.</p><div>{payout.status === "initiated" && <button className="primary" onClick={() => updateStatus(payout.id, "processing")}><Clock3 size={17} /> Mark processing</button>}{(payout.status === "initiated" || payout.status === "processing") && <><button className="secondary complete-btn" onClick={() => updateStatus(payout.id, "completed")}><Check size={17} /> Complete</button><button className="secondary danger" onClick={() => updateStatus(payout.id, "failed")}><X size={17} /> Fail</button></>}</div></div></aside></div>;
}
