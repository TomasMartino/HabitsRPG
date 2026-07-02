# SDD Proposal: Fase 1 — Streaks + Shop

- **Artifact**: `sdd/fase1-streaks-shop/proposal` (engram)
- **File**: `openspec/fase1-streaks-shop-proposal.md`
- **Date**: 2026-07-01
- **Author**: System Architect (AI-assisted)

---

## 1. Intent

Extend the HabitsRPG game loop with two core engagement mechanics: **streak tracking** and a **shop economy**. These turn habit completion from a one-shot transaction into a compounding progression system — players are rewarded for consistency (streaks) and have meaningful ways to spend their earned gold (shop), creating a reinforcing loop: complete habits → earn gold/XP → buy items → stay motivated → complete more habits.

The hardcoded `buyHealthPotion` logic in `PlayerService` will be refactored into the new `ShopService`, making the shop the single source of truth for all purchases.

---

## 2. Scope

### In Scope

**Feature A — Streak System**
- New `habit_completions` table tracking each completion per habit per day
- Current streak calculation (consecutive calendar days with a completion)
- Longest streak tracking per habit (historical max)
- Streak-based XP multiplier: configurable thresholds (e.g. 1.5× at 7 days, 2× at 30 days)
- Daily streak expiry check via scheduler (if no completion in the current calendar day → reset)
- Backend API: streak stats per habit, per player
- Frontend: streak badges on `HabitCard`, streak indicator in `HabitDetailModal`, streak summary on Dashboard
- Scheduler extension in `GameSchedulerService` for daily streak validation

**Feature B — Shop with Gold Economy**
- New `shop_items` table (catalog of purchasable items, configurable via seed data)
- Item types: `CONSUMABLE` (health potions, energy potions), `COSMETIC` (themes, skins), `BOOST` (temporary XP multipliers)
- New `player_inventory` table (player_id, item_id, quantity, is_equipped)
- Central `ShopService`: list items, purchase flow (select → confirm → deduct gold → add to inventory)
- Equipment system: equip/unequip cosmetic items
- Refactor `PlayerService.buyHealthPotion()` into `ShopService`
- Player model changes: add `gems` field (premium currency), add `equippedCosmetic` or generic equipped-items field
- Frontend: Shop screen (grid of items with prices), Inventory screen (owned items + equip/unequip), purchase confirmation flow
- New `shopStore` (Zustand) for shop + inventory state
- New tab entry for Shop in tab navigation

### Out of Scope
- **Multiplayer or social features** — no guilds, trading, or sending gifts
- **Real-money purchases** — gems are earned in-game only for now; no IAP integration
- **Animations or particle effects** for streaks/shop — keep it functional with the existing styling
- **Item crafting or merging** — single-item purchase only
- **Full-blown pagination** for large inventories — start with FlatList, optimize later if needed
- **Admin panel** for managing shop items — seed data + direct DB edits are fine for now
- **Push notifications** for streak expiry — keep it in-app for this phase

---

## 3. Approach

### 3.1 — Backend Database Schema (New Tables)

```sql
-- Streak tracking per habit completion
CREATE TABLE habit_completions (
    id            BIGSERIAL PRIMARY KEY,
    habit_id      BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    completed_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(habit_id, player_id, completed_at::date)  -- one completion per habit/day
);

-- Shop item catalog
CREATE TABLE shop_items (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    description   TEXT,
    item_type     VARCHAR(20) NOT NULL,  -- CONSUMABLE, COSMETIC, BOOST
    price_gold    INT NOT NULL DEFAULT 0,
    price_gems    INT NOT NULL DEFAULT 0,  -- premium currency
    effect_type   VARCHAR(30),  -- e.g. HEAL, RESTORE_ENERGY, XP_BOOST
    effect_value  INT,          -- e.g. 20 HP heal, 1.5x XP for 24h
    duration_hours INT,         -- for BOOST items: how long the effect lasts
    image_url     VARCHAR(255), -- optional icon/asset reference
    active        BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Player inventory (what they own and equip)
CREATE TABLE player_inventory (
    id            BIGSERIAL PRIMARY KEY,
    player_id     BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_id       BIGINT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    quantity      INT NOT NULL DEFAULT 1,
    is_equipped   BOOLEAN NOT NULL DEFAULT FALSE,
    acquired_at   TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, item_id)  -- one row per item type per player
);
```

### 3.2 — Backend Model Changes

**New Entities (JPA):**
- `HabitCompletion` — maps to `habit_completions` table
- `ShopItem` — maps to `shop_items` table
- `PlayerInventory` — maps to `player_inventory` table

**Player.java — additions:**
```java
private int gems = 0;  // premium currency

// Optional: store equipped cosmetic as JSON or reference
// Simpler approach: query PlayerInventory WHERE is_equipped = TRUE
// No new field needed on Player if we use the inventory table
```

**Habit.java — additions (optional caching fields):**
```java
private int currentStreak = 0;     // cached for fast reads
private int longestStreak = 0;     // cached for fast reads
// OR calculate these on-the-fly via HabitCompletion query — prefer the query approach initially
```

**PlayerStatsDTO.java — additions:**
```java
private int gems;
// Streak data will come from a separate endpoint or embedded in habit responses
```

### 3.3 — Backend Services

**StreakService.java** (new):
- `recordCompletion(habitId, playerId)` — inserts a `HabitCompletion`, recalculates streak
- `calculateCurrentStreak(habitId, playerId)` — counts consecutive days backwards from today
- `calculateLongestStreak(habitId, playerId)` — max historical consecutive days
- `getStreakMultiplier(streak)` — returns the XP multiplier factor
- `checkAndResetStreaks()` — scheduled method: if no completion for today, reset streak

**ShopService.java** (new):
- `getCatalog()` — returns all active `ShopItem` entries
- `purchaseItem(playerId, itemId)` — validates gold/gems → deducts currency → creates `PlayerInventory` row (or increments quantity) → applies immediate effect for consumables
- `useConsumable(playerId, inventoryId)` — applies the item effect (heal, restore energy) and decrements quantity
- `equipItem(playerId, inventoryId)` / `unequipItem(playerId, inventoryId)` — toggle `is_equipped`
- `getInventory(playerId)` — returns all `PlayerInventory` rows for the player

**Refactor PlayerService.buyHealthPotion():**
- Remove the hardcoded method (or keep it as a thin delegate)
- Create a seed `ShopItem` row for "Health Potion" (type=CONSUMABLE, effect_type=HEAL, effect_value=20, price_gold=50)
- Frontend calls `ShopService.purchaseItem()` instead of the old `/buy-potion` endpoint
- Backward compat: keep the old endpoint but have it delegate to `ShopService`

**GameSchedulerService.java — extension:**
- Add a `@Scheduled(cron = "0 0 0 * * *")` (midnight) method: `checkStreaks()`
- This iterates all habits, checks if a completion exists for today → if not, calls `StreakService` to reset

### 3.4 — Backend Controllers

**StreakController.java** (new):
- `GET /api/streaks/player/{playerId}` — all streak data for the player
- `GET /api/streaks/habit/{habitId}/player/{playerId}` — streak data for a specific habit

**ShopController.java** (new):
- `GET /api/shop/items` — catalog
- `POST /api/shop/buy` — purchase flow `{ playerId, itemId }`
- `GET /api/shop/inventory/{playerId}` — player inventory

**PlayerController.java — modifications:**
- Keep `/buy-potion` but have it delegate internally to `ShopService.purchaseItem()`
- Add `gems` to `PlayerStatsDTO` response

**HabitController.java — modifications:**
- After completing a habit, return streak info alongside the player response (or provide a separate streak endpoint)

### 3.5 — Backend Streak Multiplier Logic

```java
public class StreakService {
    private static final List<StreakTier> TIERS = List.of(
        new StreakTier(7, 1.5),   // 7-day streak: 1.5x XP
        new StreakTier(14, 1.75), // 14-day streak: 1.75x XP
        new StreakTier(30, 2.0),  // 30-day streak: 2x XP
        new StreakTier(60, 2.5),  // 60-day streak: 2.5x XP
        new StreakTier(90, 3.0)   // 90-day streak: 3x XP
    );

    public double getMultiplier(int currentStreak) {
        double multiplier = 1.0;
        for (StreakTier tier : TIERS) {
            if (currentStreak >= tier.days) {
                multiplier = Math.max(multiplier, tier.multiplier);
            }
        }
        return multiplier;
    }
}
```

### 3.6 — Frontend Changes

**New screens:**
- `app/(tabs)/shop.tsx` — Grid of shop items, purchase flow
- `app/(tabs)/inventory.tsx` — Owned items, equip/unequip

**Tab navigation update** (`_layout.tsx`):
- Add 2 new tab entries: Shop (🛒) and Inventory (🎒) — or merge inventory into a sub-screen of shop
- **Recommendation**: 3 tabs total: Dashboard | Habits | Shop
- Inventory is a sub-screen accessible from a button inside Shop or from the Dashboard

**New store:**
- `stores/shopStore.ts` — shop items, inventory, purchase, equip actions

**New components:**
- `components/StreakBadge.tsx` — flame icon + streak count for HabitCard
- `components/ShopItemCard.tsx` — item card for the shop grid
- `components/InventoryItemCard.tsx` — item card with equip/unequip toggle
- `components/PurchaseConfirmModal.tsx` — confirmation dialog before purchase

**HabitCard.tsx — modification:**
- Add a streak badge (🔥 N días) in the top-right or below the stats
- Color coding: gray for 0-2, bronze for 3-6, silver for 7-13, gold for 14-29, diamond for 30+

**HabitDetailModal.tsx — modification:**
- Show current streak with multiplier indicator
- "Streak: 12 days 🔥 1.5x XP Bonus Active"

**Dashboard (index.tsx) — modification:**
- Add a small "Streaks" section showing best streaks
- Replace the manual "Comprar Poción" button with a Shop entry link/button
- Show gem count

**PlayerStore.ts — additions:**
- Add `gems` and streak data to the `PlayerStats` interface

### 3.7 — Frontend API Services

**New service files:**
- `services/api/shop.ts` — shop endpoints
- `services/api/streaks.ts` — streak endpoints

### 3.8 — Phase Implementation Order

Suggested build order (each step is independently testable):

| Step | What | Why |
|------|------|-----|
| 1 | Create `HabitCompletion` entity + migration | Foundation for streaks, independent of all other changes |
| 2 | Create `StreakService` + `StreakController` | Core streak logic testable immediately |
| 3 | Integrate streak into `HabitService.completeHabit()` | Streaks happen when habits are completed |
| 4 | Add streak frontend: `StreakBadge`, streak display on HabitCard, habitStore extension | Visual feedback for streak mechanic |
| 5 | Create `ShopItem` + `PlayerInventory` entities + migration | Foundation for shop |
| 6 | Create `ShopService` + `ShopController` | Core shop logic |
| 7 | Refactor `buyHealthPotion()` → delegate to `ShopService` | Cleanup, backward compat |
| 8 | Add `gems` field to `Player` + `PlayerStatsDTO` | Economy expansion |
| 9 | Frontend: `shopStore`, Shop screen, purchase flow | End-to-end shop experience |
| 10 | Frontend: Inventory screen, equip/unequip | Full inventory management |
| 11 | Extend `GameSchedulerService` for daily streak expiry | Automation |
| 12 | Add gems display, streak summary to Dashboard | Polish and visibility |

---

## 4. Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Streak reset timing bugs** — timezone differences between server and user cause premature or missed resets | Medium | High | Use UTC for all streak calculations. Store `completed_at` as TIMESTAMP WITH TIME ZONE. The scheduler runs at midnight UTC. Consider per-user timezone later. |
| **Shop race condition** — two concurrent requests buy the same item, causing negative gold or duplicate inventory | Low | High | Use `@Transactional` with `PESSIMISTIC_WRITE` lock on the player row during purchase. Or use an optimistic lock (`@Version` on Player). The transaction boundary is small (validate → deduct → insert). |
| **Frontend stale streak data** — user completes a habit but the streak badge doesn't update | Medium | Low | Streak data is refreshed when habits are fetched (habitStore.fetchHabits()). The purchase flow re-fetches player data. Use optimistic updates in Zustand as a future improvement. |
| **Database migration complexity** — adding multiple tables in a single deploy could cause locking on Supabase | Low | Medium | Create tables one at a time via separate migration scripts. Supabase's Postgres handles DDL with minimal locking for new tables (no existing data to migrate). |
| **Performance: streak recalculation** — recalculating streaks for all players every midnight could be slow at scale | Low | Low (currently single-player app) | The current app has a single player. Cache streaks on the `habits` table as denormalized fields (`current_streak`, `longest_streak`) and recalculate incrementally instead of from scratch. |
| **Item effect complexity** — consumables need to interact with existing systems (heal, restore energy, boost XP) without side effects | Medium | Medium | Each `ShopItem.effect_type` maps to a well-defined handler in ShopService. Use a strategy pattern: `Map<EffectType, Consumer<Player>>`. New effect types are just new entries. |
| **Frontend navigation complexity** — adding 2 new tabs could make the bottom tab bar crowded | Medium | Low | Use 3 tabs maximum (Dashboard, Habits, Shop). Inventory is a sub-screen of Shop or accessible from Dashboard. Avoid feature bloat in the tab bar. |

---

## 5. Artifact References

| Artifact | Location |
|----------|----------|
| **Engram topic key** | `sdd/fase1-streaks-shop/proposal` |
| **Proposal file** | `openspec/fase1-streaks-shop-proposal.md` |
| **Next artifact type** | Spec (`sdd-spec`) — use this proposal as input |
| **Next skill** | `sdd-spec` — write delta specs with requirements and scenarios |
| **Design phase after spec** | `sdd-design` — technical design with class diagrams, data flow |
