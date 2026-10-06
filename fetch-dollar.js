import fs from "fs";

const API_KEY = process.env.FRED_API_KEY;

// "Today" in the user's timezone (America/New_York), formatted YYYY-MM-DD
const today = new Date().toLocaleDateString("en-CA", {
  timeZone: "America/New_York",
});

async function fetchDollar() {
  const url = `https://api.stlouisfed.org/fred/series/observations?series_id=DTWEXBGS&api_key=${API_KEY}&file_type=json`;

  const res = await fetch(url);
  const data = await res.json();

  if (!data.observations) {
    console.error("API error:", data);
    process.exit(1);
  }

  // Get last observation with valid data (not ".")
  const validObs = data.observations.filter((o) => o.value !== ".");
  const latest = validObs[validObs.length - 1];

  let prices = [];
  try {
    prices = JSON.parse(fs.readFileSync("prices.json", "utf-8"));
  } catch {
    // File doesn't exist yet
  }

  // Skip if today's date is already saved
  const last = prices[prices.length - 1];
  if (last && last.date === today) {
    console.log(`Already saved for ${today} — skipping`);
    return;
  }

  // Save one record per calendar day, carrying the latest known rate forward
  prices.push({ date: today, dollar: parseFloat(latest.value) });
  fs.writeFileSync("prices.json", JSON.stringify(prices, null, 2));
  console.log(
    `Saved: ${today} = ${latest.value} (FRED observation date: ${latest.date})`
  );
}

fetchDollar().catch(console.error);
