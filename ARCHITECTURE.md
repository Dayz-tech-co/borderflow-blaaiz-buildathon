# BorderFlow Architecture

BorderFlow is a cross-border payout operations layer with Stellar Testnet settlement.

```text
Browser
  |
  | public demo only (no settlement credential)
  v
Operator-controlled client
  | Authorization: Bearer <server-managed token>
  | POST /api/payouts
Next.js server
  |-- SQLite payout/idempotency state
  |-- Stellar SDK transaction construction/signing
  `-- Horizon reconciliation
                  |
                  v
             Stellar Testnet
```

## Centralized responsibilities

BorderFlow owns payout records, recipient details, idempotency, operational status, reconciliation policy, UI behavior, and audit evidence.

## Stellar responsibilities

Stellar records settlement as a native XLM payment and provides transaction evidence through ledger data.

## Persistence

SQLite is the baseline authority for payout state. Browser storage remains demo-only and is never trusted as chain status.

## Settlement states

`draft -> pending -> processing -> submitted -> confirmed`

The signed transaction hash is stored before submission. Deterministic submission or reconciliation errors may produce `failed`. An ambiguous transport failure produces `submission_unknown` and blocks automatic retry, while retaining the hash for reconciliation. A transaction submitted successfully is reconciled by its stored hash rather than browser state.

## Reconciliation

`POST /api/payouts/:id/reconcile` queries the configured Testnet Horizon endpoint and stores confirmed/failed/missing evidence with `reconciledAt`.

## Idempotency

A payout API request uses a caller-provided idempotency key. Reusing it with the same normalized payload returns the existing payout. Reusing it with changed payout data returns HTTP 409.

Creation and the transition into transaction processing use SQLite uniqueness and a conditional atomic update. Concurrent requests cannot both claim the same pending payout.

## Current limitations

- Native XLM only
- No live fiat on-ramp
- No queue worker
- No mainnet support
- No production USDC support
- No Soroban contract
- Pre-production; no formal audit
- Single-instance SQLite deployment only
- In-process rate limiting requires an edge limit for production
