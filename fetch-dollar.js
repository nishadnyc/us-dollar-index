import fs from "fs";

const API_KEY = process.env.FRED_API_KEY;

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

  // Don't add duplicate
  if (!prices.length || prices[prices.length - 1].date !== latest.date) {
    prices.push({ date: latest.date, dollar: parseFloat(latest.value) });
    fs.writeFileSync("prices.json", JSON.stringify(prices, null, 2));
    console.log(`Updated: ${latest.date} = ${latest.value}`);
  } else {
    console.log("Already up to date");
  }
}

fetchDollar().catch(console.error);
