# Save as: logs/management/commands/seed_foods.py
# (create the 'management' and 'management/commands' folders, each needs an __init__.py)
#
# Run with: python manage.py seed_foods

from django.core.management.base import BaseCommand
from logs.models import FoodItem

# name, category, kcal, protein, carbs, fat, sugar — all per 100g
STARTER_FOODS = [
    ("Almonds", "Nuts & Seeds", 579, 21.2, 21.6, 49.9, 4.4),
    ("Aloo Gobhi", "Dal & Curry", 110, 2.5, 12.0, 6.0, 2.0),
    ("Aloo Paratha", "Roti & Bread", 260, 5.5, 34.0, 11.0, 1.5),
    ("Apple", "Fruits", 52, 0.3, 14.0, 0.2, 10.0),
    ("Baingan Bharta", "Dal & Curry", 95, 2.0, 9.0, 5.5, 3.0),
    ("Banana", "Fruits", 89, 1.1, 23.0, 0.3, 12.0),
    ("Basmati Rice (cooked)", "Rice & Grains", 130, 2.7, 28.0, 0.3, 0.1),
    ("Chapati", "Roti & Bread", 297, 10.0, 60.0, 3.7, 1.0),
    ("Chicken Curry", "Non-Veg", 180, 16.0, 6.0, 10.0, 2.0),
    ("Dal Tadka", "Dal & Curry", 104, 5.8, 15.0, 2.5, 1.5),
    ("Idli", "Rice & Grains", 39, 2.0, 8.0, 0.2, 0.5),
    ("Masala Chai (with milk & sugar)", "Beverages", 60, 1.5, 9.0, 2.0, 8.0),
    ("Paneer", "Dairy", 265, 18.3, 1.2, 20.8, 1.2),
    ("Poha", "Rice & Grains", 130, 2.5, 24.0, 3.0, 1.0),
    ("Roti (whole wheat, dry)", "Roti & Bread", 300, 11.0, 55.0, 5.0, 1.0),
]


class Command(BaseCommand):
    help = "Seed a starter FoodItem catalog"

    def handle(self, *args, **options):
        created = 0
        for name, category, kcal, p, c, f, s in STARTER_FOODS:
            _, was_created = FoodItem.objects.get_or_create(
                name=name,
                defaults=dict(
                    category=category,
                    calories_per_100g=kcal,
                    protein_per_100g=p,
                    carbs_per_100g=c,
                    fat_per_100g=f,
                    sugar_per_100g=s,
                ),
            )
            if was_created:
                created += 1
        self.stdout.write(self.style.SUCCESS(f"Seeded {created} food items ({len(STARTER_FOODS)} total in list)."))
