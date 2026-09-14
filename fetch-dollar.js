import fs from "fs";

const API_KEY = process.env.FRED_API_KEY;

async function fetchDollar() {
  const url = `https://api.stlouisfed.org/fred/series/data?series_id=DEXUSEU&api_key=${API_KEY}&file_type=json`;

  const res = await fetch(url);
  const data = await res.json();

  console.log("API Response:", JSON.stringify(data, null, 2));

  if (!data.observations || data.observations.length === 0) {
    console.error("No observations in response. Check API key or series ID.");
    process.exit(1);
  }

  const latest = data.observations[data.observations.length - 1];

  let prices = [];
  try {
    prices = JSON.parse(fs.readFileSync("prices.json", "utf-8"));
  } catch {
    // File doesn't exist yet
  }

  prices.push({ date: latest.date, dollar: parseFloat(latest.value) });

  fs.writeFileSync("prices.json", JSON.stringify(prices, null, 2));
  console.log(`Updated: ${latest.date} = ${latest.value}`);
}

fetchDollar().catch(console.error);
