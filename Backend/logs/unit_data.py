"""Pre-configured count units for common foods.

Each entry maps a catalog food name to the units it can be logged in, as
``(label, grams_per_unit, is_default)``. Applied by ``manage.py seed_foods``;
foods that are not present in the catalog are skipped, so this file can name
foods freely without breaking a partial catalog.
"""

STANDARD_UNITS = {
    # Eggs — counted individually rather than weighed.
    'Eggs': [('egg', 50.0, True), ('piece', 50.0, False)],
    'Boiled Egg': [('egg', 50.0, True)],
    'Scrambled Eggs': [('egg', 50.0, True)],
    'Omelette': [('egg', 50.0, True)],
    'Egg white': [('egg white', 33.0, True)],
    'Egg yolk': [('yolk', 17.0, True)],
    # Fruit — counted per fruit.
    'Apple': [('apple', 182.0, True)],
    'Banana': [('banana', 118.0, True)],
    'Orange': [('orange', 131.0, True)],
    'Mango': [('mango', 200.0, True)],
    'Guava': [('guava', 55.0, True)],
    'Pomegranate': [('pomegranate', 282.0, True)],
    # Bread & baked goods — sliced.
    'Bread': [('slice', 28.0, True)],
    'Brown Bread': [('slice', 28.0, True)],
    'Whole Wheat Bread': [('slice', 28.0, True)],
    'Bagel': [('bagel', 98.0, True)],
    'Croissant': [('croissant', 57.0, True)],
    'Pizza (Cheese)': [('slice', 107.0, True)],
    'Pizza (Pepperoni)': [('slice', 111.0, True)],
    # Indian breads — per piece.
    'Chapati': [('piece', 40.0, True)],
    'Roti (whole wheat, dry)': [('piece', 40.0, True)],
    'Plain Naan': [('piece', 90.0, True)],
    'Butter Naan': [('piece', 90.0, True)],
    'Garlic Naan': [('piece', 90.0, True)],
    # Proteins — per piece / breast / thigh.
    'Chicken breast': [('breast', 174.0, True)],
    'Chicken thigh': [('thigh', 111.0, True)],
    'Paneer': [('piece', 30.0, True)],
    'Sardines': [('can', 92.0, True)],
    'Tuna (canned)': [('can', 142.0, True)],
    # Liquids — per cup (8 fl oz, 244 g / 240 ml).
    'Milk': [('cup', 244.0, True)],
    'Curd': [('cup', 245.0, True)],
    'Greek yogurt': [('cup', 245.0, True)],
    'Orange juice': [('cup', 248.0, True)],
    'Almond Milk': [('cup', 240.0, True)],
    # Rice & grains — per cup, cooked.
    'White Rice (steamed)': [('cup', 158.0, True)],
    'Basmati Rice (cooked)': [('cup', 158.0, True)],
    'Brown rice cooked': [('cup', 195.0, True)],
    'Oatmeal': [('cup', 234.0, True)],
    # Fats — per tablespoon (14 g).
    'Butter': [('tbsp', 14.0, True)],
}


def iter_standard_units():
    """Yield (food_name, label, grams_per_unit, is_default) tuples."""
    for food_name, units in STANDARD_UNITS.items():
        for label, grams_per_unit, is_default in units:
            yield food_name, label, grams_per_unit, is_default
