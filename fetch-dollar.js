const fs = require('fs');
const fetch = require('node-fetch');

const API_KEY = process.env.FRED_API_KEY; // Free from https://fred.stlouisfed.org/docs/api/

async function fetchDollar() {
  // DXY = US Dollar Index (what you want)
  const url = `https://api.stlouisfed.org/fred/series/data?series_id=DEXUSEU&api_key=${API_KEY}&file_type=json`;
  
  const res = await fetch(url);
  const data = await res.json();
  const latest = data.observations[data.observations.length - 1];
  
  const prices = JSON.parse(fs.readFileSync('prices.json', 'utf-8'));
  prices.push({ date: latest.date, dollar: parseFloat(latest.value) });
  
  fs.writeFileSync('prices.json', JSON.stringify(prices, null, 2));
}

fetchDollar();
