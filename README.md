# BorderFlow

BorderFlow is a polished, demo-first cross-border payout tracker built for the Blaaiz Buildathon. It gives operations teams a clear view of payout estimates, recipients, transaction status, and the full simulated lifecycle—without sending real money.

- **Live demo:** https://dayz-tech-co.github.io/borderflow-blaaiz-buildathon/
- **Repository:** https://github.com/Dayz-tech-co/borderflow-blaaiz-buildathon

> **Important:** BorderFlow starts in **DEMO MODE**. Rates and fees shown in the interface are illustrative, editable assumptions. Creating or advancing a payout only changes data in the current browser's `localStorage`; it never calls a Blaaiz payout endpoint.

## Hackathon submission description

Cross-border payouts often become opaque the moment they are sent. BorderFlow turns that uncertainty into a clear operational journey: estimate a payout, create a safe simulation, follow its timeline, and search a persistent transaction ledger. The experience is designed to demonstrate how a future Blaaiz-powered integration could give teams and recipients confidence at every step while keeping credentials and live money movement firmly server-side.

## Features

- Responsive fintech dashboard with seeded sample payouts and summary metrics
- Editable payout calculator with clearly labelled illustrative rates and fees
- Validated demo-payout creation with unique references
- Detailed payout drawer and Initiated → Processing → Completed/Failed timeline
- Explicit demo simulator for status transitions
- Searchable, filterable transaction history
- SSR-safe browser persistence and recoverable demo reset
- Loading, empty, validation, and data-recovery behavior
- Isolated server-only Blaaiz service boundary
- Accessible controls, keyboard-openable table rows, high contrast, and reduced-motion support

## Run locally

Requirements: Node.js 20.9 or newer and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality checks:

```bash
npm run lint
npm run typecheck
npm run build
```

## Environment variables

Copy `.env.example` to `.env.local`. `NEXT_PUBLIC_APP_MODE=demo` is the only supported UI mode in this MVP. `BLAAIZ_CLIENT_SECRET` and the webhook signing secret are server-only variables and must never use the `NEXT_PUBLIC_` prefix.

## Blaaiz integration notes

Documentation was reviewed on November 7, 2026 against the [official getting-started guide](https://docs.blaaiz.com/docs/guides/getting-started) and endpoint reference pages. No authenticated or money-moving request was made.

Verified from official documentation:

| Purpose | Method and path | Required scope / note |
| --- | --- | --- |
| Development base | `https://api-dev.blaaiz.com` | Development and production accounts are isolated |
| OAuth token | `POST /oauth/token` | Form-encoded client credentials and explicit space-separated scopes |
| Create fiat payout | `POST /api/external/payout` | `payout:create`; **not called by BorderFlow** |
| Fee breakdown | `POST /api/external/fees/breakdown` | `fees:read`; call before creating a live payout |
| Rates | `GET /api/external/rate` | Referenced by the official rates documentation; not called in demo mode |
| Get transaction | `GET /api/external/transaction/{id}` | `transaction:read`; completed API transactions; not called in demo mode |
| List transactions | `POST /api/external/transaction` | `transaction:read`; paginated completed API transactions; not called in demo mode |

The OAuth request shape in `src/lib/blaaiz.ts` follows the documented token contract. It is deliberately server-only. Live payout methods are intentionally absent: a production implementation still needs provisioned development credentials, authenticated contract tests, verified customer/wallet IDs, destination-specific recipient fields, idempotency handling, and signed webhook processing.

Not verified at runtime:

- Credential issuance, authentication success, and account entitlements
- Actual rates, fees, wallet balances, or supported routes for a specific account
- Payout submission behavior, response payloads, transaction polling, or webhooks
- Production environment configuration and IP allowlisting

## Demo data and calculations

Seeded records and all displayed exchange rates and fees are fictional examples. The calculator applies:

```text
total fee = amount × editable fee percentage + editable flat fee
estimated recipient amount = (amount − total fee) × editable exchange rate
```

New demo payouts intentionally use a neutral `1.0` placeholder rate because the creation form does not fetch a live quote. This limitation is visible in the product language and prevents fictional prices from being presented as Blaaiz data.

## Deployment to Vercel

1. Push the repository to a Git provider and import it into Vercel.
2. Keep `NEXT_PUBLIC_APP_MODE=demo` for the public hackathon deployment.
3. Do not configure live credentials unless the server-side integration has been completed and contract-tested.
4. Deploy. Vercel detects Next.js and runs `npm run build` automatically.

For a future live deployment, add server-only secrets in Vercel project settings, implement authenticated API routes/server actions around the service abstraction, validate webhook signatures using the separate signing secret, and keep payout submission behind an explicit operational approval step.

The repository also includes a GitHub Pages workflow for the static demo build. It publishes with `NEXT_PUBLIC_APP_MODE=demo` and does not receive or expose Blaaiz credentials.

## Tech stack

Next.js App Router, TypeScript, Tailwind CSS, Lucide icons, typed validation, and `localStorage` persistence. No database or authentication is required for the demo.
