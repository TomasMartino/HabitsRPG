# Shop + Economy Specification

## Purpose

Provide a gold/gem economy where players purchase items from a catalog, manage an inventory, and equip cosmetics. The shop is the single source of truth for all purchases, replacing the hardcoded `buyHealthPotion` logic. Concurrency is handled via `@Transactional` + `PESSIMISTIC_WRITE` lock with `@Version` as optimistic fallback.

## Requirements

### Requirement: Player Currency — Gems

The system SHALL maintain a `gems` field (int, default 0) on the Player entity, serving as a premium currency alongside gold.

#### Scenario: Gems field exists on Player

- GIVEN the Player entity
- THEN it contains a `gems` field (int, default 0)
- AND `gems` is included in `PlayerStatsDTO` responses

### Requirement: Shop Catalog

The system SHALL expose a catalog of purchasable items via the shop endpoint.

#### Scenario: List all purchasable items

- GIVEN the shop has 5 active items in `shop_items`
- WHEN GET /api/shop/items is called
- THEN response contains an array of 5 items with `id`, `name`, `description`, `itemType`, `rarity`, `priceGold`, `priceGems`, `imageUrl`

#### Scenario: Filter by item type

- GIVEN the shop has 2 CONSUMABLE and 3 COSMETIC items
- WHEN GET /api/shop/items?category=CONSUMABLE is called
- THEN response contains only the 2 CONSUMABLE items

### Requirement: Purchase Item with Gold

The system SHALL allow players to purchase items using gold, with full concurrency protection.

#### Scenario: Successful gold purchase

- GIVEN a player has 100 gold and an item costs 50 gold
- WHEN POST /api/shop/buy/{itemId} is called with the player's ID
- THEN the player's gold decreases by 50
- AND the item is added to `player_inventory` (quantity incremented if already owned)
- AND response contains `{ success: true, goldRemaining: 50, quantity: 1 }`

#### Scenario: Insufficient gold

- GIVEN a player has 30 gold and an item costs 50 gold
- WHEN POST /api/shop/buy/{itemId} is called
- THEN response returns HTTP 400 with `error: "INSUFFICIENT_GOLD"`

#### Scenario: Purchase with gems

- GIVEN a player has 10 gems and a cosmetic item costs 5 gems
- WHEN POST /api/shop/buy/{itemId} is called
- THEN the player's gems decrease by 5
- AND the item is added to inventory

#### Scenario: Insufficient gems

- GIVEN a player has 3 gems and an item costs 5 gems
- WHEN POST /api/shop/buy/{itemId} is called
- THEN response returns HTTP 400 with `error: "INSUFFICIENT_GEMS"`

#### Scenario: Item not active

- GIVEN a shop item has `is_purchasable = false`
- WHEN POST /api/shop/buy/{itemId} is called
- THEN response returns HTTP 400 with `error: "ITEM_NOT_AVAILABLE"`

### Requirement: Concurrency Protection on Purchase

The system SHALL prevent race conditions during concurrent purchases using pessimistic locking.

#### Scenario: Double-click purchase guard

- GIVEN a player clicks "Buy" twice rapidly
- WHEN two purchase requests arrive concurrently
- THEN the first request acquires the PESSIMISTIC_WRITE lock and processes
- AND the second request blocks until the first commits, then fails with "INSUFFICIENT_GOLD" (or succeeds if gold was sufficient)
- AND no negative gold or duplicate items occur

#### Scenario: Frontend isPurchasing guard

- GIVEN a purchase is in progress (`isPurchasing = true`)
- WHEN the user taps "Buy" again
- THEN the button is disabled and the request is blocked client-side

### Requirement: Item Types and Effects

The system SHALL support three item types with distinct behaviors.

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

### Requirement: Equipment System

The system SHALL allow players to equip and unequip cosmetic items.

#### Scenario: Equip cosmetic

- GIVEN a player owns a Dragon Skin (type=COSMETIC) in inventory
- WHEN POST /api/inventory/equip/{itemId} is called
- THEN the item's `is_equipped` flag is set to true
- AND any previously equipped item in the same slot is unequipped

#### Scenario: Unequip item

- GIVEN a player has a Dragon Skin equipped
- WHEN POST /api/inventory/unequip/{slot} is called
- THEN the item's `is_equipped` flag is set to false

#### Scenario: Cannot equip non-cosmetic

- GIVEN a player owns a Health Potion (type=CONSUMABLE)
- WHEN POST /api/inventory/equip/{itemId} is called
- THEN response returns HTTP 400 with `error: "NOT_EQUIPPABLE"`

#### Scenario: Cannot equip unowned item

- GIVEN a player does not own item X
- WHEN POST /api/inventory/equip/{itemId} is called for item X
- THEN response returns HTTP 404 with `error: "ITEM_NOT_IN_INVENTORY"`

### Requirement: Inventory Listing

The system SHALL provide a list of all items a player owns.

#### Scenario: List inventory

- GIVEN a player owns 3 items (Health Potion x2, Dragon Skin x1, XP Boost x1)
- WHEN GET /api/inventory is called
- THEN response contains 3 inventory entries with `itemId`, `name`, `quantity`, `isEquipped`, `expiresAt`

### Requirement: Refactor buyHealthPotion

The system SHALL delegate the existing `POST /player/{id}/buy-potion` endpoint to `ShopService`.

#### Scenario: Backward-compatible potion purchase

- GIVEN the old `/buy-potion` endpoint is called
- WHEN the request is processed
- THEN it delegates to `ShopService.purchaseItem()` internally
- AND the response format remains unchanged for backward compatibility

### Requirement: Frontend Shop Screen

The system SHALL provide a Shop screen (replacing `explore.tsx`) with catalog browsing and purchase flow.

#### Scenario: Shop tab navigation

- GIVEN the app has 3 tabs (Dashboard, Hábitos, Tienda)
- WHEN the user taps the Tienda tab
- THEN the Shop screen loads with a grid of items

#### Scenario: Purchase confirmation flow

- GIVEN the user taps "Buy" on an item
- WHEN a PurchaseConfirmModal appears
- THEN it shows item name, description, price, and Confirm/Cancel buttons
- AND Confirm triggers the purchase; Cancel dismisses the modal

#### Scenario: Insufficient funds UI

- GIVEN a player has 30 gold and an item costs 50
- WHEN the Shop screen renders
- THEN the Buy button for that item is disabled/grayed out

### Requirement: Frontend Inventory Sub-Screen

The system SHALL provide an Inventory section within the Shop screen.

#### Scenario: Toggle to inventory view

- GIVEN the user is on the Shop screen
- WHEN the user taps "Mi Inventario 🎒"
- THEN the view switches to show owned items with equip/unequip buttons

#### Scenario: Equip from inventory

- GIVEN the user sees an unequipped cosmetic in inventory
- WHEN the user taps "Equipar"
- THEN the item becomes equipped and the button changes to "Equipado ✓"

### Requirement: Dashboard Updates

The system SHALL update the Dashboard to reflect the new shop and economy.

#### Scenario: Remove standalone buyPotion button

- GIVEN the Dashboard previously had a "Comprar Poción" button
- WHEN the Dashboard loads
- THEN the button is replaced with "🏪 Ir a la Tienda" linking to the Shop tab

#### Scenario: Show gem count

- GIVEN a player has gems
- WHEN the Dashboard loads
- THEN the player's gem count is displayed

## Data Contracts

### GET /api/shop/items

**Response 200:**
```json
{
  "items": [
    {
      "id": 1,
      "name": "Health Potion",
      "description": "Restores 20 HP",
      "itemType": "CONSUMABLE",
      "rarity": "COMMON",
      "priceGold": 50,
      "priceGems": 0,
      "effectType": "HEAL",
      "effectValue": 20,
      "imageUrl": "/assets/health-potion.png",
      "isPurchasable": true,
      "maxOwned": null
    }
  ]
}
```

### POST /api/shop/buy/{itemId}

**Request body:** `{ "playerId": 1 }`

**Response 200:**
```json
{
  "success": true,
  "goldRemaining": 50,
  "gemsRemaining": 10,
  "quantity": 1
}
```

**Response 400 (insufficient gold):**
```json
{
  "error": "INSUFFICIENT_GOLD",
  "message": "Oro insuficiente: necesitas 50",
  "required": 50,
  "available": 30
}
```

### GET /api/inventory

**Response 200:**
```json
{
  "inventory": [
    {
      "id": 1,
      "itemId": 1,
      "name": "Health Potion",
      "quantity": 2,
      "isEquipped": false,
      "expiresAt": null
    },
    {
      "id": 2,
      "itemId": 5,
      "name": "Dragon Skin",
      "quantity": 1,
      "isEquipped": true,
      "expiresAt": null
    }
  ]
}
```

### POST /api/inventory/equip/{itemId}

**Response 200:**
```json
{ "success": true, "equipped": true }
```

**Response 400:**
```json
{ "error": "NOT_EQUIPPABLE", "message": "Only COSMETIC items can be equipped" }
```

## Validation Rules

- Purchase MUST deduct currency and add inventory atomically (`@Transactional`)
- Player row MUST be locked with `PESSIMISTIC_WRITE` during purchase
- `@Version` on Player MUST be used as optimistic lock fallback
- Frontend `isPurchasing` flag MUST block duplicate requests client-side
- Consumables: effect applied immediately, NO inventory row created
- Cosmetics: inventory row created, equip/unequip toggle allowed
- Boosts: inventory row created with `expires_at` set to `now + duration_hours`
- `max_owned` (nullable): if set, player cannot exceed this quantity

## Error States

| Error | HTTP | Condition |
|-------|------|-----------|
| `INSUFFICIENT_GOLD` | 400 | Player gold < item price_gold |
| `INSUFFICIENT_GEMS` | 400 | Player gems < item price_gems |
| `ITEM_NOT_AVAILABLE` | 400 | Item is not active/not purchasable |
| `MAX_OWNED_EXCEEDED` | 400 | Item has max_owned and player already owns that many |
| `NOT_EQUIPPABLE` | 400 | Item type is not COSMETIC |
| `ITEM_NOT_IN_INVENTORY` | 404 | Player does not own the item |
| `PLAYER_NOT_FOUND` | 404 | Invalid playerId |
| `ITEM_NOT_FOUND` | 404 | Invalid itemId |
| `OPTIMISTIC_LOCK_FAILURE` | 409 | Concurrent modification detected (@Version mismatch) |

## Files Affected

| File | Action |
|------|--------|
| `models/ShopItem.java` | Create |
| `models/PlayerInventory.java` | Create |
| `models/ItemType.java` | Create (enum) |
| `models/Rarity.java` | Create (enum) |
| `repositories/ShopItemRepository.java` | Create |
| `repositories/PlayerInventoryRepository.java` | Create |
| `services/ShopService.java` | Create |
| `controllers/ShopController.java` | Create |
| `models/Player.java` | Modify — add `gems` field, add `@Version` |
| `repositories/PlayerRepository.java` | Modify — add `findByIdWithLock()` |
| `services/PlayerService.java` | Modify — delegate buyHealthPotion to ShopService |
| Frontend: `stores/shopStore.ts` | Create |
| Frontend: `services/api/shop.ts` | Create |
| Frontend: `app/(tabs)/shop.tsx` | Create (replaces explore.tsx) |
| Frontend: `app/(tabs)/_layout.tsx` | Modify — 3-tab layout |
| Frontend: `app/(tabs)/index.tsx` | Modify — remove buyPotion, add shop link, add gems display |
| Frontend: `app/(tabs)/explore.tsx` | Delete |
