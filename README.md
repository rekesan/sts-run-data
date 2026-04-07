# SlayTheSpire

On line 11 of  `SlayTheSpireData.py` insert the path to the directory containing your run history data.
- For Windows this should looks something like `C:\Users\YOUR_NAME\AppData\Roaming\SlayTheSpire2\steam\STRING OF NUMBERS\profile1\saves\history`
- I believe for Mac, the path should begin `~/Library/Application Support/SlayTheSpire2/`

This file build two DataFrames:
  - `df` contains information about every relic for every run
  - `cards_df` contains information about card pick rates

The script will also run some basic data analysis on those DataFrames:
  - A graph of the least successful relics
  - A printout of the most ignored and most picked cards
  - An interactive plot showing card pick rates plotted against win rates
