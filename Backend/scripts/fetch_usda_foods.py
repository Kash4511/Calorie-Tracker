"""Regenerate logs/food_data.py from USDA FoodData Central.

Pulls per-100 g energy + macros for a curated list of basic whole foods and
writes them into ``Backend/logs/food_data.py``. The values are then applied to
the database by ``python manage.py seed_foods``.

Usage (from the Backend directory):
    python scripts/fetch_usda_foods.py

Requires USDA_FDC_API_KEY (read from the environment or Backend/.env).
Only the standard library is used — no extra dependencies.
"""

import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BACKEND_DIR / ".env"
OUT_PATH = BACKEND_DIR / "logs" / "food_data.py"
API = "https://api.nal.usda.gov/fdc/v1/foods/search"

# name (as shown in the app), category, USDA search query
CURATED = [
    # ---- Eggs ----
    ("Eggs", "Protein", "Egg whole raw fresh"),
    ("Egg white", "Protein", "Egg white raw fresh"),
    ("Egg yolk", "Protein", "Egg yolk raw fresh"),
    ("Boiled Egg", "Protein", "Egg whole hard-boiled"),
    ("Scrambled Eggs", "Protein", "Egg whole cooked scrambled"),
    ("Omelette", "Protein", "Egg whole cooked omelet"),
    # ---- Dairy ----
    ("Milk", "Dairy", "Milk whole 3.25% milkfat with added vitamin D"),
    ("Milk (2% reduced fat)", "Dairy", "Milk reduced fat fluid 2% milkfat"),
    ("Milk (skim)", "Dairy", "Milk nonfat fluid with added vitamin A and vitamin D"),
    ("Greek yogurt", "Dairy", "Yogurt Greek plain nonfat"),
    ("Curd", "Dairy", "Yogurt plain whole milk"),
    ("Cheddar Cheese", "Dairy", "Cheese cheddar"),
    ("Mozzarella Cheese", "Dairy", "Cheese mozzarella part skim milk"),
    ("Cottage Cheese", "Dairy", "Cheese cottage lowfat 2% milkfat"),
    ("Butter", "Dairy", "Butter salted"),
    ("Cream cheese", "Dairy", "Cheese cream"),
    ("Heavy cream", "Dairy", "Cream fluid heavy whipping"),
    # ---- Poultry / meat / fish ----
    ("Chicken breast", "Non-Veg", "Chicken broilers or fryers breast meat only cooked roasted"),
    ("Chicken thigh", "Non-Veg", "Chicken broilers or fryers thigh meat only cooked roasted"),
    ("Turkey breast", "Non-Veg", "Turkey whole breast meat only cooked roasted"),
    ("Ground Beef (lean)", "Non-Veg", "Beef ground 85% lean meat 15% fat cooked broiled"),
    ("Beef Steak (grilled)", "Non-Veg", "Beef loin tenderloin steak boneless cooked grilled"),
    ("Pork Chop", "Non-Veg", "Pork fresh loin blade chops bone-in cooked braised"),
    ("Lamb", "Non-Veg", "Lamb domestic leg roasted"),
    ("Bacon", "Non-Veg", "Pork cured bacon cooked baked"),
    ("Salmon", "Non-Veg", "Fish salmon Atlantic farmed cooked dry heat"),
    ("Tuna (canned)", "Non-Veg", "Fish tuna light canned in water without salt drained solids"),
    ("Shrimp (cooked)", "Non-Veg", "Crustaceans shrimp mixed species cooked moist heat"),
    ("Cod", "Non-Veg", "Fish cod Pacific cooked dry heat"),
    ("Sardines", "Non-Veg", "Fish sardine Atlantic canned in oil drained solids with bone"),
    # ---- Grains ----
    ("White Rice (steamed)", "Rice & Grains", "Rice white long-grain regular enriched cooked"),
    ("Brown rice cooked", "Rice & Grains", "Rice brown long-grain cooked"),
    ("Oatmeal", "Rice & Grains", "Cereals oats regular quick cooked water without salt"),
    ("Quinoa cooked", "Rice & Grains", "Quinoa cooked"),
    ("Pasta (cooked)", "Rice & Grains", "Pasta cooked enriched"),
    ("Barley (cooked)", "Rice & Grains", "Barley pearled cooked"),
    ("Couscous (cooked)", "Rice & Grains", "Couscous cooked"),
    ("Whole Wheat Bread", "Roti & Bread", "Bread whole-wheat commercially prepared"),
    ("Bread", "Roti & Bread", "Bread white commercially prepared"),
    ("Bagel", "Roti & Bread", "Bagels plain enriched"),
    ("Croissant", "Roti & Bread", "Croissants butter"),
    # ---- Vegetables ----
    ("Broccoli", "Vegetables", "Broccoli raw"),
    ("Spinach", "Vegetables", "Spinach raw"),
    ("Carrot", "Vegetables", "Carrots raw"),
    ("Tomato", "Vegetables", "Tomatoes red ripe raw year round average"),
    ("Onion", "Vegetables", "Onions raw"),
    ("Potato", "Vegetables", "Potatoes boiled cooked without skin flesh without salt"),
    ("Sweet potato", "Vegetables", "Sweet potato cooked baked in skin flesh without salt"),
    ("Cucumber", "Vegetables", "Cucumber with peel raw"),
    ("Cauliflower", "Vegetables", "Cauliflower raw"),
    ("Cabbage", "Vegetables", "Cabbage raw"),
    ("Green peas", "Vegetables", "Peas green raw"),
    ("Sweet corn", "Vegetables", "Corn sweet yellow raw"),
    ("Bell pepper (red)", "Vegetables", "Peppers sweet red raw"),
    ("Mushrooms", "Vegetables", "Mushrooms white raw"),
    ("Lettuce", "Vegetables", "Lettuce cos or romaine raw"),
    ("Garlic", "Vegetables", "Garlic raw"),
    ("French beans", "Vegetables", "Beans snap green raw"),
    ("Pumpkin", "Vegetables", "Pumpkin raw"),
    ("Beetroot", "Vegetables", "Beets raw"),
    # ---- Fruits ----
    ("Apple", "Fruits", "Apples raw with skin"),
    ("Banana", "Fruits", "Bananas raw"),
    ("Orange", "Fruits", "Oranges raw all commercial varieties"),
    ("Grapes", "Fruits", "Grapes red or green raw"),
    ("Strawberries", "Fruits", "Strawberries raw"),
    ("Blueberries", "Fruits", "Blueberries raw"),
    ("Mango", "Fruits", "Mangos raw"),
    ("Watermelon", "Fruits", "Watermelon raw"),
    ("Pineapple", "Fruits", "Pineapple raw all varieties"),
    ("Avocado", "Fruits", "Avocados raw all commercial varieties"),
    ("Papaya", "Fruits", "Papayas raw"),
    ("Pomegranate", "Fruits", "Pomegranates raw"),
    ("Guava", "Fruits", "Guavas common raw"),
    ("Apricot", "Fruits", "Apricots raw"),
    # ---- Nuts, seeds & fats ----
    ("Almonds", "Nuts & Seeds", "Nuts almonds"),
    ("Walnuts", "Nuts & Seeds", "Nuts walnuts english"),
    ("Peanuts", "Nuts & Seeds", "Peanuts all types raw"),
    ("Cashews", "Nuts & Seeds", "Nuts cashew nuts raw"),
    ("Pistachios", "Nuts & Seeds", "Nuts pistachio nuts raw"),
    ("Coconut", "Nuts & Seeds", "Nuts coconut meat raw"),
    ("Peanut Butter", "Nuts & Seeds", "Peanut butter smooth style with salt"),
    ("Chia seeds", "Nuts & Seeds", "Seeds chia seeds dried"),
    ("Flaxseed", "Nuts & Seeds", "Seeds flaxseed"),
    ("Olive oil", "Fats & Oils", "Oil olive salad or cooking"),
    ("Sunflower oil", "Fats & Oils", "Oil sunflower linoleic"),
    ("Coconut oil", "Fats & Oils", "Oil coconut"),
    # ---- Pulses & plant protein ----
    ("Lentils (cooked)", "Pulses", "Lentils mature seeds cooked boiled"),
    ("Chickpeas (cooked)", "Pulses", "Chickpeas garbanzo beans mature seeds cooked boiled"),
    ("Kidney beans (cooked)", "Pulses", "Beans kidney red mature seeds cooked boiled"),
    ("Black beans (cooked)", "Pulses", "Beans black turtle mature seeds cooked boiled"),
    ("Soybeans (cooked)", "Pulses", "Soybeans mature cooked boiled"),
    ("Tofu", "Protein", "Tofu raw firm prepared with calcium sulfate"),
    ("Tempeh", "Protein", "Tempeh"),
    ("Whey Protein Powder", "Protein", "Beverages protein powder whey based"),
    # ---- Sweets & beverages ----
    ("Sugar (granulated)", "Sweets", "Sugars granulated"),
    ("Honey", "Sweets", "Honey"),
    ("Dark Chocolate (70%)", "Snacks", "Chocolate dark 70-85% cacao solids"),
    ("Ice Cream (Vanilla)", "Dessert", "Ice creams vanilla"),
    ("Orange juice", "Beverages", "Orange juice raw"),
    ("Almond Milk", "Beverages", "Beverages almond milk unsweetened shelf stable"),
    ("Coffee (black)", "Beverages", "Beverages coffee brewed"),
    ("Black tea", "Beverages", "Beverages tea black brewed prepared with tap water"),
]

# Candidates whose description contains any of these substrings are rejected,
# so a specific variant does not shadow the plain food.
AVOID = {
    "Bread": ("toasted", "low sodium"),
    "Apple": ("without skin", "golden", "gala", "granny", "fuji", "delicious"),
    "Salmon": ("smoked",),
    "Potato": ("in skin",),
    "Ground Beef (lean)": ("93%", "95%", "97%"),
    "Cheddar Cheese": ("imitation", "sharp", "sliced", "shredded", "low fat",
                       "lowfat", "nonfat", "fat free", "low-sodium"),
}

# Hand-checked overrides for foods the search ranking cannot disambiguate.
# name -> (kcal, protein, carbs, fat, sugar) per 100 g
OVERRIDE = {
    # USDA SR Legacy 01009 — Cheese, cheddar
    "Cheddar Cheese": (403.0, 22.87, 3.09, 33.31, 0.48),
    # USDA SR Legacy 13364 — Beef, ground, 90% lean / 10% fat, cooked, broiled
    "Ground Beef (lean)": (214.0, 26.37, 0.0, 11.14, 0.0),
}

ENERGY_IDS = (1008, 2047, 2048)  # kcal: SR Legacy, then Foundation Atwater variants
SUGAR_IDS = (2000, 1063)
ID_PROTEIN, ID_FAT, ID_CARB = 1003, 1004, 1005

STOP = {"and", "or", "the", "of", "a", "an", "in", "on", "to",
        "includes", "include", "added", "type", "types", "such", "as"}


def load_key():
    key = os.environ.get("USDA_FDC_API_KEY")
    if key:
        return key
    if ENV_PATH.exists():
        for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
            if line.startswith("USDA_FDC_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise SystemExit("USDA_FDC_API_KEY not found in the environment or Backend/.env")


def tokens(text):
    return [w for w in re.findall(r"[a-z]+", text.lower()) if w not in STOP and len(w) > 1]


def nutrients(food):
    out = {}
    for n in food.get("foodNutrients", []):
        nid, val = n.get("nutrientId"), n.get("value")
        if nid is not None and val is not None:
            out[nid] = float(val)
    return out


def pick(foods, query, avoid=()):
    """Choose the best-matching generic entry for a query."""
    qt = tokens(query)
    best, best_key = None, None
    for food in foods:
        desc = food.get("description", "")
        if any(a in desc.lower() for a in avoid):
            continue
        dset = set(tokens(desc))
        score = sum(1 for t in qt if t in dset)
        bonus = 0.3 if food.get("dataType") == "SR Legacy" else (
            0.15 if food.get("dataType") == "Foundation" else 0.0)
        key = (score, bonus, -len(desc))  # prefers the shorter, more generic name
        if best_key is None or key > best_key:
            best, best_key = food, key
    return best


def fetch(query, key):
    params = urllib.parse.urlencode({
        "query": query,
        "dataType": "Foundation,SR Legacy",
        "pageSize": "25",
        "api_key": key,
    })
    req = urllib.request.Request(f"{API}?{params}", headers={"User-Agent": "calorie-tracker-seed"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode())["foods"]


def main():
    key = load_key()
    rows, report = [], []
    for name, category, query in CURATED:
        if name in OVERRIDE:
            kcal, p, c, f, s = OVERRIDE[name]
            rows.append((name, category, kcal, p, c, f, s))
            report.append(f"{name:<26} {kcal:>4} kcal  (manual override)")
            continue
        try:
            foods = fetch(query, key)
        except Exception as exc:  # noqa: BLE001
            report.append(f"FAIL  {name}: {exc}")
            continue
        food = pick(foods, query, AVOID.get(name, ()))
        if not food:
            report.append(f"MISS  {name}  (query: {query})")
            continue
        n = nutrients(food)
        kcal = next((n[i] for i in ENERGY_IDS if i in n), None)
        protein, carbs, fat = n.get(ID_PROTEIN, 0.0), n.get(ID_CARB, 0.0), n.get(ID_FAT, 0.0)
        sugar = next((n[i] for i in SUGAR_IDS if i in n), 0.0)
        if kcal is None:
            kcal = 4 * protein + 4 * carbs + 9 * fat
        rows.append((name, category, round(kcal, 2), round(protein, 2),
                     round(carbs, 2), round(fat, 2), round(sugar, 2)))
        report.append(
            f"{name:<26} {round(kcal):>4} kcal  P{protein:>5.1f} C{carbs:>5.1f} "
            f"F{fat:>5.1f} S{sugar:>5.1f}  <- {food.get('description')}"
        )
        time.sleep(0.08)

    lines = [
        '"""Curated food catalog with USDA FoodData Central verified values.',
        "",
        "Every entry is per 100 g so a logged quantity is a simple ratio.",
        "Regenerate with: python scripts/fetch_usda_foods.py",
        '(source: USDA FoodData Central, SR Legacy / Foundation datasets)',
        '"""',
        "",
        "# name, category, kcal, protein, carbs, fat, sugar — all per 100 g",
        "USDA_FOODS = [",
    ]
    for name, category, kcal, p, c, f, s in rows:
        lines.append(f"    ({name!r}, {category!r}, {kcal}, {p}, {c}, {f}, {s}),")
    lines.append("]")
    OUT_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"\n{len(rows)}/{len(CURATED)} foods resolved -> {OUT_PATH}\n")
    for line in report:
        print(line)


if __name__ == "__main__":
    sys.exit(main())
