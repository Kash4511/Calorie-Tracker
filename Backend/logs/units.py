"""Measurement-unit registry and gram-conversion helpers.

Weight units (g, kg, oz, lb) are universal: they have a fixed gram factor and
are valid for every food. Count units such as "egg", "slice" or "cup" are
food-specific and stored in the FoodUnit table with a gram weight per unit, so
any logged quantity can be converted to grams and then to macros.
"""

WEIGHT_UNITS = {
    'g': 1.0,
    'kg': 1000.0,
    'oz': 28.3495,
    'lb': 453.592,
}

DEFAULT_WEIGHT_UNIT = 'g'


class UnitError(ValueError):
    """Raised when a unit is unknown or incompatible with a food."""


def resolve_unit(food, unit_label):
    """Return {label, kind, grams_per_unit} for a unit valid on this food.

    Raises UnitError when the unit is neither a food-specific unit nor a
    universal weight unit, so callers never accept incompatible units.
    """
    label = (unit_label or DEFAULT_WEIGHT_UNIT).strip()
    unit = food.units.filter(label__iexact=label).first()
    if unit:
        return {'label': unit.label, 'kind': unit.kind, 'grams_per_unit': unit.grams_per_unit}

    lowered = label.lower()
    if lowered in WEIGHT_UNITS:
        return {'label': lowered, 'kind': 'weight', 'grams_per_unit': WEIGHT_UNITS[lowered]}

    raise UnitError(f'"{unit_label}" is not a valid unit for {food.name}.')


def convert_to_grams(food, unit_label, quantity):
    """Convert a quantity + unit into grams. Returns (quantity, unit, grams)."""
    try:
        quantity = float(quantity)
    except (TypeError, ValueError):
        raise UnitError('Enter a valid quantity.')
    if quantity <= 0:
        raise UnitError('Quantity must be greater than zero.')

    unit = resolve_unit(food, unit_label)
    return quantity, unit, quantity * unit['grams_per_unit']


def available_units(food):
    """Ordered units valid for a food: its default first, then other
    food-specific units, then the universal weight units."""
    units = []
    seen = set()
    for unit in food.units.all():
        units.append({
            'label': unit.label,
            'kind': unit.kind,
            'grams_per_unit': unit.grams_per_unit,
            'is_default': unit.is_default,
            'is_custom': unit.created_by_id is not None,
        })
        seen.add(unit.label.lower())

    for label, grams_per_unit in WEIGHT_UNITS.items():
        if label not in seen:
            units.append({
                'label': label,
                'kind': 'weight',
                'grams_per_unit': grams_per_unit,
                'is_default': False,
                'is_custom': False,
            })
    return units


def default_unit(food):
    unit = food.units.filter(is_default=True).first() or food.units.first()
    if unit:
        return {'label': unit.label, 'kind': unit.kind, 'grams_per_unit': unit.grams_per_unit}
    return {'label': DEFAULT_WEIGHT_UNIT, 'kind': 'weight', 'grams_per_unit': WEIGHT_UNITS[DEFAULT_WEIGHT_UNIT]}
