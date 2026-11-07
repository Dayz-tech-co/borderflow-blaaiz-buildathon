# Backend deployment

The payout API must be deployed separately from the static GitHub Pages demo. Do not point the public demo at the payout API until an authenticated operator workflow has been reviewed.

## Recommended MVP host

Use a single-instance container or virtual machine with an encrypted persistent volume, HTTPS termination, restricted administrative access, backups, and server-side secret injection. Render with a persistent disk is a practical MVP option; Fly.io or a small VM is also suitable when configured as exactly one writer. Serverless filesystems and multi-replica deployments are not suitable for this SQLite baseline.

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

Never use a `NEXT_PUBLIC_*` name for credentials. Restrict log access and do not log request headers, bodies, signing material, or environment dumps.

## Operational limitations

- Run one application replica while SQLite is the authority. WAL improves local concurrency but does not make SQLite a distributed database.
- The in-memory rate limiter is defense-in-depth only and resets on restart. Add a platform/WAF limit before exposing the API.
- The signed transaction hash is persisted before network submission. A transport failure after submission is recorded as `submission_unknown` and is never retried automatically; reconcile the stored hash before deciding what to do.
- Back up the database and test restoration. Keep the persistent disk private and encrypted.
- Use health checks that do not exercise signing or submit transactions.
- Keep GitHub Pages unchanged until the backend, secrets, storage, backups, and operator access are verified.

## Pre-deployment gate

Verify `npm run lint`, `npm run typecheck`, `npm run test`, and `npm run build`; provision a new deployment token through the host secret manager; confirm only Testnet endpoints are configured; verify persistent-volume restart behavior; and test unauthorized requests before any controlled Testnet rehearsal.
