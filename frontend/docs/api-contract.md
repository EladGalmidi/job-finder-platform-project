# API contract

The shape the frontend expects. `MockTransport` implements this today;
`AxiosTransport` will call a real service at `VITE_API_BASE_URL` unchanged.

TypeScript types in `src/types/` are the authoritative definition — this document
is the index.

## Conventions

- Auth: `Authorization: Bearer <token>`.
- List endpoints returning pages use `Paginated<T>`:
  `{ items, page, pageSize, total, hasMore }`.
- Errors return a body of `{ code, message, details? }`. Clients branch on
  `code`, never on `message`. Codes are enumerated as `ApiErrorCode`.

| Code | HTTP |
| --- | --- |
| `VALIDATION_FAILED` | 400 / 422 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `FILE_TOO_LARGE` | 413 |
| `UNSUPPORTED_FILE_TYPE` | 415 |
| `RATE_LIMITED` | 429 |
| `SERVER_ERROR` | 5xx |
| `NETWORK_ERROR` / `TIMEOUT` / `CANCELLED` | transport-level |

## Endpoints

### Auth

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| POST | `/auth/signup` | `SignupPayload` | `AuthSession` |
| POST | `/auth/login` | `LoginPayload` | `AuthSession` |
| POST | `/auth/social/:provider` | — | `AuthSession` |
| POST | `/auth/logout` | — | `{ ok: true }` |
| GET | `/auth/me` | — | `User` |
| PATCH | `/users/me/preferences` | `UserPreferences` | `User` |
| POST | `/users/me/onboarding/complete` | — | `User` |

### Jobs

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/jobs` | `Paginated<JobListItem>` |
| GET | `/jobs/:jobId` | `JobDetailResponse` |

`GET /jobs` query params: `q`, `roles`, `locations`, `remoteModes`, `jobTypes`,
`seniorities`, `salaryMin`, `sort`, `tab`, `page`, `pageSize`. List params are
comma-separated. Each row carries its own `match`, avoiding an N+1 for scores.

### CV

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/cv` | multipart, field `file`; max 5 MB, PDF/DOCX → `CV` |
| POST | `/cv/linkedin-import` | → `CV` |
| GET | `/cv/active` | → `CV \| null` |
| POST | `/cv/:cvId/analyze` | → `{ analysisJobId }` |
| GET | `/analysis-jobs/:analysisJobId` | → `AnalysisJob` (poll until `succeeded`) |
| GET | `/cv/:cvId/analysis` | → `CVAnalysis` |

Analysis is asynchronous by design: start returns a job id, the client polls.
This is what lets the analysing screen survive a refresh and be cancelled.

### Applications

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/applications` | `Application[]` |
| POST | `/applications` | `Application` |
| PATCH | `/applications/:applicationId` | `Application` |
| DELETE | `/applications/:applicationId` | `{ ok: true }` |
| POST | `/applications/:applicationId/notes` | `Application` |

`POST /applications` with a `jobId` that already has a record promotes that
record rather than creating a duplicate.

### Insights

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/alerts` | `Alert[]` (excludes dismissed) |
| PATCH | `/alerts/:alertId` | `Alert` |
| GET | `/activity?limit=` | `Activity[]` |
| GET | `/market/roles/:roleKey` | `MarketRoleSnapshot` |
| GET | `/dashboard/metrics` | `DashboardMetrics` |

## Not yet implemented

- `GET /cv/:cvId/report` — the report is generated client-side from
  `CVAnalysis` (print to PDF), so no endpoint is required.
- Refresh tokens. The mock issues a single opaque token with no expiry; a real
  backend will need a refresh flow and a 401 retry interceptor in
  `axiosTransport.ts`.
