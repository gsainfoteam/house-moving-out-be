import http from 'k6/http';
import { check, fail } from 'k6';
import { Gender, InspectionSlot } from 'generated/prisma/client';
import { UserDto } from 'src/user/dto/res/user.dto';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKENS_PATH = __ENV.TOKENS_PATH || 'tokens.json';

// If CONTEND_SLOT=true, all users will try to apply to the same slot (max contention).
// Otherwise, k6 spreads requests across slots to measure throughput under load.
const CONTEND_SLOT = (__ENV.CONTEND_SLOT || 'false').toLowerCase() === 'true';

// Expected "business" errors under contention / duplicates.
const ALLOW_CONFLICT =
  (__ENV.ALLOW_CONFLICT || 'true').toLowerCase() === 'true';
const ALLOW_FORBIDDEN =
  (__ENV.ALLOW_FORBIDDEN || 'false').toLowerCase() === 'true';

export const options = {
  scenarios: {
    apply_inspection: {
      executor: 'ramping-vus',
      startVUs: Number(__ENV.START_VUS || '0'),
      stages: [
        {
          duration: __ENV.RAMP_UP || '5s',
          target: Number(__ENV.TARGET_VUS || '100'),
        },
        {
          duration: __ENV.HOLD || '1m',
          target: Number(__ENV.TARGET_VUS || '100'),
        },
        { duration: __ENV.RAMP_DOWN || '5s', target: 0 },
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

  const me = http.get(`${BASE_URL}/user/me`, authHeaders(token));
  if (!check(me, { 'GET /user/me status 200': (r) => r.status === 200 })) {
    fail(
      `GET /user/me failed: status=${me.status} body=${JSON.stringify(me.body)}`,
    );
  }
  const meData = me.json() as unknown as UserDto;
  const gender = meData.gender as Gender;
  if (!gender) fail('gender missing');

  const filteredSlots = slots.filter((s) => s.gender === gender);
  if (filteredSlots.length === 0) fail('No slots found for gender');

  const slotUuid = CONTEND_SLOT
    ? contendSlotUuid
    : filteredSlots[(__VU + __ITER) % filteredSlots.length]?.uuid;

  if (!slotUuid) fail('slotUuid missing');

  const payload = JSON.stringify({ inspectionSlotUuid: slotUuid });
  const moreAllowedStatus = [
    ...(ALLOW_CONFLICT ? [409] : []),
    ...(ALLOW_FORBIDDEN ? [403, 401] : []),
  ];
  const res = http.post(`${BASE_URL}/application`, payload, {
    ...authHeaders(token),
    responseCallback: http.expectedStatuses(
      { min: 200, max: 299 },
      ...moreAllowedStatus,
    ),
  });

  if (
    !check(res, {
      'POST /application success or expected error': (r) =>
        r.status === 201 ||
        r.status === 200 ||
        moreAllowedStatus.includes(r.status),
    })
  ) {
    fail(
      `POST /application failed: status=${res.status} body=${JSON.stringify(res.body)}`,
    );
  }
}
