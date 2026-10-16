# Save as: logs/food_data_indian.py
#
# Indian dish nutrition data, taken verbatim from the project's curated dataset
# ``indian_food_nutrition_calories - Sheet1.csv`` (Food_Item, Category,
# Calories_per_100g, Protein_g, Fat_g, Carbs_g, Fiber_g, Sugar_g, ...).
#
# Every value is per 100 g of the prepared dish and is stored in the column
# order the rest of the codebase expects:
#
#     (name, category, calories, protein_g, carbs_g, fat_g, sugar_g)
#
# The CSV's own Fat/Carbs columns are swapped into this order, and its
# categories are normalised to the names already used across the app
# (e.g. "Lentils"/"Veg" -> "Dal & Curry", "Dessert" -> "Indian Dessert") so
# search results render consistently with the rest of the catalog.
#
# Applied by ``manage.py seed_foods`` as an upsert keyed on a case-insensitive
# name match: the dataset is authoritative for these dishes, and matching
# case-insensitively means it refreshes an existing row ("Gulab jamun") instead
# of creating a duplicate ("Gulab Jamun").

INDIAN_FOODS = [
    # ---- North Indian mains ----
    ("Dal Tadka", "Dal & Curry", 120, 7.0, 18.0, 4.0, 2.0),
    ("Butter Chicken", "Non-Veg", 280, 25.0, 5.0, 20.0, 3.0),
    ("Palak Paneer", "Dal & Curry", 220, 14.0, 8.0, 18.0, 2.0),
    ("Chicken Biryani", "Indian Meals", 320, 28.0, 35.0, 15.0, 5.0),
    ("Aloo Gobi", "Dal & Curry", 140, 3.0, 15.0, 10.0, 3.0),
    ("Masoor Dal", "Dal & Curry", 110, 8.0, 19.0, 2.0, 1.0),
    ("Fish Curry", "Non-Veg", 180, 22.0, 6.0, 8.0, 2.0),
    ("Chole Bhature", "Dal & Curry", 380, 12.0, 45.0, 22.0, 6.0),
    ("Tandoori Chicken", "Non-Veg", 240, 30.0, 3.0, 12.0, 1.0),
    ("Vegetable Pulao", "Indian Meals", 200, 5.0, 32.0, 8.0, 4.0),
    ("Rajma", "Dal & Curry", 130, 8.0, 21.0, 3.0, 2.0),
    ("Baingan Bharta", "Dal & Curry", 100, 2.0, 12.0, 7.0, 5.0),
    ("Chicken Tikka", "Non-Veg", 220, 26.0, 4.0, 10.0, 2.0),
    ("Paneer Tikka", "Dal & Curry", 260, 18.0, 6.0, 20.0, 3.0),
    ("Keema", "Non-Veg", 240, 20.0, 8.0, 16.0, 4.0),
    ("Seekh Kebab", "Non-Veg", 260, 24.0, 3.0, 18.0, 2.0),
    ("Shami Kebab", "Non-Veg", 250, 22.0, 6.0, 16.0, 3.0),
    ("Galouti Kebab", "Non-Veg", 280, 23.0, 4.0, 22.0, 2.0),
    ("Reshmi Kebab", "Non-Veg", 270, 26.0, 2.0, 20.0, 1.0),
    ("Chicken Korma", "Non-Veg", 290, 28.0, 6.0, 22.0, 3.0),
    ("Navratan Korma", "Dal & Curry", 200, 6.0, 18.0, 16.0, 12.0),
    ("Malai Kofta", "Dal & Curry", 240, 8.0, 20.0, 18.0, 8.0),
    ("Shahi Paneer", "Dal & Curry", 280, 14.0, 12.0, 22.0, 6.0),
    ("Kadai Paneer", "Dal & Curry", 260, 16.0, 10.0, 20.0, 5.0),
    ("Matar Paneer", "Dal & Curry", 240, 15.0, 14.0, 18.0, 6.0),
    ("Palak Chicken", "Non-Veg", 260, 29.0, 8.0, 16.0, 3.0),
    ("Chicken Chettinad", "Non-Veg", 280, 31.0, 7.0, 18.0, 2.0),
    ("Andhra Chicken", "Non-Veg", 290, 30.0, 8.0, 19.0, 3.0),
    ("Chicken 65", "Non-Veg", 300, 28.0, 9.0, 20.0, 4.0),
    ("Chili Chicken", "Non-Veg", 270, 26.0, 12.0, 16.0, 8.0),
    ("Chicken Manchurian", "Non-Veg", 280, 25.0, 14.0, 18.0, 10.0),
    ("Gobi Manchurian", "Dal & Curry", 220, 6.0, 20.0, 16.0, 12.0),
    ("Paneer Manchurian", "Dal & Curry", 260, 16.0, 16.0, 20.0, 10.0),

    # ---- Breads ----
    ("Roti", "Roti & Bread", 270, 9.0, 50.0, 4.0, 2.0),
    ("Naan", "Roti & Bread", 310, 10.0, 55.0, 6.0, 4.0),
    ("Paratha", "Roti & Bread", 320, 8.0, 42.0, 18.0, 3.0),
    ("Puri", "Roti & Bread", 340, 8.0, 38.0, 20.0, 2.0),
    ("Bhatura", "Roti & Bread", 380, 10.0, 42.0, 22.0, 3.0),
    ("Thepla", "Roti & Bread", 280, 12.0, 32.0, 16.0, 4.0),
    ("Khakhra", "Roti & Bread", 320, 14.0, 48.0, 12.0, 2.0),
    ("Thalipeeth", "Roti & Bread", 260, 12.0, 30.0, 14.0, 3.0),
    ("Puran Poli", "Roti & Bread", 300, 8.0, 48.0, 12.0, 18.0),
    ("Appam", "Roti & Bread", 180, 4.0, 32.0, 6.0, 4.0),
    ("Puttu", "Roti & Bread", 200, 6.0, 30.0, 8.0, 2.0),

    # ---- Breakfast ----
    ("Dosa", "Indian Breakfast", 180, 4.0, 28.0, 8.0, 1.0),
    ("Idli", "Indian Breakfast", 120, 6.0, 25.0, 2.0, 1.0),
    ("Upma", "Indian Breakfast", 180, 6.0, 28.0, 8.0, 2.0),
    ("Poha", "Indian Breakfast", 160, 4.0, 30.0, 6.0, 4.0),
    ("Sabudana Khichdi", "Indian Breakfast", 180, 4.0, 32.0, 6.0, 4.0),
    ("Kappa", "Indian Breakfast", 160, 2.0, 36.0, 4.0, 2.0),

    # ---- Snacks ----
    ("Vada", "Indian Snacks", 220, 8.0, 20.0, 15.0, 2.0),
    ("Samosa", "Indian Snacks", 260, 6.0, 28.0, 16.0, 3.0),
    ("Pakora", "Indian Snacks", 240, 8.0, 22.0, 18.0, 2.0),
    ("Dhokla", "Indian Snacks", 140, 8.0, 24.0, 4.0, 6.0),
    ("Khandvi", "Indian Snacks", 120, 10.0, 18.0, 6.0, 3.0),
    ("Handvo", "Indian Snacks", 220, 12.0, 28.0, 10.0, 5.0),
    ("Muthia", "Indian Snacks", 180, 8.0, 20.0, 12.0, 4.0),
    ("Pav Bhaji", "Indian Snacks", 240, 8.0, 32.0, 12.0, 8.0),
    ("Misal Pav", "Indian Snacks", 200, 12.0, 24.0, 8.0, 6.0),
    ("Vada Pav", "Indian Snacks", 280, 10.0, 26.0, 18.0, 4.0),
    ("Bhel Puri", "Indian Snacks", 160, 4.0, 28.0, 6.0, 12.0),
    ("Sev Puri", "Indian Snacks", 220, 6.0, 24.0, 14.0, 8.0),
    ("Ragda Patties", "Indian Snacks", 200, 8.0, 26.0, 10.0, 6.0),
    ("Spring Roll", "Indian Snacks", 200, 8.0, 24.0, 12.0, 6.0),
    ("Momos", "Indian Snacks", 180, 12.0, 20.0, 8.0, 3.0),
    ("Thukpa", "Indian Snacks", 120, 8.0, 16.0, 4.0, 2.0),

    # ---- West Indian ----
    ("Undhiyu", "Dal & Curry", 160, 5.0, 20.0, 8.0, 8.0),
    ("Kadhi", "Dal & Curry", 120, 6.0, 14.0, 6.0, 4.0),
    ("Sol Kadhi", "Dal & Curry", 60, 2.0, 8.0, 4.0, 6.0),
    ("Amti", "Dal & Curry", 110, 7.0, 17.0, 3.0, 2.0),
    ("Kolambi Bhaat", "Indian Meals", 220, 18.0, 28.0, 8.0, 2.0),
    ("Kombdi Vade", "Non-Veg", 280, 22.0, 24.0, 16.0, 1.0),
    ("Malvani Fish", "Non-Veg", 200, 24.0, 6.0, 10.0, 1.0),

    # ---- South Indian ----
    ("Meen Curry", "Non-Veg", 190, 23.0, 5.0, 9.0, 1.0),
    ("Meen Pollichathu", "Non-Veg", 210, 25.0, 4.0, 11.0, 1.0),
    ("Kozhi Curry", "Non-Veg", 250, 28.0, 3.0, 14.0, 1.0),
    ("Egg Curry", "Non-Veg", 170, 14.0, 4.0, 12.0, 1.0),
    ("Avial", "Dal & Curry", 140, 4.0, 12.0, 10.0, 4.0),
    ("Kaalan", "Dal & Curry", 120, 3.0, 14.0, 8.0, 6.0),
    ("Thoran", "Dal & Curry", 160, 6.0, 14.0, 12.0, 4.0),
    ("Olan", "Dal & Curry", 100, 2.0, 12.0, 6.0, 5.0),
    ("Erissery", "Dal & Curry", 150, 5.0, 14.0, 10.0, 3.0),
    ("Kootu Curry", "Dal & Curry", 180, 8.0, 16.0, 12.0, 4.0),
    ("Inji Curry", "Dal & Curry", 80, 1.0, 10.0, 4.0, 8.0),

    # ---- Biryani & rice ----
    ("Mutton Biryani", "Indian Meals", 330, 25.0, 35.0, 20.0, 6.0),
    ("Hyderabadi Biryani", "Indian Meals", 340, 27.0, 36.0, 19.0, 5.0),
    ("Kolkata Biryani", "Indian Meals", 310, 24.0, 38.0, 16.0, 8.0),
    ("Lucknowi Biryani", "Indian Meals", 320, 26.0, 37.0, 17.0, 6.0),
    ("Chowmein", "Indian Meals", 220, 8.0, 28.0, 14.0, 6.0),
    ("Fried Rice", "Indian Meals", 240, 10.0, 32.0, 12.0, 4.0),
    ("Schezwan Rice", "Indian Meals", 260, 9.0, 30.0, 16.0, 8.0),
    ("Chicken Fried Rice", "Indian Meals", 280, 18.0, 30.0, 14.0, 4.0),
    ("Egg Fried Rice", "Indian Meals", 250, 14.0, 32.0, 12.0, 5.0),

    # ---- Mutton ----
    ("Mutton Curry", "Non-Veg", 270, 26.0, 4.0, 18.0, 2.0),

    # ---- Desserts ----
    ("Kheer", "Indian Dessert", 220, 6.0, 30.0, 12.0, 20.0),
    ("Gulab Jamun", "Indian Dessert", 350, 5.0, 55.0, 15.0, 35.0),
    ("Rasgulla", "Indian Dessert", 180, 4.0, 40.0, 2.0, 35.0),
    ("Jalebi", "Indian Dessert", 320, 4.0, 60.0, 12.0, 45.0),
    ("Shrikhand", "Indian Dessert", 240, 8.0, 32.0, 12.0, 28.0),
    ("Basundi", "Indian Dessert", 260, 10.0, 28.0, 14.0, 25.0),
    ("Modak", "Indian Dessert", 280, 6.0, 38.0, 14.0, 22.0),
    ("Karanji", "Indian Dessert", 320, 8.0, 40.0, 18.0, 25.0),
    ("Chirote", "Indian Dessert", 340, 6.0, 42.0, 20.0, 28.0),

    # ---- Condiments ----
    ("Mango Pickle", "Condiments", 120, 1.0, 12.0, 8.0, 8.0),
    ("Lemon Pickle", "Condiments", 100, 1.0, 14.0, 6.0, 10.0),
    ("Puli Inji", "Condiments", 90, 1.0, 12.0, 5.0, 15.0),
]
