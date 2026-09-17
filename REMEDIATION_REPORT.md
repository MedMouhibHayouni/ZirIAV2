# ZirIA — Security Remediation Report (Phases 0–9)

**Date:** 2026-09-10 · **Scope:** code fixes only for `AUDIT_REPORT.md` §§2–3 · **Method:** minimal targeted edits, `tsc --noEmit` + `jest` after every phase (all green), live verification vs `http://localhost:3000` only.
**Commits:** `965f6eb2` + `1d8ea0e5` (Phase 0 untrack), `c28567bf` (Phases 1–8), plus final commit below (Phase 9 + report).

> Key rotation, git-history purge, and migration generation were NOT performed (manual operator steps — §4). No secret values are reproduced in this report.

---

## 1. Finding → status → files changed

| Audit finding | Status | File(s) changed |
|---|---|---|
| P0-1 `backend/.env` with live keys git-tracked | **Partially fixed (code-side done)** — untracked + ignored; history purge + rotation are manual (§4) | `.gitignore` (new), `backend/.gitignore` (new), `backend/.env.example` (JWT placeholder), `git rm --cached backend/.env` |
| P0-2 WS JWT fallback `'ZIRIA_SUPER_SECRET'` (4 gateways) | **Fixed** — verified: boot without any secret exits 1, `JwtStrategy requires a secret or key`, port never bound | `ai/gateways/expert.gateway.ts`, `notifications/notification.gateway.ts`, `land/land-auction.gateway.ts`, `drivers/gps-tracking.gateway.ts`, `main.ts` (fail-fast incl. empty-string guard) |
| P0-3 BOLA parcels (`GET :id`, `PATCH :id/boundary`, `GET :id/crop-zones`, `PATCH crop-zones/:zoneId/boundary`) | **Fixed** — live: non-owner → 403 on all four, owner → 200, missing → 404 | `parcels/parcels.controller.ts`, `parcels/parcels.service.ts` (`findOneForUser`, `updateBoundaryForUser`, `getCropZonesForUser`, `updateZoneBoundaryForUser`) |
| P0-3 auction `placeBid{bidderId}` spoofing | **Fixed** — unit test: service receives `client.data.userId`, spoofed id ignored; unauth → `{status:'error'}` | `land/land-auction.gateway.ts` (payload shape now `{auctionId, amount}`) |
| P1-1 JWT via `?token=` | **Fixed** — live: `GET /parcels/my?token=<valid>` → 401, header → 200. Flagged caller (frontend only, untouched): `frontend/src/app/core/services/zirfeed.service.ts:274` (`/zirfeed/stream?token=` — backend SSE route has no guard so token was ignored anyway). Mobile: no `?token=` usage found | `auth/strategies/jwt.strategy.ts` (header-only extractor) |
| P1-2 vulnerable deps (37 backend / 40 frontend) | **Partially fixed** — backend **37→18** (0 critical), frontend **40→13** (0 critical); remainder needs breaking majors — STOPPED for sign-off (§3) | `backend/package-lock.json`, `frontend/package-lock.json` (`npm audit fix`, no `--force`) |
| P1-3 50 MB JSON body / 50 MB in-RAM uploads | **Fixed with documented deviation** — JSON/urlencoded → `1mb`; image caps → 5 MB, audio 50→15 MB; `memoryStorage` KEPT (see §2) | `main.ts`, `upload/upload.controller.ts` |
| P1-4 uploads without type/size filter; public `/upload/public/plant` | **Fixed** — `fileFilter`+`limits` added on `ai:96`, `marketplace:160,285`, `disease-photo`; public plant route capped 10→5 MB + `@Throttle(5/min)` (stays public, no auth added) | `upload/upload.controller.ts`, `ai/ai.controller.ts`, `marketplace/marketplace.controller.ts` |
| P1-5 wildcard WS CORS (4 gateways) | **Fixed** — explicit `origin: [localhost:4200, localhost:3001, ziria-v2.vercel.app]` + `credentials:true`, mirroring REST | 4 gateway decorators (same files as P0-2) |
| P2 refresh store / `sub` mismatch / open register roles / register race | **Partially fixed** — register race fixed as Phase-9 enabler: parallel same-email → `201+409` live (was `201+500`); `23505→409` mapping added. Redis refresh store, `sub` check, role allowlist: **not in phase scope — left as-is, still open** | `auth/auth.service.ts` (try/catch 23505 only) |
| §3A race conditions (wallet/auction/stock/storage/…) | **Blocked** — out of scope (Phase 3 named parcels/auction only). Still open, unchanged | — |
| §3B `synchronize`, pool, QueryRunner, idempotency timer | **Partially fixed** — `synchronize:false` BLOCKED (migrations not wired/verified, §4); pool `extra{max:20,min:2,idle:30s,connTimeout:5s}` added; QueryRunner `connect()`+`finally release`; idempotency timer `unref()`+`onModuleDestroy`+LRU cap 5000 | `app.module.ts` (extra only), `transactions/transactions-coordinator.service.ts`, `common/interceptors/idempotency.interceptor.ts` |
| §3C swallowed errors (land-auction Q&A, 9× admin lines, notification fan-out, gateway guards, coord fallbacks, room_type, zirfeed names) | **Fixed** — all named locations patched exactly as specified | `land/land-auction.service.ts`, `admin/admin.service.ts`, `notifications/notification.service.ts` (+`notification.gateway.ts` no-throw summary), `drivers/gps-tracking.gateway.ts`, `ai/gateways/expert.gateway.ts`, `marketplace/marketplace.service.ts`, `storage/storage.service.ts`, `zirfeed/zirfeed.service.ts` |
| §3D zero test coverage on critical paths | **Fixed (P0/P1 guard scope)** — `src/remediation.spec.ts`: 6 unit + 6 live tests, 13/13 green with existing suite | `src/remediation.spec.ts` (new; excluded from `nest build` output) |

---

## 2. Diff summary per phase (what + why)

- **P0 secrets hygiene:** new root `.gitignore` (`.env`, `backend/.env`, `*.local.env`, keep `!.env.example`); new `backend/.gitignore` (`.env`, `node_modules/`, `dist/`, `coverage/`); `backend/.env.example` JWT value → `your_jwt_secret_here_min_32_chars`; `git rm --cached backend/.env` committed alone as `1d8ea0e5`. Values untouched.
- **P1 JWT fallback:** `ConfigService` injected into all 4 gateways; `getOrThrow('JWT_SECRET')` replaces `process.env…||'ZIRIA_SUPER_SECRET'`; `main.ts` asserts secret present **and non-empty** before `listen()`. Empty-string hole found live (first boot attempt bound :3999) and closed.
- **P2 query-token:** single-extractor `fromAuthHeaderAsBearerToken()`. No other backend `query.token` consumers exist.
- **P3 BOLA:** followed the file's existing `(userId, isAdmin)` pattern (`update`/`remove`/`addZone`): new `*ForUser` service methods do `findOne` (404) → owner/admin check (403). Zone-boundary additionally validates `zone.parcel_id === parcelId` (400). Gateway derives `bidderId` from `client.data.userId`.
- **P4 limits:** global JSON `50mb→1mb` (multipart uploads bypass `express.json`, so no media route needed an override); image interceptors → 5 MB + jpeg/png/webp/heic filter; audio → 15 MB; marketplace mixed image/video → 10 MB/file + image+video(mp4/webm/quicktime) filter. **Deviation:** kept `memoryStorage` instead of `diskStorage` because `UploadService` consumes `file.buffer` (`upload_stream…end(file.buffer)`); switching storage would have required rewriting the service (out of scope). Risk is now bounded (5/15 MB × 10 req/min class throttle).
- **P5 CORS:** allowlist copied verbatim from REST config in `main.ts`.
- **P6 deps:** `npm audit fix` (never `--force`) both packages; lockfiles committed. `node_modules/` is tracked in this repo — its churn was left **uncommitted**; fixes persist via lockfiles (§4 cleanup recommended).
- **P7 hardening:** pool `extra` added; driver-notify runner now `connect()`s and releases in `finally`; idempotency cache capped + timer unref'd + cleared on destroy. `synchronize:false` deliberately NOT applied.
- **P8 errors:** `land-auction` Q&A and the 9 named admin lines now `Logger.error` + `ServiceUnavailableException` (no silent `[]`/`{}`); notification FCM fan-out awaited via `allSettled` with `{notified, pushDelivered, pushFailed}` summary; `sendToUser` no-throw with `{delivered, queued}`; GPS/expert/marketplace/storage/zirfeed guards as specified (buyer coords fall back to finite seller coords; seller missing → 400, never `(0,0)`).
- **P9 tests:** see §5. Plus the `23505→409` register mapping (5 lines) required by mandated test #1 — probe showed `201+500` before, `201+409` after.

---

## 3. `npm audit` — before → after (non-forced `audit fix` only)

| Package | Before (audit) | After | Delta |
|---|---|---|---|
| backend | **37** (1 crit / 14 high / 19 mod / 3 low) | **18** (0 crit / 10 high / 8 mod / 0 low) | −19, **0 critical** |
| frontend | **40** (1 crit / 24 high / 11 mod / 4 low) | **13** (0 crit / 11 high / 0 mod / 2 low) | −27, **0 critical** |

Fixed without breaking changes: `axios` (prototype-pollution/RCE gadget chain), `@grpc/grpc-js` (malformed-request crash), `websocket-driver` (critical, both packages), `body-parser` (limit-bypass), `@babel/core`, `@opentelemetry/*`, `@protobufjs/utf8`, `@tootallnate/once`.
**Still vulnerable — manual major bump required, STOPPED per instructions:**
- backend `multer <=2.2.0` (4× high DoS/limit-bypass GHSA) — non-forced fix would install `@nestjs/core@7.5.5` (breaking downgrade of the whole NestJS 11 stack). Needs NestJS-coordinated upgrade.
- backend `uuid <11.1.1` chain via `firebase-admin` (moderate) — fix requires `firebase-admin@10.3.0` (breaking downgrade). Needs Firebase SDK upgrade planning.
- frontend 11× high (`@angular/*` 21.2.x, `@babel/core`, `esbuild`, `piscina`, `undici`, `vite`) — pinned by `@angular/build`; fix requires Angular 22 major bump. Needs framework upgrade planning.

---

## 4. Still manual / pending for the human operator

1. **Rotate ALL secrets** (4× Gemini keys, Firebase SA key, Cloudinary key/secret, JWT_SECRET, DB password) — code no longer depends on fallbacks, but committed values remain valid until rotated.
2. **Purge git history** (`git filter-repo --path backend/.env --invert-paths` or BFG), force-push, enable push protection + `gitleaks` pre-commit; move runtime secrets to a vault.
3. **Migration generation (Phase 7 blocked item):** 15 migration files exist but are NOT wired into TypeORM config (no `migrations` array, no `migrationsRun`) and currency vs the ~100-entity schema is unverified — generate a fresh migration, wire it, verify on staging, *then* flip `synchronize` to `false`.
4. **Major-version upgrades** (§3 list: NestJS/multer, firebase-admin/uuid, Angular 22) with integration testing (socket.io, AI client).
5. **Untrack build artifacts:** `backend/dist/` and `node_modules/` are committed; `backend/dist` churn from rebuilds + `node_modules` audit churn are currently uncommitted working-tree noise — recommend `git rm -r --cached` for both (separate coordinated commit).
6. **Residual P2 items** (out of phase scope, still open): Redis-backed refresh rotation, `refreshToken` `sub`-match check, privileged-role registration allowlist, full §3A race-condition program (wallet/auction/stock/storage tx+locks), stored-XSS sanitization.

---

## 5. Test confirmation (Phase 9 + existing suite, final code)

`npx jest` — **2 suites, 13 tests, all pass** (existing `app.controller.spec.ts` 1/1, new `src/remediation.spec.ts` 12/12):

| # | Mandated case | Result (measured, localhost:3000) |
|---|---|---|
| 1 | Parallel same-email register | **Pass** — `201 + 409` (`Email ou numéro déjà utilisé`) |
| 2 | Non-owner `GET /parcels/:id` + both boundary PATCH-adjacent reads | **Pass** — `GET :id` 403, `PATCH :id/boundary` 403, `GET :id/crop-zones` 403, owner 200, missing id 404 |
| 3 | Spoofed `bidderId` | **Pass** (unit, mocked service) — service called with authenticated id; broadcast uses it; unauth → error, service untouched |
| 4 | Wrong mimetype → 400; oversized → 413 | **Pass** — `evil.txt` → 400; 6 MB jpeg (5 MB cap) → 413 |
| 5 | Unauth protected upload → 401 | **Pass** |
| 6 | GPS NaN/invalid date | **Pass** (unit, mocked repos) — `{error}` returned, `save`/`update` never called |
| 7 | Burst past throttle → 429 | **Pass** — 115× `/auth/me` burst contains 429 |
| — | Gateway unit extras | **Pass** — expert `join_zone`/`join_conversation` invalid input → `{error}` |
| — | Existing suite regression | **Pass** — no regressions |

Also live-verified (ad-hoc, not in suite): `?token=` → 401 while header auth → 200; boot with no secret anywhere → `TypeError: JwtStrategy requires a secret or key`, exit 1, port never bound. `tsc --noEmit` clean after every phase. Note: live HTTP tests need the dev backend + Postgres on `localhost:3000` (skipped gracefully otherwise); register tests self-throttle (65 s retry) due to the 5/min auth limiter.
