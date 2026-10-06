# DXY Intraday Tracker

An automated, serverless data pipeline that collects the ICE U.S. Dollar Index (DXY) throughout the trading day and stores it as versioned history — no dedicated server, no paid API.

The project uses GitHub Actions to fetch 15-minute bars from Yahoo Finance on a schedule, append new observations to `prices.json`, and commit the updated data back to the repository. A dark, glassmorphism dashboard visualizes the intraday action.

## How It Works

1. GitHub Actions runs on schedule: every 2 hours on weekdays, once daily on weekends (all UTC cron).
2. `fetch-dollar.js` requests the last 5 days of 15-minute DXY bars (`DX-Y.NYB`) from Yahoo Finance — free, no API key.
3. Every bar newer than the last saved record is appended (automatic backfill, so delayed or skipped runs never leave gaps).
4. On weekends (markets closed) a single daily snapshot carries the last close forward, keeping one record per calendar day.
5. Duplicate timestamps are skipped; `prices.json` stays chronologically sorted.
6. GitHub commits the updated data back to the repository.
7. `index.html` loads the stored data and renders the dashboard with Chart.js.

Once configured, the project runs on its own with no human intervention.

## Features

- Automated intraday collection through GitHub Actions (2-hour weekday cadence, daily weekend snapshot)
- 100% free data — Yahoo Finance, no API key or signup
- Automatic backfill + duplicate protection
- Dark glassmorphism dashboard with animated count-up hero
- Current DXY with day change vs previous close
- Day high/low with timestamps, previous close, bars-today counter
- Interactive Chart.js visualization with Day / 5D / 1M / All ranges (intraday bars up close, daily closes zoomed out)
- Recent records table with per-bar trend tags
- No frontend build step required

## Data Source

- **Symbol:** `DX-Y.NYB` — ICE US Dollar Index
- **Source:** Yahoo Finance chart API (`query1.finance.yahoo.com`)
- **Granularity:** 15-minute bars, backfilled on every run
- **Cost:** free, no authentication

> This project tracks the ICE U.S. Dollar Index (DXY), a measure of the dollar against a basket of six major currencies. It previously tracked the Fed's Nominal Broad index (DTWEXBGS); that history was cleared when the project moved to intraday DXY.

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── intraday-fetch.yml  # Scheduled automation
├── fetch-dollar.js             # Fetches and stores new bars
├── index.html                  # Dashboard interface
├── package.json                # Node.js project metadata
├── prices.json                 # Historical records [{ time, dollar }]
└── README.md
```

Records in `prices.json` look like:

```json
{ "time": "2026-10-06T14:30:00-04:00", "dollar": 101.809 }
```

Times are ISO 8601 in America/New_York.
