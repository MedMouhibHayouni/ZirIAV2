# ZirIA — Master Security, Quality & Performance Audit

**Date:** 2026-09-10 · **Scope:** `backend/` (NestJS 11), `frontend/` (Angular 21), `ai-vision/`, `mlops/`, `mobile/` · **Method:** SAST + manual OWASP review + live DAST vs `http://localhost:3000` only
**Auditor:** opencode (Elite Cybersecurity Auditor / Senior QA / Performance Engineer)

> Secret values are intentionally masked in this report. Do not paste real keys into chat, tickets, or docs.

---

## 1. Executive Summary & Health Scores

**Stack discovered:** NestJS 11 + TypeORM + PostgreSQL + Redis-optional + Socket.IO + JWT (15m access / 7d refresh) + Cloudinary + Firebase Admin + Gemini AI + Open-Meteo. Frontend Angular 21 + Tailwind + Leaflet + socket.io-client + Three.js. Global guards: `ThrottlerGuard` (100 req/min), `ValidationPipe{whitelist, forbidNonWhitelisted, transform}`, `helmet()`, `compression()`, strict CORS allowlist (`localhost:4200`, `localhost:3001`, `ziria-v2.vercel.app`), Swagger at `/api`.

| Pillar | Score | Verdict |
|---|---|---|
| **Security** | **42/100 — RED** | Committed live secrets + forgeable WS JWT fallback + BOLA/IDOR gaps. **Do not deploy to prod before P0 fixes.** |
| **Stability** | **55/100 — AMBER** | Good input validation; but race conditions (wallet/auction/stock/storage), in-memory refresh store, `synchronize:true`, swallowed errors. |
| **Performance** | **78/100 — GREEN (local)** | `GET /` p50 1ms / p95 1ms / p99 2ms (n=200); `CONC100 /api` 100% 200 in 44ms; rate-limit verified working. AI/DB-backed routes + 50 MB limits untested under load — treat as unproven. |

**What works well (keep):** `ValidationPipe` rejects short passwords, bad roles, `isAdmin/verified` mass-assignment, malformed emails (all verified live → 400); unauth → 401 correctly; `helmet` headers present (`X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`); per-route `@Throttle(5/min)` on auth; global throttler returns 429 under burst (16×429/115 burst; 50×429 under sustained flood — limiter works).

**Top 5 risks:**
1. `backend/.env` containing **live keys is git-tracked** (`git ls-files` shows `backend/.env`) and `NOT-IGNORED` — 4× Gemini keys, Firebase private key, Cloudinary key/secret, JWT secret all in history.
2. WS gateways accept `JWT_SECRET || 'ZIRIA_SUPER_SECRET'` fallback — forged WS tokens if env missing (4 files).
3. JWT also accepted via `?token=` query string — leaks in logs/proxy/history.
4. BOLA: `PATCH /parcels/:id/boundary`, `PATCH /crop-zones/:zoneId/boundary`, `GET /parcels/:id`, auction `placeBid{bidderId}` trust client identity.
5. `npm audit`: backend **37 vulns (1 critical, 14 high)**, frontend **40 vulns (1 critical, 24 high)** — `axios`, `@grpc/grpc-js`, `websocket-driver`, `body-parser` lead.

---

## 2. High-Severity Security Findings

### P0-1 — Live secrets committed to git (`backend/.env` tracked, no .gitignore rule)
- **CVSS 9.8 (Critical).** Location: `backend/.env:1-24` (tracked per `git ls-files`; `git check-ignore` → NOT-IGNORED). Contents: 4× `GOOGLE_GEMINI_API_KEY*`, `FIREBASE_PRIVATE_KEY` (full RSA), `CLOUDINARY_API_KEY/SECRET`, `JWT_SECRET`, DB creds. History retains them even if deleted now.
- **Fix:**
  ```bash
  # 1. rotate EVERY key NOW (Gemini ×4, Firebase SA, Cloudinary, JWT_SECRET, DB password)
  # 2. untrack + ignore + purge history
  git rm --cached backend/.env
  echo "backend/.env" >> .gitignore
  echo ".env" >> backend/.gitignore
  git add .gitignore backend/.gitignore && git commit -m "security: untrack .env"
  # 3. rewrite history (coordinate team, force-push):
  git filter-repo --path backend/.env --invert-paths  # or BFG Repo-Cleaner
  # 4. enforce: pre-commit secret scan (gitleaks) + GitHub push protection + env via vault (Doppler/Infisical/AWS SM)
  ```

### P0-2 — Hardcoded JWT fallback lets anyone forge WebSocket tokens
- **CVSS 9.1 (Critical).** `backend/src/drivers/gps-tracking.gateway.ts:62`, `backend/src/ai/gateways/expert.gateway.ts:34`, `backend/src/notifications/notification.gateway.ts:21`, `backend/src/land/land-auction.gateway.ts:35`: `process.env.JWT_SECRET || 'ZIRIA_SUPER_SECRET'`.
- **Fix (all 4):** `const secret = configService.getOrThrow('JWT_SECRET'); this.jwtService.verify(token,{secret})` + fail-fast on boot if missing. Never ship a default secret.

### P0-3 — BOLA/IDOR: parcel boundary + auction bidder spoofing
- **CVSS 8.2 (High).** `backend/src/parcels/parcels.controller.ts:71` (`PATCH :id/boundary`), `:102` (`PATCH crop-zones/:zoneId/boundary`), `:59` (`GET :id`), `:84` (`GET :id/crop-zones`) take IDs with no `req.user` ownership check; `backend/src/land/land-auction.gateway.ts:60` `placeBid({bidderId})` trusts client-supplied ID.
- **Fix:** pass `@CurrentUser() user` into service; `findOne({where:{id, owner_id:user.id}})` (or admin/coop-membership override → 403 otherwise); gateway: use `client.data.userId` from verified JWT, ignore client `bidderId`.

### P1-1 — JWT via query string (`?token=`)
- **CVSS 7.4 (High).** `backend/src/auth/strategies/jwt.strategy.ts:27` `ExtractJwt.fromExtractors([fromAuthHeader, req=>req?.query?.token])` — tokens leak into access logs, proxy logs, browser history.
- **Fix:** `jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken()` only. Rotate JWT_SECRET after deploy.

### P1-2 — Vulnerable dependencies (measured `npm audit`)
- Backend: **37 (1 crit / 14 high / 19 mod / 3 low)** over 1040 deps. Frontend: **40 (1 crit / 24 high / 11 mod / 4 low)** over 685 deps.
- Key items (all `fix available via npm audit fix`):
  | Package | Severity | Advisory | Fix |
  |---|---|---|---|
  | `websocket-driver <=0.7.4` (both) | **Critical** | GHSA-mp7j-qc5w-4988 (compression limit bypass), GHSA-xv26-6w52-cph6 (length-header corruption) | `npm audit fix` / bump `socket.io` chain |
  | `axios 1.0.0–1.17.0` | High (×~18 GHSA incl. prototype-pollution RCE gadgets GHSA-3w6x-2g7m-8v23, GHSA-35jp-ww65-95wh; ReDoS; proxy-auth leak) | Multiple | Upgrade axios to patched `^1.13.x`+ and audit `parseReviver/proxy` usage |
  | `@grpc/grpc-js 1.14.0–1.14.3` | High | GHSA-5375-pq7m-f5r2, GHSA-99f4-grh7-6pcq (malformed-request/compressed-message server crash) | `npm audit fix` |
  | `body-parser 2.0.0–2.2.2` | High | GHSA-v422-hmwv-36x6 (invalid limit disables size enforcement) — compounds the 50 MB limit below | Upgrade; then lower limits |
  | `@babel/core`, `@opentelemetry/*`, `@protobufjs/utf8`, `@tootallnate/once`, `baseline-browser-mapping` | Low–Moderate | Various DoS/info | `npm audit fix` |
- **Fix:** `cd backend && npm audit fix && npm test`; repeat in `frontend/`; add Dependabot + `npm audit --audit-level=high` to CI (fail build).

### P1-3 — 50 MB global JSON body + 50 MB in-RAM Multer uploads (DoS/OOM)
- **CVSS 7.5 (High).** `backend/src/main.ts:19-20` `express.json({limit:'50mb'})`; `backend/src/upload/upload.controller.ts:135` `memoryStorage(), limits:50MB` (10 concurrent audio = 500 MB heap).
- **Fix:** default `express.json({limit:'1mb'})`; raise only on explicit media routes; switch Multer to `diskStorage`/stream-to-Cloudinary; cap audio `10–15 MB`; add per-route `@Throttle`.

### P1-4 — Unrestricted file uploads (type/size) → malicious content / Cloudinary $$ abuse
- **CVSS 7.1 (High).** `backend/src/ai/ai.controller.ts:96` `FileInterceptor('file')`, `backend/src/marketplace/marketplace.controller.ts:160,285` `FilesInterceptor(...,8)`, `backend/src/upload/upload.controller.ts:69` no `fileFilter/limits`; `POST /upload/public/plant:93` unauthenticated.
- **Fix:** `FileInterceptor('file',{limits:{fileSize:5*1024*1024}, fileFilter:(req,f,cb)=>/image\/(jpeg|png|webp)/.test(f.mimetype)?cb(null,true):cb(new BadRequestException('type'),false)})`; require auth or captcha+`@Throttle(5/min)` on public upload.

### P1-5 — Wildcard WebSocket CORS
- **CVSS 6.5 (Medium).** `backend/src/ai/gateways/expert.gateway.ts:16`, `backend/src/land/land-auction.gateway.ts:17` `cors:{origin:'*'}`; `gps-tracking.gateway.ts:36`, `notification.gateway.ts:6` `cors:true`.
- **Fix:** `cors:{origin:['http://localhost:4200','http://localhost:3001','https://ziria-v2.vercel.app'], credentials:true}` mirroring `main.ts:26`.

### P2 — Auth/session design weaknesses (Medium, exploit-chained)
- `auth.service.ts:20,134` refresh tokens in **in-memory `Map`** (lost on restart, diverges across replicas, never expires, logout only local) — move to Redis/DB hashed + rotation + `expires_at` sweep.
- `auth.service.ts:165` `refreshToken()` verifies signature but never checks `decoded.sub === userId` — add check.
- `auth.dto.ts` allows `role` client-chosen incl. `ADMIN` at register (live probe: `SUPERADMIN` rejected by enum ✔, but `ADMIN` accepted) — force default `FARMER`, require admin approval for privileged roles.
- Register race: check-then-insert email/phone, raw 500 on conflict — add DB unique constraints + catch `23505 → 409`.
- `RolesGuard` fails open when no `@Roles()` (`return true`); many controllers use only `JwtAuthGuard` — add `RolesGuard+@Roles()` where role-restricted.
- Public surface without throttle: `marketplace public/*`, `supplier-vitrine`, `supplier-subscription(plans)`, `zirfeed SSE stream:14`, `name-dictionary:7` (missing guard entirely) — add `@Throttle` + cache; guard or mark `@Public()` explicitly.
- Stored-XSS: `messages.content`, `zirfeed/zirpulse/marketplace.description`, `expert.sendMessage` have no sanitizer — sanitize HTML on save (DOMPurify) + keep `helmet`.
- Raw SQL interpolation: `admin.service.ts:111` ``LIMIT ${limit} OFFSET ${offset}`` — parseInt-whitelist + parameterize; `ambassador.service.ts:91` `IN (...)` — build indexed params from validated UUIDs only.
- `bootstrap()` floating promise (`main.ts:108`); seed files log demo passwords (`seed-storage.ts:230`, `seed.ts:2535,144`), `auth.service:99,154` logs PII emails — `bootstrap().catch(exit 1)`; delete password logs; structured `Logger` with redaction.

---

## 3. Code Quality & Edge-Case Bugs (with patches)

> Verified by static sweep + live probes. Validation layer is genuinely good (see §4); below are the remaining correctness/concurrency gaps, ordered by blast radius.

### A. Race conditions — lost updates / double-spend / overbooking (fix with tx + `pessimistic_write`)
| # | Location | Bug | Patch |
|---|---|---|---|
| A1 | `finance/wallet.service.ts:52-57,144-147` | `creditPending/creditAmbassador`: `getOrCreateWallet` (findOne+save, no lock) then `balance+=net; save` — concurrent credits lost | Wrap in tx; `findOne({lock:{mode:'pessimistic_write'}})` or atomic `increment()` + unique `reference_id` |
| A2 | `marketplace/marketplace.service.ts:414-431` | `expressInterest`: check ACTIVE → set PENDING + save connection, no tx — two buyers both win | `dataSource.transaction` + `findOne(Listing,{lock:'pessimistic_write'})` + partial unique index on pending |
| A3 | `marketplace.service.ts:488-500` | `stockUpdateFn`: `quantity-=qty; save`, clamps `<0→0` masking oversell | Lock row; `if (qty < needed) throw Conflict`; remove clamp |
| A4 | `equipment/equipment.service.ts:82-112,226-237` | Overlap check `getRawOne()` then `save` — double-book same tractor | Tx + `SELECT … FOR UPDATE` on Equipment + Postgres `EXCLUDE USING gist (equipment_id WITH =, daterange WITH &&)` |
| A5 | `supplier/supplier-stock.service.ts:39-63` | `manualAdjustment`: find → save movement → set `stock_qty`, non-atomic — ledger/product diverge on crash | Single tx locking Product, save both |
| A6 | `supplier-purchase.service.ts:79-137` | `receivePurchaseOrder` loops find+save per item, no tx/idempotency — retry double-counts | Single tx + lock + `if (status===RECEIVED) throw Conflict` |
| A7 | `storage/storage.service.ts:445-512,412-440` | Capacity `SUM` then save (overbooking); `amount_paid+=dto.amount` lost-update | Tx + `FOR UPDATE` on StorageRoom + re-check; payments via `increment()` or `@VersionColumn` |
| A8 | `land/land-auction.service.ts:114-132` | `acceptBestBid/cancelAuction`: plain find+save, ignores ownerId/status | Tx + lock + `if(status!==ACTIVE) throw Conflict` + `if(owner_id!==ownerId) throw Forbidden` (copy `placeBid:36-104` pattern) |
| A9 | `zirfeed/zirfeed.service.ts:891-914` | follow/unfollow read-then-save + `follower_count±1`, no tx — corrupt counts | Tx + lock page + unique `(follower,following_page)` |
| A10 | `subscriptions/subscription.service.ts:99-133` | `checkLimit` outside tx — quota bypass under concurrency | Re-check inside creation tx / DB count trigger |

### B. Resource leaks — `synchronize`, pooling, Maps, timers, sockets
- `app.module.ts:340` `synchronize: NODE_ENV!=='production'` — one mis-set env var drops prod tables. **Patch:** `synchronize:false` always + `migrationsRun:true`.
- `app.module.ts:212-343` no pool sizing, `ssl:false`, dev query-logging. **Patch:** `extra:{max:20,min:2,idleTimeoutMillis:30000,connectionTimeoutMillis:5000}`, `ssl` via `DB_SSL` in prod, `logging:['error','migration']`.
- `app.module.ts:181-200` in-memory `CacheModule{ttl:30000}` unbounded global. **Patch:** Redis in prod or `lru-cache{max:1000}`.
- `transactions-coordinator.service.ts:118-127` `createQueryRunner()` without `connect()`, `release()` only on success. **Patch:** `await qr.connect(); try{…}finally{await qr.release()}`.
- `idempotency.interceptor.ts:29,34` module-level `Map` + `setInterval(cleanup,5min)` never cleared. **Patch:** Redis `SET NX EX 60` or `timer.unref()` + `onModuleDestroy{clearInterval}` + LRU cap.
- `ai/services/gemini.service.ts:35-44` recursive `setTimeout(midnight)` + in-memory `dailyExhaustedKeys:Set`. **Patch:** persist in Redis + `@Cron('0 0 * * *')` + clear on destroy.
- `gps-tracking.gateway.ts:44`, `notification.gateway.ts:12`, `expert.gateway.ts:25` unbounded `Map<user,sockets[]>` + per-message `eventRepo.save`. **Patch:** cap 5 sockets/user (evict oldest), heartbeat eviction, batch GPS inserts (5 s buffer), validate `auth?.token`.

### C. Swallowed errors / unhandled rejections / null derefs
- `.catch(()=>[])` silences DB failures: `land-auction.service.ts:135-147`, `admin.service.ts:60,178,207,228,276,349,411,461,526` — remove or `Logger.error` + throw `ServiceUnavailable`.
- Fire-and-forget: `notification.service.ts:44-62,104-112` bare `.then(Promise.all(sendPush))`; gateway `sendToUser` throws pre-init — `await Promise.allSettled` + return summary; make `sendToUser` no-throw.
- `.catch(console.error)` hides contract/invoice failure while order succeeds (`equipment.service:260`, `supplier.service:208,211,314`, `supplier-invoice:134,234,387`) — outbox table + retry queue.
- `gps-tracking.gateway.ts:100-139` no try/catch around `driverRepo.update/eventRepo.save` — validate `Number.isFinite(lat/lng)`, `!isNaN(Date.parse(recorded_at))`, else return `{error}`.
- `expert.gateway.ts:66-90` `governorate.toLowerCase()` on null/object; `conversation_id_undefined` — zod-validate + `if(typeof g!=='string'\|\|!g) return {error}`.
- `marketplace.service.ts:470-473` `lng\|\|sellerLng` undefined → bogus `(0,0)` transport request — `if(!Number.isFinite(...)) throw BadRequest`.
- `storage.service.ts:218` `room.room_type.toLowerCase()` on null — `(room.room_type\|\|'').toLowerCase()`.
- `zirfeed.service.ts:846` `sender?.name` → `"undefined a réagi"` — fallback `'Un utilisateur'` + `if(!item) continue`.

### D. Test coverage (measured)
- Backend: **1 unit spec** (`app.controller.spec.ts`) + 1 e2e stub (`test/app.e2e-spec.ts`); frontend: no spec run in audit. Dozens of modules (auth, wallet, auction, stock, storage, upload) have **zero tests** — every race above is unguarded.
- **Minimum tests to add first (jest + supertest):** register conflict-409 ×2 (parallel same-email), refresh reuse → 401, BOLA parcel read/patch as non-owner → 403, double `expressInterest` → exactly 1 PENDING, concurrent wallet credits → exact sum, auction double-accept → 409, oversell stock → 409, upload wrong mimetype/6 MB → 400/413, unauth upload → 401, GPS NaN/Invalid Date → 400-shaped `{error}`, throttle burst → 429 present.

---

## 4. Load Testing Benchmark Results (localhost only — never prod)

Existing `k6_ziria_loadtest.js` targets 1000 VUs (`30s→1000, 1m@1000`) with `p95<500ms` / `err<1%` — **not executed**: unsafe against a dev DB + AI-billed `/agent/message` route. Instead ran a safe local probe (`C:/Users/mouhi/AppData/Local/Temp/opencode/ziria_probe.js`, Node fetch, localhost:3000):

**Input-validation probes (all correct):**
| Probe | Result |
|---|---|
| `GET /auth/me` no token | 401 `{Token invalide ou expiré}` ✔ |
| `POST /auth/register` short pw | 400 `password must be longer than 8` ✔ |
| mass-assign `isAdmin,verified` | 400 `property … should not exist` ✔ (whitelist works) |
| `role: SUPERADMIN` | 400 `role must be one of …` ✔ |
| SQLi / XSS emails | 400 `email must be an email` ✔ |
| `GET /parcels/1' OR '1'='1` | 401 before DB (auth-first) ✔ |
| `..%2F..%2Fetc%2Fpasswd` | 404 ✔ |
| 2 MB payload login | 400 (validation held; note 50 MB cap still too high) |

**Rate limiting — VERIFIED ✔:**
- `BURST115 /auth/me`: **99×401 + 16×429** — limiter triggers within window.
- Sustained flood `CONC50 GET /`: **50×429, 0×5xx** — shed load, no crash.
- Headers live: `X-RateLimit-Limit: 100`, `X-RateLimit-Remaining`, `X-RateLimit-Reset: 60`.

**Latency/throughput (local, unauthenticated light routes):**
- `LAT200 GET /`: **min 0 · p50 1 · p95 1 · p99 2 · max 3 ms** (n=200 sequential).
- `CONC50 /`: 17 ms wall, 0 ok (all 429 — window exhausted, proves throttle, not perf ceiling).
- `CONC100 /api` (Swagger): 44 ms wall, **100/100 ×200, 0×429, 0×5xx**.
- 5xx observed during tests: **0**.

```
latency ms (GET / n=200):  min 0 | p50 1 | p95 1 | p99 2 | max 3
CONC50  /    : 17ms wall | 429:50 (throttled, correct)
CONC100 /api : 44ms wall | 200:100 (all served)
```

**Limits of this benchmark (honest):** authenticated, DB-heavy (`/parcels/my`), AI (`/agent/message`, Gemini-billed), upload, and WS paths were **not** load-tested (no seed user + cost risk). Claims only cover light routes. Before prod: seed a staging DB, mint a test JWT, then run the repo k6 file capped (`--vus 50 --duration 2m`, `p95<500`) against staging, plus a 10→100 VU ramp on `/auth/login→/parcels/my` measuring p95/p99 + 5xx + 429 rate.

---

## 5. Actionable Deployment Checklist (in order — do not skip)

- [ ] **P0-1 Secrets:** rotate ALL keys (Gemini ×4, Firebase SA, Cloudinary, JWT, DB); `git rm --cached backend/.env`; add `.gitignore` rules; purge history (`filter-repo`/BFG); enable push protection + gitleaks pre-commit; move runtime secrets to vault. *Blocks everything.*
- [ ] **P0-2 WS JWT:** remove `|| 'ZIRIA_SUPER_SECRET'` in 4 gateways → `getOrThrow('JWT_SECRET')`; redeploy; rotate JWT secret.
- [ ] **P0-3 BOLA:** enforce owner/admin checks on parcels `GET :id`, `:id/crop-zones`, both boundary PATCHes; gateway `placeBid` uses server `userId`; add regression tests (non-owner → 403).
- [ ] **P1 deps:** `npm audit fix` backend + frontend; pin patched axios/grpc/socket chain; CI gate `npm audit --audit-level=high`; enable Dependabot.
- [ ] **P1 payload/uploads:** `1 MB` default JSON; Multer disk/stream, `5 MB` images / `15 MB` audio, `fileFilter` allowlists; auth/captcha + throttle on `public/plant`.
- [ ] **P1 JWT-via-query:** header-only extraction; remove `req.query.token`.
- [ ] **P1 CORS/WS:** explicit origin allowlists on all 4 gateways; remove `cors:true/*`.
- [ ] **P2 sessions:** refresh tokens → Redis/DB hashed + rotation + expiry sweep; `decoded.sub===userId` check; default register role `FARMER`; unique DB constraints + `23505→409`.
- [ ] **Races:** tx + `pessimistic_write` for wallet/marketplace/equipment/stock/purchase/storage/auction/follow (table §3A); add exclusion/unique indexes.
- [ ] **Leaks/resilience:** `synchronize:false` + migrations; pool sizing + prod SSL; Redis cache; fix QueryRunner release; unref/clear timers; cap socket maps; `bootstrap().catch`; remove password/PII logs.
- [ ] **XSS/output:** server-side HTML sanitize on message/feed/description writes; keep helmet+CSP.
- [ ] **Tests:** add the 12 minimum tests (§3D); require green `jest + e2e` in CI; target ≥60% on finance/auction/auth before release.
- [ ] **Perf gate:** staging k6 ramp 10→100 VUs on login→parcels→agent (mocked AI), assert `p95<500ms`, `err<1%`, 429 present on flood, 0×5xx; `dist/` + `node_modules/` untracked from git (`git rm -r --cached backend/dist`), served as build artifact only.
- [ ] **Go-live:** `NODE_ENV=production`, Sentry DSN + `tracesSampleRate ≤0.2`, log level `warn/error`, DB backups + restore drill, rate-limit dashboard alert on 429 spike, incident runbook for key rotation.

*Safety note: all dynamic tests ran against `localhost` per the safety rule. No production URL was probed or load-tested.*
