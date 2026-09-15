# U.S. Dollar Index Tracker

An automated, serverless data pipeline that continuously collects and stores the Nominal Broad U.S. Dollar Index.

The project uses GitHub Actions to fetch the latest data from the FRED API on a schedule, save new observations to `prices.json`, and maintain a historical record automatically—without requiring a dedicated server or manual updates.

A lightweight web dashboard is included for exploring the collected data.

## How It Works

1. GitHub Actions runs the scheduled update workflow.
2. `fetch-dollar.js` requests the latest observation from the FRED API.
3. Invalid or unavailable observations are ignored.
4. New observations are added to `prices.json`.
5. GitHub commits the updated data back to the repository.
6. `index.html` loads the stored data and displays it using Chart.js.

Once configured, the project runs on its own with no human intervention.

## Features

- Automated data collection through GitHub Actions
- Serverless execution with no dedicated backend
- Historical data stored directly in the repository
- Automatic duplicate-date protection
- Current index value and daily change
- 30-day change and percentage change
- Historical high and low values
- Interactive Chart.js visualization
- No frontend build step required

## Data Source

This project uses the following FRED series:

- **Series:** `DTWEXBGS`
- **Name:** Nominal Broad U.S. Dollar Index
- **Frequency:** Daily
- **Units:** Index, January 2006 = 100
- **Source:** Board of Governors of the Federal Reserve System

The index is a broad, trade-weighted measure of the U.S. dollar against the currencies of major U.S. trading partners.

> This project tracks the Nominal Broad U.S. Dollar Index from FRED. It does not track the ICE U.S. Dollar Index futures contract, commonly known as DXY.

## Project Goals

The primary goal of this project is to build a self-running data collection system using GitHub as both:

- The execution environment through GitHub Actions
- The versioned storage layer for historical data

The dashboard is a presentation layer on top of that automated pipeline.

## Project Structure

```text
.
├── .github/
│   └── workflows/
│       └── update-dollar.yml   # Scheduled automation
├── fetch-dollar.js             # Fetches and stores new data
├── index.html                  # Dashboard interface
├── package.json                # Node.js project metadata
├── prices.json                 # Historical observations
└── README.md
```
