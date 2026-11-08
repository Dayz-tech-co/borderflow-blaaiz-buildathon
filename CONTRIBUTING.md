# Contributing to BorderFlow

## Development

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Run the complete local quality gate:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Stellar network calls in tests must be mocked. Do not commit funded accounts, private keys, `.env*`, SQLite databases, or transaction evidence containing secrets.

## Pull requests

- Keep changes focused and include tests.
- Document Testnet limitations.
- Never claim a payment is production-ready or mainnet-tested.
- Do not add a Soroban contract unless its product purpose and acceptance criteria are established.
