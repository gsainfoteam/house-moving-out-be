import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import { InspectionSlot } from 'generated/prisma/client';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKENS_PATH = __ENV.TOKENS_PATH || 'tokens.json';

// If CONTEND_SLOT=true, all users will try to apply to the same slot (max contention).
// Otherwise, k6 spreads requests across slots to measure throughput under load.
const CONTEND_SLOT = (__ENV.CONTEND_SLOT || 'false').toLowerCase() === 'true';

// How long to wait between operations inside one iteration.
const THINK_TIME_MS = Number(__ENV.THINK_TIME_MS || '100');

// Expected "business" errors under contention / duplicates.
const ALLOW_CONFLICT =
  (__ENV.ALLOW_CONFLICT || 'true').toLowerCase() === 'true';
const ALLOW_FORBIDDEN =
  (__ENV.ALLOW_FORBIDDEN || 'true').toLowerCase() === 'true';

export const options = {
  scenarios: {
    apply_inspection: {
      executor: 'ramping-vus',
      startVUs: Number(__ENV.START_VUS || '0'),
      stages: [
        {
          duration: __ENV.RAMP_UP || '30s',
          target: Number(__ENV.TARGET_VUS || '50'),
        },
        {
          duration: __ENV.HOLD || '1m',
          target: Number(__ENV.TARGET_VUS || '50'),
        },
        { duration: __ENV.RAMP_DOWN || '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
  },
};

function readJson<P extends object>(path: string): P {
  try {
    return JSON.parse(open(path)) as P;
  } catch (e) {
    fail(
      `Failed to read JSON at ${path}. Create tokens file like tokens.example.json. Error: ${String(e)}`,
    );
  }
}

function authHeaders(token: string) {
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
}

function pickToken(tokens: string[]) {
  // Deterministic per VU; if VUs > tokens, tokens will be reused.
  const idx = (__VU - 1) % tokens.length;
  return tokens[idx];
}

function fetchActiveSlots(token: string) {
  const res = http.get(`${BASE_URL}/schedule/active`, authHeaders(token));
  const ok = check(res, {
    'GET /schedule/active status 200': (r) => r.status === 200,
  });
  if (!ok) {
    fail(
      `GET /schedule/active failed: status=${res.status} body=${JSON.stringify(res.body)}`,
    );
  }

  const body = res.json() as unknown as { inspectionSlots: InspectionSlot[] };
  const slots = body?.inspectionSlots;
  if (!Array.isArray(slots) || slots.length === 0) {
    fail(
      `No inspectionSlots found from /schedule/active. body=${JSON.stringify(body)}`,
    );
  }

  // Filter "available-ish" slots to reduce early saturation when not contending.
  const candidateSlots = slots.filter((s) => {
    const capacity = Number(s?.capacity);
    const reservedCount = Number(s?.reservedCount);
    return (
      Number.isFinite(capacity) &&
      Number.isFinite(reservedCount) &&
      reservedCount < capacity
    );
  });

  return candidateSlots.length > 0 ? candidateSlots : slots;
}

const tokens = readJson<string[]>(TOKENS_PATH);
export function setup() {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    fail(
      `TOKENS_PATH must be a JSON array of JWT strings. path=${TOKENS_PATH}`,
    );
  }

  const bootstrapToken = tokens[0];
  const slots = fetchActiveSlots(bootstrapToken);

  // Choose a single slot for contention mode (prefer the least remaining capacity to force race)
  let contendSlotUuid: string | null = null;
  if (CONTEND_SLOT) {
    const sorted = slots
      .map((s) => ({
        uuid: s.uuid,
        remaining: Number(s.capacity) - Number(s.reservedCount),
      }))
      .filter((s) => !!s.uuid && Number.isFinite(s.remaining))
      .sort((a, b) => a.remaining - b.remaining);

    contendSlotUuid = (sorted[0] || slots[0])?.uuid;
    if (!contendSlotUuid) fail('Failed to select contendSlotUuid');
  }

  return { tokens, slots, contendSlotUuid };
}

export default function (data: {
  tokens: string[];
  slots: InspectionSlot[];
  contendSlotUuid: string | null;
}) {
  const { tokens, slots, contendSlotUuid } = data;
  const token = pickToken(tokens);

  // Optional: verify token is valid (cheap sanity check).
  // Comment out if you want max throughput.
  if (__ITER % 20 === 0) {
    const me = http.get(`${BASE_URL}/user/me`, authHeaders(token));
    check(me, { 'GET /user/me status 200': (r) => r.status === 200 });
  }

  const slotUuid = CONTEND_SLOT
    ? contendSlotUuid
    : slots[(__VU + __ITER) % slots.length]?.uuid;

  if (!slotUuid) fail('slotUuid missing');

  const payload = JSON.stringify({ inspectionSlotUuid: slotUuid });
  const res = http.post(`${BASE_URL}/application`, payload, authHeaders(token));

  const isExpectedBusinessError =
    (ALLOW_CONFLICT && res.status === 409) ||
    (ALLOW_FORBIDDEN && (res.status === 403 || res.status === 401));

  check(res, {
    'POST /application success or expected error': (r) =>
      r.status === 201 || r.status === 200 || isExpectedBusinessError,
  });

  // Small think time to avoid totally unrealistic tight loops
  if (THINK_TIME_MS > 0) sleep(THINK_TIME_MS / 1000);
}
