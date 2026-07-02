# Delta for Shop Economy

> Modifies: `openspec/changes/fase1-streaks-shop/specs/shop-economy/spec.md`

## MODIFIED Requirements

### Requirement: Item Types and Effects

The system SHALL support four item types with distinct behaviors: CONSUMABLE, COSMETABLE, BOOST, and PET. PET items create a PlayerPet entity on purchase and are stored in a separate `player_pets` table (not `player_inventory`).

(Previously: Three item types — CONSUMABLE, COSMETIC, BOOST)

#### Scenario: Consumable — immediate effect

- GIVEN a player buys a Health Potion (type=CONSUMABLE, effect=HEAL, value=20)
- WHEN the purchase completes
- THEN the player's health increases by 20 immediately
- AND no inventory row is created (consumed on purchase)

#### Scenario: Cosmetic — goes to inventory

- GIVEN a player buys a Dragon Skin (type=COSMETIC)
- WHEN the purchase completes
- THEN a `player_inventory` row is created with `quantity=1`
- AND the item can be equipped/unequipped

#### Scenario: Boost — inventory with expiry

- GIVEN a player buys an XP Boost (type=BOOST, duration=24h)
- WHEN the purchase completes
- THEN a `player_inventory` row is created with `expires_at = now + 24 hours`
- AND the boost effect is active until expiry

#### Scenario: Pet — creates PlayerPet

- GIVEN a player buys a Dragon (type=PET, cost=200)
- WHEN the purchase completes
- THEN a `player_pets` row is created with mood=NEUTRAL, affection=100, active=false
- AND if the player has no active pet, the new pet SHALL be set active=true
- AND gold is deducted atomically

## ADDED Requirements

### Requirement: PET ItemType in Enum

The system SHALL include `PET` as a valid value in the `ItemType` enum alongside CONSUMABLE, COSMETIC, and BOOST. The shop filtering system SHALL support filtering by PET type.

#### Scenario: Shop displays PET filter

- GIVEN the shop UI loads
- WHEN the player views available item type filters
- THEN a "Pets" filter option SHALL be present alongside existing type filters

#### Scenario: PET filter shows only pets

- GIVEN the player selects the PET filter
- WHEN the shop queries items
- THEN only items with type PET SHALL be returned

### Requirement: Duplicate Pet Purchase Prevention

The system SHALL prevent a player from purchasing a pet species they already own. The check SHALL use `player_pets` joined with `pets` to verify ownership.

#### Scenario: Player already owns the pet

- GIVEN a player already owns "Dragon" (type=PET)
- WHEN the player attempts to purchase "Dragon" again
- THEN response returns HTTP 400 with `error: "PET_ALREADY_OWNED"`

#### Scenario: Player does not own the pet

- GIVEN a player does not own "Phoenix"
- WHEN the player purchases "Phoenix"
- THEN the purchase succeeds and PlayerPet is created

### Requirement: Pet Catalog Seeding

The system SHALL seed 3–4 pet items in `shop_items` with type PET, each having species name, moodWeights (positive/negative multipliers), icon reference, and gold cost. These items SHALL use the existing `DataSeeder` pattern.

#### Scenario: Pet appears in shop with correct attributes

- GIVEN the pet catalog is seeded
- WHEN a player views the shop with PET filter
- THEN each pet SHALL display species name, icon, mood description, and gold cost
