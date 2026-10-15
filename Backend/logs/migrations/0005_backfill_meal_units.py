from django.db import migrations


def backfill_quantities(apps, schema_editor):
    """Give historical gram-based entries an explicit quantity + unit so the
    log display and re-editing work without special-casing old rows."""
    MealEntry = apps.get_model('logs', 'MealEntry')
    for entry in MealEntry.objects.filter(quantity__isnull=True):
        entry.quantity = round(entry.servings * 100, 1)
        entry.unit_label = entry.unit_label or 'g'
        entry.save(update_fields=['quantity', 'unit_label'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('logs', '0004_mealentry_quantity_mealentry_unit_label_foodunit'),
    ]

    operations = [
        migrations.RunPython(backfill_quantities, noop),
    ]
