// Bug-audit §20-22 performance harness. Measures TTFB (header arrival) and
// response completion for the primary authenticated pages and critical APIs
// against a `next start` production build, plus a small concurrency burst.
//
// Environment: local Windows + local Postgres with the full production-equivalent
// datasets (IndianInstitution 73,969; University 20; Career 289). Network is
// loopback. Results are honest numbers, not browser Web Vitals (see §36.12 /
// §32-E notes).
//
// Usage: node scripts/performance/measure.mjs  (server must be running on PORT)
import { performance } from "node:perf_hooks";

const BASE = process.env.BENCH_BASE || "http://127.0.0.1:3055";
const EMAIL = process.env.BENCH_EMAIL || "student1@demo.techgemini.local";
const PASSWORD = process.env.BENCH_PASSWORD || "DemoPass2026!";

const jar = new Map();

function cookieHeader() {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
}

function captureCookies(res) {
  const setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get("set-cookie")].filter(Boolean);
  for (const sc of setCookie) {
    const pair = sc.split(";")[0];
    const idx = pair.indexOf("=");
    if (idx === -1) continue;
    const name = pair.slice(0, idx).trim();
    const value = pair.slice(idx + 1).trim();
    if (name && value !== "deleted") jar.set(name, value);
  }
}

async function request(path, opts = {}, consume = true) {
  const t0 = performance.now();
  let res;
  try {
    res = await fetch(BASE + path, {
      ...opts,
      redirect: "manual",
      headers: {
        ...(opts.headers || {}),
        cookie: cookieHeader(),
      },
    });
  } catch (err) {
    return { error: String(err?.message || err), headerMs: -1, bodyMs: -1 };
  }
  const headerMs = performance.now() - t0;
  let bodyMs = headerMs;
  if (consume) {
    try { await res.arrayBuffer(); } catch { /* ignore */ }
    bodyMs = performance.now() - t0;
  }
  captureCookies(res);
  return { status: res.status, headerMs, bodyMs };
}

async function login() {
  const csrf = await fetch(BASE + "/api/auth/csrf", { headers: { cookie: cookieHeader() } });
  captureCookies(csrf);
  const { csrfToken } = await csrf.json();

  const params = new URLSearchParams();
  params.set("csrfToken", csrfToken);
  params.set("email", EMAIL);
  params.set("password", PASSWORD);
  params.set("json", "true");
  params.set("redirect", "false");

  const res = await fetch(BASE + "/api/auth/callback/credentials", {
    method: "POST",
    redirect: "manual",
    headers: {
      cookie: cookieHeader(),
      "content-type": "application/x-www-form-urlencoded",
      referer: BASE + "/auth/login",
      origin: BASE,
    },
    body: params.toString(),
  });
  captureCookies(res);
  const text = await res.text();
  if (!jar.has("__Secure-next-auth.session-token") && !jar.has("next-auth.session-token") && !jar.has("__Host-next-auth.session-token")) {
    throw new Error(`Login failed (status ${res.status}): ${text.slice(0, 200)}`);
  }
}

function summarize(label, samples) {
  if (samples.length === 0) return;
  const sorted = [...samples].sort((a, b) => a - b);
  const pct = (p) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  console.log(
    `${label.padEnd(46)} n=${String(samples.length).padStart(3)} p50=${pct(50).toFixed(0).padStart(5)}ms  p95=${pct(95).toFixed(0).padStart(5)}ms  p99=${pct(99).toFixed(0).padStart(5)}ms  avg=${avg.toFixed(0).padStart(4)}ms`
  );
}

async function sample(path, opts = {}, count = 30) {
  const warm = await request(path, opts);
  if (warm.error) return { error: warm.error, status: warm.status };
  const samples = [];
  const skipped = {};
  for (let i = 0; i < count; i++) {
    const r = await request(path, opts);
    if (r.error) return { error: r.error, status: r.status };
    if (r.status >= 200 && r.status < 300) {
      samples.push(r.bodyMs);
    } else {
      skipped[r.status] = (skipped[r.status] || 0) + 1;
    }
  }
  return { samples, skipped };
}

async function burst(path, opts = {}, rounds = 5, concurrency = 10) {
  const all = [];
  let skipped = 0;
  for (let r = 0; r < rounds; r++) {
    const round = await Promise.all(
      Array.from({ length: concurrency }, () => request(path, opts))
    );
    for (const x of round) {
      if (x.status >= 200 && x.status < 300) all.push(x.bodyMs);
      else skipped++;
    }
  }
  return { all, skipped };
}

async function main() {
  console.log(`Bench base: ${BASE}  user: ${EMAIL}\n`);
  await login();
  console.log("Authenticated as STUDENT.\n");

  const pageRoutes = [
    "/dashboard",
    "/career-profile",
    "/career-preferences",
    "/career-matches",
    "/assessments",
    "/college-finder",
    "/compare",
    "/mock-tests",
    "/roadmap",
    "/settings",
  ];

  // Map to accessible page paths under the (student) route group
  for (const p of pageRoutes) {
    const r = await sample(p, {}, 30);
    if (r.error) {
      console.log(`${p.padEnd(46)} ERROR ${r.status ?? ""} ${r.error}`);
      continue;
    }
    if (!r.samples.length) {
      console.log(`${p.padEnd(46)} NO 2xx SAMPLES ${JSON.stringify(r.skipped)}`);
      continue;
    }
    console.log(`${p.padEnd(46)} non-2xx: ${Object.entries(r.skipped).map(([s, n]) => `${s}(${n})`).join(" ")}`);
    summarize(`PAGE ${p}`, r.samples);
  }
  console.log("");

  const apiRoutes = [
    "/api/student/career-preferences",
    "/api/universities?page=1&limit=20",
    "/api/institutions?state=Karnataka&page=1&limit=20",
    "/api/institutions?search=engineering&page=1&limit=20",
    "/api/careers",
    "/api/tests/assignments",
    "/api/tests/assignments/progress",
    "/api/student/roadmap",
  ];

  for (const a of apiRoutes) {
    const r = await sample(a, {}, 30);
    if (r.error) {
      console.log(`${a.padEnd(46)} ERROR ${r.status ?? ""} ${r.error}`);
      continue;
    }
    if (!r.samples.length) {
      console.log(`${a.padEnd(46)} NO 2xx SAMPLES ${JSON.stringify(r.skipped)}`);
      continue;
    }
    console.log(`${a.padEnd(46)} non-2xx: ${Object.entries(r.skipped).map(([s, n]) => `${s}(${n})`).join(" ")}`);
    summarize(`API ${a}`, r.samples);
  }
  console.log("");

  // One student-university-matches call needs a careerId
  const careersRes = await (await fetch(BASE + "/api/careers", { headers: { cookie: cookieHeader() } })).json();
  const careers = Array.isArray(careersRes) ? careersRes : careersRes.careers || [];
  if (careers.length) {
    const cid = careers[0].id;
    const r = await sample(`/api/student/university-matches?careerId=${cid}&limit=10`, {}, 20);
    if (r.error) console.log(`API /api/student/university-matches ERROR ${r.status ?? ""} ${r.error}`);
    else summarize(`API university-matches (careerId=${cid.slice(0, 8)}…)`, r.samples);
  }

  // Concurrency bursts
  console.log("\nConcurrency burst (10 concurrent x 5 rounds):");
  const bursts = [
    ["/api/universities?page=1&limit=20", {}],
    ["/api/institutions?search=engineering&page=1&limit=20", {}],
    ["/api/careers", {}],
  ];
  for (const [p, opts] of bursts) {
    const { all, skipped } = await burst(p, opts);
    if (skipped) console.log(`${p.padEnd(46)} non-2xx: ${skipped} skipped`);
    summarize(`BURST ${p}`, all);
  }
}

main().then(() => {
  console.log("\nDone.");
  process.exit(0);
}).catch((err) => {
  console.error("Harness failed:", err);
  process.exit(1);
});