# Slay the Spire 2 Insights

This project provides data analysis tools for Slay the Spire (and Slay the Spire 2) run history data.

This project is a fork of [jeremybentham-yt/SlayTheSpire](https://github.com/jeremybentham-yt/SlayTheSpire).

## Features

### Web Application

A modern, private-by-design React web application that analyzes your run data directly in your browser. No data is ever uploaded to a server.

- **Relic Analysis**: See which relics are your top powerhouses and which are "traps" (statistically correlated with lower win rates).
- **Card Insights**: Interactive scatter plots showing Pick Rate vs. Win Rate for every card.
- **Privacy First**: All processing happens client-side.

#### How to run the Web App:

1. Ensure you have Node.js and Yarn installed.
2. Run `yarn install` to install dependencies.
3. Run `yarn dev` to start the local development server.
4. Open your browser to `http://localhost:5173`.
5. Drag and drop your `.json` or `.run` files from your game history folder into the dashboard.

### Python Script

The original analysis logic is also available in `SlayTheSpireData.py` for CLI-based analysis using Pandas, Matplotlib, and Plotly.

1. Open `SlayTheSpireData.py`.
2. Insert your run history path on line 11.
3. Run the script: `python SlayTheSpireData.py`.

## Data Locations

- **Windows**: `C:\Users\YOUR_NAME\AppData\Roaming\SlayTheSpire2\steam\STRING OF NUMBERS\profile1\saves\history`
- **Mac**: `~/Library/Application Support/SlayTheSpire2/`
