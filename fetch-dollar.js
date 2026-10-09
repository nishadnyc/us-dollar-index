import fs from "fs";

// ICE US Dollar Index (DXY) via Yahoo Finance — free, no API key.
// Schedule: every 6h on weekdays, once daily on weekends (see workflow).
// Each run backfills any 15m bars newer than the last saved record,
// so delayed or skipped runs never leave gaps.
//
// Resilience: this run NEVER fails because Yahoo hiccuped. If the API is
// unreachable or rate-limited, the last known value is carried forward
// into every missing 15m slot up to the latest closed bar (flagged
// carried:true) — prices.json always gets a fresh row and the dashboard
// keeps showing the last known rate.

const SYMBOL = "DX-Y.NYB";
// query2 first: query1 429s Node's TLS fingerprint, query2 does not.
// Both hosts serve the same chart API.
const HOSTS = ["query2.finance.yahoo.com", "query1.finance.yahoo.com"];
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
const FILE = "prices.json";
const BAR_MS = 15 * 60 * 1000;

// Format an epoch-ms instant as ISO 8601 in America/New_York,
// e.g. "2026-10-06T14:30:00-04:00"
function etISO(epochMs, gmtoffset) {
  const wall = new Date(epochMs + gmtoffset * 1000);
  const p = (n) => String(n).padStart(2, "0");
  const sign = gmtoffset < 0 ? "-" : "+";
  const a = Math.abs(gmtoffset);
  const off = `${sign}${p(Math.floor(a / 3600))}:${p(Math.floor((a % 3600) / 60))}`;
  return (
    `${wall.getUTCFullYear()}-${p(wall.getUTCMonth() + 1)}-${p(wall.getUTCDate())}` +
    `T${p(wall.getUTCHours())}:${p(wall.getUTCMinutes())}:${p(wall.getUTCSeconds())}${off}`
  );
}

const etYMD = (epochMs, gmtoffset) => etISO(epochMs, gmtoffset).slice(0, 10);

// Day of week (0=Sun..6=Sat) for an ET calendar date
function etDow(epochMs, gmtoffset) {
  return new Date(etYMD(epochMs, gmtoffset) + "T12:00:00Z").getUTCDay();
}

const sleep = (s) => new Promise((r) => setTimeout(r, s * 1000));

async function fetchChart() {
  const path = `/v8/finance/chart/${SYMBOL}?interval=15m&range=5d`;
  let lastErr = "";
  for (const host of HOSTS) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      const res = await fetch(`https://${host}${path}`, {
        headers: { "User-Agent": UA },
      });
      if (res.ok) return res.json();
      lastErr = `https://${host} -> HTTP ${res.status}`;
      console.error(`Yahoo API: ${lastErr} (attempt ${attempt}/3)`);
      if (res.status === 429 || res.status >= 500) await sleep(60 * attempt);
      else break; // don't retry 4xx other than 429
    }
  }
  console.error(`Yahoo API unreachable: ${lastErr} — carrying last known value forward`);
  return null;
}

function loadPrices() {
  try {
    const p = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    if (Array.isArray(p)) return p;
  } catch {
    // fresh start
  }
  return [];
}

// GMT offset in seconds encoded in a "...+HH:MM"/"...-HH:MM" timestamp
function offsetFromISO(iso) {
  const m = /([+-])(\d{2}):(\d{2})$/.exec(iso);
  if (!m) return null;
  const sec = +m[2] * 3600 + +m[3] * 60;
  return m[1] === "-" ? -sec : sec;
}

// Fallback: current America/New_York GMT offset in seconds
function etOffsetNow(nowMs) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(
    dtf.formatToParts(new Date(nowMs)).map((p) => [p.type, p.value])
  );
  const asUTC = Date.UTC(
    +parts.year,
    +parts.month - 1,
    +parts.day,
    parts.hour === "24" ? 0 : +parts.hour,
    +parts.minute,
    +parts.second
  );
  return Math.round((asUTC - nowMs) / 1000);
}

// Latest 15m bar that has fully closed, as epoch ms
function latestClosedBarMs(nowMs, gmtoffset) {
  return (
    Math.floor((nowMs + gmtoffset * 1000) / BAR_MS) * BAR_MS - gmtoffset * 1000
  );
}

function savePrices(prices, fresh) {
  const merged = prices
    .concat(fresh)
    .sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
  fs.writeFileSync(FILE, JSON.stringify(merged, null, 2));
  console.log(
    `Added ${fresh.length} record(s): ${fresh[0].time} -> ${fresh[fresh.length - 1].time}`
  );
}

// Carry-forward path: fill every missing 15m slot with the last known
// value so the run succeeds even when Yahoo is down or rate-limiting.
function carryForward(prices) {
  if (!prices.length) {
    console.error("No saved data and Yahoo is unreachable — nothing to carry forward");
    process.exit(1);
  }
  const last = prices[prices.length - 1];
  let gmtoffset = offsetFromISO(last.time);
  if (gmtoffset == null) gmtoffset = etOffsetNow(Date.now());
  const closedMs = latestClosedBarMs(Date.now(), gmtoffset);
  const lastMs = Math.max(...prices.map((p) => Date.parse(p.time)));
  const seen = new Set(prices.map((p) => p.time));
  const fresh = [];
  for (let ms = lastMs + BAR_MS; ms <= closedMs; ms += BAR_MS) {
    const time = etISO(ms, gmtoffset);
    if (seen.has(time)) continue;
    seen.add(time);
    fresh.push({ time, dollar: last.dollar, carried: true });
  }
  if (!fresh.length) {
    console.log("Already up to date — nothing new");
    return;
  }
  console.log(
    `Yahoo unavailable: carried last known value ${last.dollar} across ${fresh.length} slot(s)`
  );
  savePrices(prices, fresh);
}

async function main() {
  const prices = loadPrices();
  const data = await fetchChart();
  if (!data) {
    carryForward(prices);
    return;
  }
  const result = data && data.chart && data.chart.result && data.chart.result[0];
  if (!result || !result.timestamp) {
    console.error("Yahoo API error:", JSON.stringify(data).slice(0, 300));
    carryForward(prices); // bad payload — treat like an outage
    return;
  }

  const gmtoffset = result.meta.gmtoffset; // e.g. -14400 (EDT)
  const closes = (result.indicators && result.indicators.quote[0].close) || [];
  const stamps = result.timestamp || [];

  // Drop the still-forming live bar (its timestamp isn't on a 15m boundary);
  // the next run picks it up once finalized.
  const lastIdx = stamps.length - 1;
  const closedStamps =
    lastIdx >= 0 && stamps[lastIdx] % 900 !== 0
      ? stamps.slice(0, lastIdx)
      : stamps;

  const seen = new Set(prices.map((p) => p.time));
  const lastMs = prices.length
    ? Math.max(...prices.map((p) => Date.parse(p.time)))
    : 0;

  const fresh = [];

  // Backfill: append every 15m bar newer than the last saved record
  for (let i = 0; i < closedStamps.length; i++) {
    const c = closes[i];
    if (c == null || !isFinite(c)) continue;
    const ms = closedStamps[i] * 1000;
    if (ms <= lastMs) continue;
    const time = etISO(ms, gmtoffset);
    if (seen.has(time)) continue;
    seen.add(time);
    fresh.push({ time, dollar: Math.round(c * 1000) / 1000 });
  }

  // Weekend daily snapshot: markets are closed, so record one row per
  // weekend day carrying the last close forward (keeps daily continuity)
  const nowMs = Date.now();
  const todayYMD = etYMD(nowMs, gmtoffset);
  const dow = etDow(nowMs, gmtoffset);
  const all = prices.concat(fresh);
  const hasToday = all.some((p) => p.time.slice(0, 10) === todayYMD);
  if ((dow === 0 || dow === 6) && !hasToday && all.length) {
    const latest = all[all.length - 1];
    const noonMs = Date.parse(`${todayYMD}T12:00:00Z`) - gmtoffset * 1000;
    const snap = { time: etISO(noonMs, gmtoffset), dollar: latest.dollar };
    if (!seen.has(snap.time)) {
      fresh.push(snap);
      console.log(`Weekend snapshot: ${snap.time} = ${snap.dollar}`);
    }
  }

  if (!fresh.length) {
    console.log("Already up to date — nothing new");
    return;
  }

  savePrices(prices, fresh);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
