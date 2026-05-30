# Load & Stress Testing (k6 + TypeScript)

`POST /application` enforces **per-user constraints** (e.g. one application per user), so a realistic “many users applying at once” scenario needs a **pool of JWTs for distinct users**.

## Recommended test workflow

When running load or stress tests repeatedly, follow this order to set up the environment and reset state between runs.

1. **Create a schedule in the admin dashboard** — Ensure inspection dates and slots are configured so they appear via `GET /schedule/active`.
2. **Register inspectors** — Add inspectors and link them to the schedule.
3. **Activate the schedule** — Inactive schedules may cause apply/read scenarios to behave unexpectedly.
4. **Run the stress test** — [Prepare tokens](#1-prepare-tokens), then [run k6](#2-run-docker--k6) (e.g. `apply-inspection.ts`).
5. **Reset the database** — Connect to the DB and run the SQL below to clear applications and counters.
6. **Repeat steps 4–5** — After each run, execute step 5 before running step 4 again on the same schedule and slots.

```sql
DELETE FROM inspection_application;
UPDATE inspection_slot SET reserved_count = 0;
UPDATE inspection_target SET inspection_count = 0;
```

> **Warning:** Use this SQL only on **test or staging** databases. Running it in production permanently deletes application data.

## Directory layout

| Path | Description |
| --- | --- |
| `loadtest/seed-users.ts` | Upsert test users in the DB and write JWTs to `tokens.json` |
| `loadtest/k6/apply-inspection.ts` | Load test: `GET /schedule/active` → `GET /user/me` → `POST /application` |
| `loadtest/k6/get-user.ts` | Read load test: `GET /user/me` |
| `loadtest/k6/tokens.example.json` | Example token file format |
| `loadtest/k6/tokens.json` | Actual JWT array (gitignored; created manually or via seed) |
| `loadtest/k6/users.json` | Seed metadata output (gitignored, optional) |

## 1) Prepare tokens

### Recommended: generate users and JWTs with the seed script

Run from the project root with `.env` loaded (especially `DATABASE_URL` and JWT/encryption variables).

```bash
# Default: 50 users, tokens → loadtest/k6/tokens.json
bun run loadtest:seed-users

# Examples with options
bun run loadtest/seed-users.ts --count 200 --prefix loadtest --role USER
bun run loadtest/seed-users.ts --inputPath loadtest/users-input.json
```

| CLI / env var | Default | Description |
| --- | --- | --- |
| `--count` / `SEED_USERS_COUNT` | `50` | Number of users to auto-generate (when `--inputPath` is omitted) |
| `--prefix` / `SEED_USERS_PREFIX` | `loadtest` | Prefix for email and similar identifiers |
| `--role` / `SEED_USERS_ROLE` | `USER` | `Role` enum value |
| `--tokensPath` / `SEED_USERS_TOKENS_PATH` | `loadtest/k6/tokens.json` | Output path for JWT array |
| `--outputPath` / `SEED_USERS_OUTPUT_PATH` | `loadtest/k6/users.json` | User metadata output |
| `--inputPath` / `SEED_USERS_INPUT_PATH` | (none) | JSON array of `{ name, studentNumber, email?, phoneNumber? }` |

### Manual: copy the example file

```bash
cp loadtest/k6/tokens.example.json loadtest/k6/tokens.json
# Fill the array with valid JWT strings
```

```json
["user1_jwt", "user2_jwt"]
```

## 2) Run (Docker + k6)

Default `BASE_URL` is `http://localhost:3000`. k6 v1+ and the `grafana/k6` image run **TypeScript without a separate build** (`loadtest/k6/*.ts`).

When the API runs on the host, set `BASE_URL` for Docker networking (e.g. `host.docker.internal` on macOS/Windows).

```bash
# From project root (TOKENS_PATH defaults to tokens.json beside the script)
docker run --rm -i \
  -e BASE_URL="http://host.docker.internal:3000" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/apply-inspection.ts
```

### Scripts by scenario

| Script | Scenario name | Default `TARGET_VUS` | APIs exercised |
| --- | --- | --- | --- |
| `apply-inspection.ts` | `apply_inspection` | `100` | `GET /schedule/active` (setup), `GET /user/me`, `POST /application` |
| `get-user.ts` | `get_user` | `150` | `GET /user/me` |

`get-user` example:

```bash
docker run --rm -i \
  -e BASE_URL="http://host.docker.internal:3000" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/get-user.ts
```

Each VU maps to a token via `tokens[(__VU - 1) % tokens.length]`. If VUs exceed the token count, tokens are reused.

## 3) Environment variables

### Common (ramping / thresholds)

| Variable | Default | Description |
| --- | --- | --- |
| `BASE_URL` | `http://localhost:3000` | API base URL |
| `TOKENS_PATH` | `tokens.json` | Path to JWT JSON array, **relative to the running script** (e.g. `loadtest/k6/tokens.json` on disk → set `tokens.json`, not `loadtest/k6/tokens.json`) |
| `START_VUS` | `0` | Starting VUs for ramping |
| `TARGET_VUS` | `100` (`apply-inspection`) / `150` (`get-user`) | Target VUs during ramp-up and hold |
| `RAMP_UP` | `5s` | Ramp-up duration |
| `HOLD` | `1m` | Hold at target VUs |
| `RAMP_DOWN` | `5s` | Ramp-down duration |

Built-in thresholds (both scripts):

- `http_req_failed`: `rate < 0.02`
- `http_req_duration`: `p(95) < 800`, `p(99) < 1500`

### `apply-inspection.ts` only

| Variable | Default | Description |
| --- | --- | --- |
| `CONTEND_SLOT` | `false` | If `true`, VUs apply to **one slot per gender** (each gender uses the slot with the least remaining capacity among its gender-matched slots) |
| `ALLOW_CONFLICT` | `true` | Treat `409` as an expected response (duplicate apply, slot full, etc.) |
| `ALLOW_FORBIDDEN` | `false` | If `true`, treat `401` / `403` as expected responses |

Flow summary:

1. **setup**: First token calls `GET /schedule/active` → load `inspectionSlots`. Prefer slots where `reservedCount < capacity`.
2. **VU loop**: `GET /user/me` for `gender` → only slots matching that gender.
3. **Slot pick**: `CONTEND_SLOT=true` uses the gender-specific contend slot from setup (one per `MALE` / `FEMALE`); otherwise round-robin over gender-filtered slots by VU/iteration.
4. **POST /application**: Success is `200` / `201`. With `ALLOW_*`, `409`, `401`, and `403` are not counted as k6 request failures.

## 4) Example runs

### (A) Throughput-focused — spread across slots

```bash
docker run --rm -i \
  -e BASE_URL="https://staging.example.com" \
  -e TARGET_VUS="200" \
  -e RAMP_UP="2m" \
  -e HOLD="5m" \
  -e CONTEND_SLOT="false" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/apply-inspection.ts
```

### (B) Contention / locking-focused — one slot per gender

```bash
docker run --rm -i \
  -e BASE_URL="https://staging.example.com" \
  -e TARGET_VUS="300" \
  -e RAMP_UP="30s" \
  -e HOLD="2m" \
  -e CONTEND_SLOT="true" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/apply-inspection.ts
```

### (C) `GET /user/me` read load

```bash
docker run --rm -i \
  -e BASE_URL="https://staging.example.com" \
  -e TARGET_VUS="200" \
  -e RAMP_UP="1m" \
  -e HOLD="3m" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/get-user.ts
```
