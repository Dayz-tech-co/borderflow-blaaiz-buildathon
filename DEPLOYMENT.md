# Backend deployment

The payout API must be deployed separately from the static GitHub Pages demo. Do not point the public demo at the payout API until an authenticated operator workflow has been reviewed.

## Recommended MVP host

Use the Render Blueprint in `render.yaml`. It declares one Node.js web-service instance, a 1 GB disk mounted at `/var/data`, an HTTP readiness check, manual deploys, and settlement disabled by default. Render persistent disks are encrypted at rest, limited to one service instance, and include daily encrypted snapshots retained for seven days.

As verified on 2026-11-07, the smallest paid web service is USD $7/month and persistent disks are USD $0.25/GB/month, for an estimated minimum of USD $7.25/month before excess bandwidth. Creating this service is a paid infrastructure action and requires explicit approval.

Run with Node.js 22 and:

```text
npm ci
npm run build
npm run start
```

Required server-only configuration:

- `BORDERFLOW_ADMIN_TOKEN`: randomly generated, at least 32 characters; send only as an `Authorization: Bearer ...` header from an operator-controlled client.
- `STELLAR_NETWORK=testnet`: the application refuses every other value.
- `STELLAR_SOURCE_SECRET`: Testnet signing seed stored in the host secret manager.
- `BORDERFLOW_DATABASE_PATH`: absolute path on the persistent volume.
- `BORDERFLOW_MAX_PAYOUT_XLM`: conservative per-request Testnet ceiling.
- `STELLAR_HORIZON_URL`: HTTPS Testnet Horizon endpoint.
- `BORDERFLOW_SETTLEMENT_ENABLED`: keep `false` for initial deployment. Set to `true` only after a Testnet signing secret and all other controls have been reviewed.
- `BORDERFLOW_BACKUP_DIRECTORY`: directory on the persistent volume for verified SQLite backups.

The initial Blueprint intentionally omits `STELLAR_SOURCE_SECRET` and sets settlement to `false`. In this mode, public health checks work but payout creation returns HTTP 503 even with administrator credentials. Enabling settlement requires a separately authorized dashboard secret entry and configuration change.

Never use a `NEXT_PUBLIC_*` name for credentials. Restrict log access and do not log request headers, bodies, signing material, or environment dumps.

## Operational limitations

- Run one application replica while SQLite is the authority. WAL improves local concurrency but does not make SQLite a distributed database.
- The in-memory rate limiter is defense-in-depth only and resets on restart. Add a platform/WAF limit before exposing the API.
- The signed transaction hash is persisted before network submission. A transport failure after submission is recorded as `submission_unknown` and is never retried automatically; reconcile the stored hash before deciding what to do.
- Back up the database and test restoration. Keep the persistent disk private and encrypted.
- Use health checks that do not exercise signing or submit transactions.
- Keep GitHub Pages unchanged until the backend, secrets, storage, backups, and operator access are verified.

## Health and readiness

- `GET /api/health` is a public liveness check. It returns only `{ "status": "ok" }` and does not touch SQLite, credentials, or Stellar.
- `GET /api/ready` is a public readiness check. It verifies Testnet selection and SQLite access. When settlement is enabled, it also validates the administrator token and Testnet Stellar configuration without making a network call.
- Neither endpoint returns environment values, filesystem paths, account identifiers, or secrets.

Render should use `/api/ready` as its health check. API responses are marked `no-store`, `nosniff`, and `no-referrer`.

## Logging

Operational logs are one-line JSON with an event name, severity, timestamp, and an internal payout ID where relevant. Do not add request headers, bearer tokens, request bodies, recipient data, destination addresses, signed transaction XDR, wallet seeds, or environment dumps to log context. Restrict dashboard log access to backend operators.

## Backup and restore

Create a live SQLite backup with `npm run backup`. It requires absolute `BORDERFLOW_DATABASE_PATH` and `BORDERFLOW_BACKUP_DIRECTORY` values and runs SQLite's online backup API followed by `PRAGMA integrity_check`. Copy verified backups to a separate encrypted location; a backup stored only on the same disk is not sufficient disaster recovery.

Verify a selected backup by setting `BORDERFLOW_BACKUP_PATH` to its absolute path and running `npm run backup:verify`.

Restore procedure:

1. Disable settlement and suspend the service so there is no SQLite writer.
2. Preserve the current database and its `-wal` and `-shm` files as incident evidence.
3. Verify the selected backup with `npm run backup:verify`.
4. Replace the database only while the service is stopped, keeping the configured filename unchanged.
5. Resume with settlement still disabled and confirm `/api/ready` plus record counts.
6. Re-enable settlement only after operator review.

Do not use a filesystem snapshot as the only SQLite recovery method. Render warns against snapshot restoration for custom databases; use a verified SQLite backup.

## Recovering `submission_unknown`

1. Keep settlement disabled for the affected workflow and never create a replacement payout automatically.
2. Retrieve the payout through the authenticated management endpoint and record its stored transaction hash.
3. Check that exact hash through Testnet Horizon or a Testnet explorer. Never query Mainnet.
4. If Horizon has the transaction, call the authenticated reconciliation endpoint; reconciliation does not submit a payment.
5. If Horizon reports it missing, inspect the Testnet source-account history and wait through the expected ledger window before any decision.
6. Escalate for explicit operator approval before creating a new payout. Never reuse the ambiguous transaction as proof that a retry is safe.

## Hosting-side controls

Render provides managed HTTPS, firewalling, and DDoS mitigation. Keep one instance because a disk cannot be shared and SQLite requires a single writer. Retain the application mutation limit and place a configurable edge/WAF limit in front of the API before enabling settlement; Render's general service protection is not a per-administrator payout policy.

## Pre-deployment gate

Verify `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm audit --omit=dev`; provision a new administrator token through the host secret manager; confirm only Testnet endpoints are configured; verify persistent-volume restart and backup restoration; and test unauthorized requests. Do not perform a payment as part of deployment validation.
