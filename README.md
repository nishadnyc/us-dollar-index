# US Dollar Index

A lightweight dashboard that tracks the daily Nominal Broad U.S. Dollar Index using data from the Federal Reserve Economic Data (FRED) API.

The project fetches the latest available observation automatically, stores the historical values in `prices.json`, and displays the data in a responsive Chart.js dashboard.

## Live Demo

[View the dashboard](https://nishad.top/us-dollar-index/)

## Features

- Fetches the latest daily dollar index value
- Stores historical observations in `prices.json`
- Automatically avoids duplicate dates
- Displays the current index value
- Shows the daily change
- Calculates the 30-day change and percentage change
- Displays the historical high and low
- Renders an interactive line chart
- Can be updated automatically with GitHub Actions
- Requires no frontend build step

## Data

This project uses the FRED series:

- **Series:** DTWEXBGS
- **Name:** Nominal Broad U.S. Dollar Index
- **Frequency:** Daily
- **Units:** Index, January 2006 = 100
- **Source:** Board of Governors of the Federal Reserve System

The index is a broad, trade-weighted measure of the U.S. dollar against currencies from major U.S. trading partners.

> Note: This project tracks the broad U.S. Dollar Index from FRED. It does not track the ICE U.S. Dollar Index futures contract, commonly known as DXY.

## How It Works

1. `fetch-dollar.js` requests the latest observations from the FRED API.
2. Invalid observations with a value of `.` are ignored.
3. The most recent valid observation is selected.
4. The observation is appended to `prices.json` if the date is not already present.
5. `index.html` loads `prices.json` in the browser.
6. Chart.js renders the historical data and calculates the summary metrics.

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── ...
├── fetch-dollar.js   # Fetches and stores the latest index value
├── index.html        # Dashboard and chart
├── package.json      # Node.js project metadata
├── prices.json       # Historical index observations
└── README.md
```
