# Load & Stress Testing (k6 + TypeScript)

This project’s `POST /application` endpoint enforces **per-user constraints** (e.g., “an application already exists”),
so a realistic “many users applying at the same time” scenario requires a **pool of JWTs for distinct users**.

## 1) Prepare tokens

- Copy `loadtest/k6/tokens.example.json` to `loadtest/k6/tokens.json`
- The file must be a **JSON array of JWT strings**

```json
["user1_jwt", "user2_jwt"]
```

## 2) Run (build TS → run k6 in Docker)

Default `BASE_URL` is `http://localhost:3000`.

### Recommended: build TypeScript first

`k6` executes JavaScript, so we bundle `loadtest/k6/apply-inspection.ts` into
`loadtest/k6/dist/apply-inspection.js` via `esbuild`.

```bash
cd loadtest/k6
bun install
bun run build
cd ../..

docker run --rm -i \
  -e BASE_URL="https://staging.example.com" \
  -e TOKENS_PATH="loadtest/k6/tokens.json" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/dist/apply-inspection.js
```

### Optional: run the legacy JS script directly

```bash
docker run --rm -i \
  -e BASE_URL="https://staging.example.com" \
  -e TOKENS_PATH="loadtest/k6/tokens.json" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/apply-inspection.js
```

## 3) Key options

- **Concurrency / ramping**
  - `START_VUS` (default `0`)
  - `TARGET_VUS` (default `50`)
  - `RAMP_UP` (default `30s`)
  - `HOLD` (default `1m`)
  - `RAMP_DOWN` (default `30s`)
- **Contention mode**
  - `CONTEND_SLOT=true`: all users apply to the **same slot** (good for contention/locking/409 behavior)
  - `CONTEND_SLOT=false`: spread traffic across slots (default; good for throughput)
- **Think time**
  - `THINK_TIME_MS` (default `100`)
- **Treat expected business errors as non-failures**
  - `ALLOW_CONFLICT=true` (default `true`): allow 409 (duplicate / slot full)
  - `ALLOW_FORBIDDEN=true` (default `true`): allow 401/403 (auth / period restrictions)

## 4) Example runs

### (A) Throughput-focused (spread across slots)

```bash
docker run --rm -i \
  -e BASE_URL="https://staging.example.com" \
  -e TOKENS_PATH="loadtest/k6/tokens.json" \
  -e TARGET_VUS="200" \
  -e RAMP_UP="2m" \
  -e HOLD="5m" \
  -e CONTEND_SLOT="false" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/dist/apply-inspection.js
```

### (B) Contention / locking-focused (all into one slot)

```bash
docker run --rm -i \
  -e BASE_URL="https://staging.example.com" \
  -e TOKENS_PATH="loadtest/k6/tokens.json" \
  -e TARGET_VUS="300" \
  -e RAMP_UP="30s" \
  -e HOLD="2m" \
  -e CONTEND_SLOT="true" \
  -v "$PWD:/work" -w /work \
  grafana/k6 run loadtest/k6/dist/apply-inspection.js
```
