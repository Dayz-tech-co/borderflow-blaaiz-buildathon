# BorderFlow Architecture

BorderFlow is a cross-border payout operations layer with Stellar Testnet settlement.

```text
Browser
  |
  | POST /api/payouts
  v
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

`draft -> pending -> submitted -> confirmed`

Submission or reconciliation errors may produce `failed`. A transaction submitted successfully is reconciled by its stored hash rather than browser state.

## Reconciliation

`POST /api/payouts/:id/reconcile` queries the configured Testnet Horizon endpoint and stores confirmed/failed/missing evidence with `reconciledAt`.

## Idempotency

A payout API request uses a caller-provided idempotency key. Reusing it with the same normalized payload returns the existing payout. Reusing it with changed payout data returns HTTP 409.

## Current limitations

- Native XLM only
- No live fiat on-ramp
- No queue worker
- No mainnet support
- No production USDC support
- No Soroban contract
- Pre-production; no formal audit
