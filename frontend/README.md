# JobMatch AI — Frontend

React 18 + TypeScript + Vite SPA. All frontend code lives in this directory; the
repository root is shared with other products.

## Getting started

```bash
cd frontend
npm install
npm run dev
```

The app runs at http://localhost:5173 against an in-memory mock backend. No real
API, database, AI or scraping is involved.

Sign in with any valid email and a password of 8+ characters. The password
`wrongpass` triggers the invalid-credentials state.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Typecheck then production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run lint:css` | Stylelint (enforces logical CSS properties) |
| `npm run test` | Vitest |
| `npm run validate` | All of the above, in order |

## Architecture

```
Pages (routes)
   |  composition only, no data logic
Feature components  --  feature hooks
   |                        |
   |                    typed selectors
   v                        v
        Redux Toolkit slices + thunks
                   |
        Services / API layer      <- real URLs, real query params
                   |
        HttpTransport interface
             +-----+-----+
      AxiosTransport   MockTransport
        (live)          (mock router + MockDb + latency + fault injection)
```

The mock is swapped at the **transport** layer, not the service layer. Services
issue the same requests in both modes, so switching to a real backend is a config
change (`VITE_API_MODE=live`) plus contract reconciliation — not a rewrite.

See [docs/api-contract.md](docs/api-contract.md) for the endpoint list.

### Rules the build enforces

- **UI must not import the mock layer.** ESLint `no-restricted-imports` blocks
  `@/mocks/**` from `src/features`, `src/components` and `src/app`. The only
  exception is `src/features/dev`, which exists to drive the mock.
- **No physical CSS properties.** Stylelint's logical-css plugin fails the build
  on `margin-left`, `vw`, and friends. The UI ships in both LTR (English) and RTL
  (Hebrew), so this is load-bearing.
- **Hebrew catalogue completeness.** `src/i18n/he.ts` is typed
  `Record<TranslationKey, string>`; a missing key is a compile error.
- **No `any`.** `@typescript-eslint/no-explicit-any` is an error.

### Things that are deliberate

- `auth.status` has four states (`idle | loading | authenticated | anonymous`).
  A boolean would flash a redirect to `/login` on every refresh.
- Saved/applied state lives **only** in the applications slice. `Job` carries no
  `isSaved` flag; duplicating it is how the list and the detail view drift apart.
- `JobMatch` is separate from `Job`. Scores are per-user; baking one into the
  shared catalogue breaks as soon as a real backend serves jobs to everyone.
- CV analysis progress is **polled** (`/analysis-jobs/:id`), not animated. It is
  cancellable and survives a refresh mid-analysis.
- Job listings carry `contentLanguage`. A Hebrew posting stays Hebrew in the
  English UI — which is what the scraper will produce — and cards set `dir` per
  content block.
- Breakpoints are literal pixel values in CSS because custom properties do not
  work inside `@media`. `src/styles/breakpoints.ts` is the canonical source;
  every module using one carries a comment pointing there.

## Layout

```
src/
  app/         store, router, guards, providers
  features/    auth, jobs, cv, applications, insights, ui, dev
  components/  ui primitives, layout, domain, feedback
  services/    http transport + typed API functions
  mocks/       transport, db, handlers, fixtures  (never imported by UI)
  types/       domain models
  styles/      tokens, themes, reset, breakpoints
  i18n/        en/he catalogues, t(), plurals
  lib/         formatting, validation, storage, scoring, a11y hooks
```

## Environment

Copy `.env.example` to `.env` to override defaults. With no `.env`, the app runs
in mock mode.
