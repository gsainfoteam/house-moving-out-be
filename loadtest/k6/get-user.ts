import http from 'k6/http';
import { check, fail } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const TOKENS_PATH = __ENV.TOKENS_PATH || 'tokens.json';

export const options = {
  scenarios: {
    get_user: {
      executor: 'ramping-vus',
      startVUs: Number(__ENV.START_VUS || '0'),
      stages: [
        {
          duration: __ENV.RAMP_UP || '5s',
          target: Number(__ENV.TARGET_VUS || '150'),
        },
        {
          duration: __ENV.HOLD || '1m',
          target: Number(__ENV.TARGET_VUS || '150'),
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

const tokens = readJson<string[]>(TOKENS_PATH);
export function setup() {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    fail(
      `TOKENS_PATH must be a JSON array of JWT strings. path=${TOKENS_PATH}`,
    );
  }

  return { tokens };
}

export default function (data: { tokens: string[] }) {
  const { tokens } = data;
  const token = pickToken(tokens);

  const me = http.get(`${BASE_URL}/user/me`, authHeaders(token));
  if (!check(me, { 'GET /user/me status 200': (r) => r.status === 200 })) {
    fail(
      `GET /user/me failed: status=${me.status} body=${JSON.stringify(me.body)}`,
    );
  }
}
