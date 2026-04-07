import json
import os
import pandas as pd
import matplotlib.pyplot as plt
from collections import defaultdict
import plotly.express as px

#Your path might looks something like 
#   - For Windows: C:\Users\YOUR_NAME\AppData\Roaming\SlayTheSpire2\steam\STRING OF NUMBERS\profile1\saves\history
#   - For Mac: ~/Library/Application Support/SlayTheSpire2/
folder_path = r"INSERT YOUR PATH HERE"

def clean_relic_name(raw_name):
    return raw_name.replace("RELIC.", "").replace("_", " ").title()


def clean_character_name(raw_name):
    return raw_name.replace("CHARACTER.", "").title()


def extract_run_data(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)

    players = data.get("players", [])
    if not players:
        return set(), False, None, None, None

    # Relics
    relics = set()
    for relic in players[0].get("relics", []):
        relics.add(clean_relic_name(relic.get("id", "")))

    # Metadata
    win = data.get("win", False)
    ascension = data.get("ascension", None)
    character = clean_character_name(players[0].get("character", ""))
    run_time_seconds = data.get("run_time", 0)
    run_time_minutes = round(run_time_seconds / 60, 2)

    return relics, win, ascension, character, run_time_minutes


def build_dataframe(folder_path):
    all_runs = []
    all_relics = set()

    # First pass: collect runs + all relics
    for filename in os.listdir(folder_path):

        file_path = os.path.join(folder_path, filename)

        relics, win, ascension, character, run_time = extract_run_data(file_path)

        run_data = {
            "Run": filename,
            "Character": character,
            "Ascension": ascension,
            "Run Time (min)": run_time,
            "Win": win,
            "relics": relics
        }

        all_runs.append(run_data)
        all_relics.update(relics)

    all_relics = sorted(all_relics)

    # Second pass: build rows
    rows = []
    for run in all_runs:
        row = {
            "Run": run["Run"],
            "Character": run["Character"],
            "Ascension": run["Ascension"],
            "Run Time (min)": run["Run Time (min)"],
            "Win": run["Win"]
        }

        for relic in all_relics:
            row[relic] = 1 if relic in run["relics"] else 0

        rows.append(row)

    df = pd.DataFrame(rows)

    return df

# --- LOAD DATA ---
df = build_dataframe(folder_path)

# --- IDENTIFY RELIC COLUMNS ---
meta_cols = ["Run", "Character", "Ascension", "Run Time (min)", "Win"]
relic_cols = [col for col in df.columns if col not in meta_cols]

# --- BUILD res_df (winrate + count per relic) ---
results = []

for relic in relic_cols:
    subset = df[df[relic] == 1]
    count = len(subset)

    if count > 0:
        winrate = subset["Win"].mean()
        results.append({
            "Relic": relic,
            "Winrate": winrate,
            "Count": count
        })

res_df = pd.DataFrame(results)

# --- SORT (optional, for inspection) ---
res_df = res_df.sort_values(by="Winrate", ascending=False)

# --- PARAMETERS ---
min_count = 5  # only consider relics with enough data

# --- FILTER FOR RELIABLE DATA ---
filtered = res_df[res_df["Count"] >= min_count].copy()

# --- OVERALL BASELINE ---
overall_winrate = df["Win"].mean()


powerful_relics = filtered[
    filtered["Winrate"] > overall_winrate
].copy()

# Sort: best winrate first, then most common (for stability)
powerful_relics = powerful_relics.sort_values(
    by=["Winrate", "Count"],
    ascending=[False, False]
)

print("\nTop Powerful Relics:\n")
print(powerful_relics.head(20))

# --- IDENTIFY TRAPS ---
traps = filtered[
    filtered["Winrate"] < overall_winrate
]

# Sort: worst winrate first, then most common
traps = traps.sort_values(
    by=["Winrate", "Count"],
    ascending=[True, False]
)

# --- PRINT RESULTS ---
print(f"\nOverall Winrate: {overall_winrate:.2f}\n")
print("Top Trap Relics:\n")
print(traps.head(20))

# --- VISUALIZATION ---
top_n = 15
plot_df = traps.head(top_n)

plt.figure()
plt.barh(plot_df["Relic"], plot_df["Winrate"])
plt.xlabel("Winrate")
plt.ylabel("Relic")
plt.title(f"Trap Relics (min {min_count} runs)")
plt.gca().invert_yaxis()
# Showing at the end to prevent the figure from blocking the rest of the script

# ------------------------------------------------------------------

# Card Pick Rates

# ================================
# Helpers
# ================================
def clean_card_name(raw_name):
    return raw_name.replace("CARD.", "").replace("_", " ").title()

# ================================
# Storage
# ================================
card_offered_counts = defaultdict(int)
card_picked_counts = defaultdict(int)
card_win_counts = defaultdict(int)  # NEW

# ================================
# Extract card choices (per run)
# ================================
def extract_card_choices(obj, run_win, in_shop=False):
    if isinstance(obj, dict):

        # Check if THIS node is a shop
        current_in_shop = in_shop or (obj.get("map_point_type") == "shop")

        for key, value in obj.items():
            if key == "card_choices":
                
                # 🚫 Skip card choices if we're in a shop
                if current_in_shop:
                    continue

                for choice in value:
                    card_name = clean_card_name(choice["card"]["id"])

                    # Count offered
                    card_offered_counts[card_name] += 1

                    # Count picked
                    if choice.get("was_picked", False):
                        card_picked_counts[card_name] += 1

                        # Count wins when picked
                        if run_win:
                            card_win_counts[card_name] += 1

            else:
                # Recurse with updated shop context
                extract_card_choices(value, run_win, current_in_shop)

    elif isinstance(obj, list):
        for item in obj:
            extract_card_choices(item, run_win, in_shop)
# ================================
# Iterate files
# ================================
for filename in os.listdir(folder_path):
    
    file_path = os.path.join(folder_path, filename)

    with open(file_path, "r") as f:
        data = json.load(f)

    run_win = data.get("win", False)

    # Extract card data WITH run result
    extract_card_choices(data, run_win)

# ================================
# Build card DataFrame
# ================================
all_cards = sorted(card_offered_counts.keys())

card_rows = []
for card in all_cards:
    offered = card_offered_counts[card]
    picked = card_picked_counts[card]
    wins = card_win_counts[card]

    pick_rate = picked / offered if offered > 0 else 0
    win_rate = wins / picked if picked > 0 else 0  # NEW

    card_rows.append({
        "card_name": card,
        "times_offered": offered,
        "times_picked": picked,
        "pick_rate": pick_rate,
        "wins_when_picked": wins,
        "win_rate_when_picked": win_rate
    })

cards_df = pd.DataFrame(card_rows)

# ================================
# Filter to cards seen at least 5 times
# ================================
filtered_cards = cards_df[cards_df["times_offered"] >= 5].copy()

filtered_cards = filtered_cards.sort_values(
    by=["pick_rate", "times_offered"],
    ascending=[True, False]
)

# Safety check
if filtered_cards.empty:
    print("No cards meet the minimum threshold.")
else:
    # ================================
    # Most picked cards
    # ================================
    most_picked = filtered_cards.sort_values(
        by="pick_rate", ascending=False
    ).head(10)

    print("\n=== Most Picked Cards (min 5 offers) ===")
    print(most_picked)

    # ================================
    # Least picked cards
    # ================================
    least_picked = filtered_cards.sort_values(
        by="pick_rate", ascending=True
    ).head(10)

    print("\n=== Least Picked Cards (min 5 offers) ===")
    print(least_picked)


# ================================
# Filter data
# ================================
plot_df = cards_df[
    (cards_df["times_picked"] > 0) &
    (cards_df["times_offered"] >= 5)
].copy()

# Optional: scale marker size so it looks nicer
plot_df["size"] = plot_df["times_picked"]

# ================================
# Create interactive plot
# ================================
fig = px.scatter(
    plot_df,
    x="pick_rate",
    y="win_rate_when_picked",
    hover_name="card_name",   # <-- shows card name on hover
    hover_data={
        "times_offered": True,
        "times_picked": True,
        "pick_rate": ":.2f",
        "win_rate_when_picked": ":.2f"
    },
    title="Card Pick Rate vs Win Rate",
)

# Improve layout a bit
fig.update_layout(
    xaxis_title="Pick Rate",
    yaxis_title="Win Rate When Picked"
)

fig.show()
plt.show()
