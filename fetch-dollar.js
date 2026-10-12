import fs from "fs";

const API_KEY = process.env.FRED_API_KEY;

// "Today" in the user's timezone (America/New_York), formatted YYYY-MM-DD
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/New_York",
});

function loadPrices() {
  try {
    const p = JSON.parse(fs.readFileSync("prices.json", "utf-8"));
    if (Array.isArray(p)) return p;
  } catch {
    // File doesn't exist yet
  }
  return [];
}

// Never fail: if FRED is unreachable, save today's record with the last
// known rate so the daily run always succeeds.
function carryForward(prices) {
  const last = prices[prices.length - 1];
  if (!last) {
    console.error("No saved data and FRED is unreachable — nothing to carry forward");
    process.exit(1);
  }
  if (last.date === today) {
    console.log(`Already saved for ${today} — skipping`);
    return;
  }
  prices.push({ date: today, dollar: last.dollar, carried: true });
  fs.writeFileSync("prices.json", JSON.stringify(prices, null, 2));
  console.log(`FRED unreachable — carried last known rate ${last.dollar} forward for ${today}`);
}

async function fetchDollar() {
  const prices = loadPrices();

  // Skip if today's date is already saved
  const last = prices[prices.length - 1];
  if (last && last.date === today) {
    console.log(`Already saved for ${today} — skipping`);
    return;
  }

  try {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DTWEXBGS&api_key=${API_KEY}&file_type=json`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.observations) {
      throw new Error("API error: " + JSON.stringify(data).slice(0, 200));
    }

    // Get last observation with valid data (not ".")
    const validObs = data.observations.filter((o) => o.value !== ".");
    const latest = validObs[validObs.length - 1];

    // Save one record per calendar day, carrying the latest known rate forward
    prices.push({ date: today, dollar: parseFloat(latest.value) });
    fs.writeFileSync("prices.json", JSON.stringify(prices, null, 2));
    console.log(
      `Saved: ${today} = ${latest.value} (FRED observation date: ${latest.date})`
    );
  } catch (e) {
    console.error("FRED fetch failed:", e.message || e);
    carryForward(prices);
  }
}

fetchDollar().catch((e) => {
  console.error(e);
  process.exit(1);
});
