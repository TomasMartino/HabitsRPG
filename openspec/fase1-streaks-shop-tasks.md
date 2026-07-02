# Tasks: Fase 1 — Streaks + Shop

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,800 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: Streak BE → PR 2: Shop BE → PR 3: FE Core → PR 4: FE Screens → PR 5: Polish |
| Delivery strategy | auto-chain with manual confirmation |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Streak backend (entities, service, controller, HabitService integration) | PR 1 | Standalone — all streak mechanics working via API |
| 2 | Shop backend (entities, service, controller, seeder, PlayerService refactor) | PR 2 | Depends on PR 1 only via Player model (gems+@Version) |
| 3 | Frontend stores + API services + playerStore/habitStore updates | PR 3 | Depends on PR 1+2 API contracts |
| 4 | Frontend screens (shop, habits streak badge, dashboard) | PR 4 | Depends on PR 3 |
| 5 | Polish + testing (rarity colors, toast, edge cases) | PR 5 | Depends on all above |

---

## Phase 1 — Backend Foundation

### Task 1: Add `gems` + `@Version` to Player + PlayerStatsDTO
**Area**: backend
**Depends on**: none
**Files to modify**: `models/Player.java`, `dto/PlayerStatsDTO.java`, `controllers/PlayerController.java`
**Estimated effort**: S
**Description**: Add `private int gems = 0` + `@Version private Integer version` to Player.java, add `private int gems` to PlayerStatsDTO.java, pass `player.getGems()` in PlayerController.getPlayerStats() DTO construction.
**Completion criteria**: `GET /api/player/{id}/stats` returns `gems` field; existing endpoints unchanged; Hibernate manages `@Version` on updates.

### Task 2: Create streak entities + repositories + DB schema
**Area**: backend
**Depends on**: none (parallel with Task 1)
**Files to create**: `models/HabitCompletion.java`, `models/HabitStreak.java`, `models/StreakTier.java`, `repositories/HabitCompletionRepository.java`, `repositories/HabitStreakRepository.java`
**Files to modify**: none
**Estimated effort**: M
**Description**: Create JPA entities for `habit_completions` (with UNIQUE on habit_id+player_id+completed_date) and `habit_streaks` (with UNIQUE on habit_id+player_id). Create `StreakTier` record with 5 multiplier tiers (7d→1.5x, 14d→1.75x, 30d→2x, 60d→2.5x, 90d→3x). Create corresponding repositories with streak-calculation queries (findCompletedDatesByHabitAndPlayer, findByHabitIdAndPlayerId). Run SQL migrations for both tables.
**Completion criteria**: Tables created in DB; repositories compile and can query; `StreakTier.getMultiplier()` returns correct values for all tiers.

### Task 3: Create StreakService with lazy evaluation + integrate into HabitService
**Area**: backend
**Depends on**: Task 2
**Files to create**: `services/StreakService.java` (+ data records: `StreakResult`, `StreakData`, `StreakSummary`, `CompletableResult`)
**Files to modify**: `services/HabitService.java`, `controllers/HabitController.java`
**Estimated effort**: M
**Description**: Create `StreakService` with `recordCompletion()` (idempotent, throws `DuplicateCompletionException` on duplicate), `getStreakData()`, `getAllStreaksForPlayer()`. Algorithm: check cached `HabitStreak.lastCompletedDate` — consecutive→increment, gap→reset, same day→409. Inject `StreakService` into `HabitService.completeHabit()`: record streak first, apply multiplier to XP/gold rewards, return `CompletableResult` with streak data. Update `HabitController.completeHabit` response to include `currentStreak`, `longestStreak`, `streakMultiplier`, `xpEarned`, `goldEarned`.
**Completion criteria**: Completing a POSITIVE habit returns streak data in response; duplicate completion returns HTTP 409; multiplier applied to rewards; NEGATIVE habits skip streak tracking.

### Task 4: Create shop entities + enums + repositories
**Area**: backend
**Depends on**: none (parallel with Tasks 1-2)
**Files to create**: `models/ItemType.java`, `models/Rarity.java`, `models/EffectType.java`, `models/EquipSlot.java`, `models/ShopItem.java`, `models/PlayerInventory.java`, `models/PlayerEquipment.java`, `repositories/ShopItemRepository.java`, `repositories/PlayerInventoryRepository.java`, `repositories/PlayerEquipmentRepository.java`
**Estimated effort**: M
**Description**: Create enums (CONSUMABLE/COSMETIC/BOOST, COMMON→LEGENDARY, HEAL/ENERGY/XP_BOOST/GOLD_BOOST/COSMETIC, SKIN/ACCESSORY_1/ACCESSORY_2). Create `ShopItem` (all catalog fields, `EquipSlot` for cosmetics, `@PrePersist`/`@PreUpdate` timestamps). Create `PlayerInventory` with quantity + `expires_at` for BOOST items. Create `PlayerEquipment` with slot-based UNIQUE constraint (one per slot per player). Create repositories with query methods (findByIsPurchasableTrue, findByPlayerId, etc.). Run SQL migrations for all 3 tables.
**Completion criteria**: All 3 tables created; enums compile; repositories can insert/query; slot UNIQUE constraint enforced at DB level.

### Task 5: Create ShopService with pessimistic lock + custom exceptions
**Area**: backend
**Depends on**: Task 4
**Files to create**: `services/ShopService.java`, exception classes (`DuplicateCompletionException`, `InsufficientCurrencyException`, `ItemNotAvailableException`, `NotEquippableException`, `ItemNotFoundException`, `MaxOwnedExceededException`) + data records (`PurchaseResult`, `InventoryDTO`, `EquipmentDTO`)
**Files to modify**: `repositories/PlayerRepository.java` — add `findByIdWithLock()` with `@Lock(PESSIMISTIC_WRITE)`
**Estimated effort**: L
**Description**: Create `ShopService` with: `getCatalog(category)` — filter by type; `purchaseItem()` — acquire PESSIMISTIC_WRITE lock, validate gold/gems/maxOwned, deduct currency, upsert inventory (with expiry for BOOST items), apply consumable effects immediately (HEAL→health cap 100, ENERGY→energy cap 100); `equipItem()` — validate COSMETIC type, replace slot; `unequipItem()` — delete slot; `getInventory()` — return DTOs with `isEquipped` flag; `getEquipment()`. Add `findByIdWithLock()` to PlayerRepository. Create custom exception classes with error codes for controller error mapping.
**Completion criteria**: Purchase flow works end-to-end with concurrency protection; equip/unequip enforces slot uniqueness; exceptions map to correct HTTP error codes.

---

## Phase 2 — Backend API

### Task 6: Create StreakController
**Area**: backend
**Depends on**: Task 3
**Files to create**: `controllers/StreakController.java`
**Estimated effort**: S
**Description**: Create controller with `GET /api/streaks/habit/{habitId}?playerId=X` (returns `StreakData`) and `GET /api/streaks/player/{playerId}` (returns array of `StreakSummary`). Include try/catch with proper error responses.
**Completion criteria**: Both endpoints return correct streak data; 404 for invalid IDs.

### Task 7: Create ShopController
**Area**: backend
**Depends on**: Task 5
**Files to create**: `controllers/ShopController.java`
**Estimated effort**: M
**Description**: Create controller with: `GET /api/shop/items?category=X` (catalog), `POST /api/shop/buy/{itemId}` (purchase), `GET /api/shop/inventory?playerId=X`, `GET /api/shop/equipment?playerId=X`, `POST /api/shop/inventory/equip/{inventoryId}`, `POST /api/shop/inventory/unequip/{slot}`. Map each exception to proper HTTP status and error response format per spec.
**Completion criteria**: All 6 endpoints work; error responses match spec contracts (INSUFFICIENT_GOLD, NOT_EQUIPPABLE, etc.).

### Task 8: Update DataSeeder + refactor PlayerService.buyHealthPotion
**Area**: backend
**Depends on**: Tasks 4, 5
**Files to modify**: `config/DataSeeder.java`, `services/PlayerService.java`
**Estimated effort**: M
**Description**: Extend `DataSeeder` (CommandLineRunner) to seed 9 shop items: 3 consumables (Health Potion, Energy Potion, Hero Elixir), 4 cosmetics (Adventurer Tunic, Shadow Cape, Phoenix Amulet, Dragon Armor), 2 boosts (Tome of Wisdom, Amulet of Wealth) — all with proper types, rarities, prices, and equip slots. Inject `ShopService` into `PlayerService`, refactor `buyHealthPotion()` to delegate to `shopService.purchaseItem(playerId, 1L)` with `@Deprecated` annotation. Keep old endpoint for backward compatibility.
**Completion criteria**: App startup seeds 9 shop items (idempotent — skip if already seeded); `POST /api/player/{id}/buy-potion` still works (delegates to ShopService).

---

## Phase 3 — Frontend Foundation

### Task 9: Create shopStore + API services
**Area**: frontend
**Depends on**: Task 7 (API contract)
**Files to create**: `stores/shopStore.ts`, `services/api/shop.ts`, `services/api/streaks.ts`
**Files to modify**: `stores/playerStore.ts` — add `gems` to `PlayerStats` interface; `stores/habitStore.ts` — capture `currentStreak`, `longestStreak`, `streakMultiplier` in `completeHabit` response
**Estimated effort**: M
**Description**: Create `shopStore` (Zustand) with: `catalog`, `inventory`, `equipment` state; `isPurchasing` guard (blocks duplicate purchases); `fetchCatalog(category?)`, `fetchInventory()`, `fetchEquipment()`, `purchaseItem(itemId)` (with finally block reset), `equipItem(inventoryId)`, `unequipItem(slot)`. Create `shop.ts` API service (getCatalog, buy, getInventory, getEquipment, equip, unequip). Create `streaks.ts` API service (getByHabit, getAllForPlayer). Update `playerStore.ts` — add `gems` field to `PlayerStats`. Update `habitStore.ts` — extract streak fields from `completeHabit` response.
**Completion criteria**: All stores compile; API calls succeed with correct contracts; `isPurchasing` flow prevents double-click.

### Task 10: Create StreakBadge + ShopItemCard + PurchaseConfirmModal components
**Area**: frontend
**Depends on**: Task 9
**Files to create**: `components/StreakBadge.tsx`, `components/ShopItemCard.tsx`, `components/PurchaseConfirmModal.tsx`
**Estimated effort**: M
**Description**: Create `StreakBadge` — shows "🔥 Nd" with color tiering (gray 0-2, bronze 3-6, silver 7-13, gold 14-29, diamond 30+); hides when streak=0. Create `ShopItemCard` — item name, rarity-colored border, description, price buttons (gold/gems), buy button disabled when insufficient funds or `isPurchasing`. Create `PurchaseConfirmModal` — Expo Router modal with item preview, price, Confirm/Cancel; handles success alert vs error display distinct per error type.
**Completion criteria**: Components render correctly in isolation; colors match rarity/streak tier specs; buy button disables during purchase.

### Task 11: Update playerStore + habitStore with new fields
**Area**: frontend
**Depends on**: Task 9
**Files to modify**: `stores/playerStore.ts`, `stores/habitStore.ts`
**Estimated effort**: S
**Description**: Add `gems` to `PlayerStats` interface in playerStore. Update `completeHabit` in habitStore to return streak data (`currentStreak`, `longestStreak`, `streakMultiplier`) alongside player data. Ensure `fetchPlayer` in playerStore refreshes after shop purchases via the dynamic import in shopStore.
**Completion criteria**: Player stats include gems; habit completion response includes streak fields.

---

## Phase 4 — Frontend Screens

### Task 12: Create shop.tsx + update tab layout
**Area**: frontend
**Depends on**: Tasks 9, 10
**Files to create**: `app/(tabs)/shop.tsx`
**Files to modify**: `app/(tabs)/_layout.tsx`
**Files to delete**: `app/(tabs)/explore.tsx`
**Estimated effort**: M
**Description**: Replace `explore.tsx` content with `shop.tsx` — header with gold badge, Catalog/Inventory toggle, 2-column catalog FlatList with `ShopItemCard`, inventory FlatList with equip/unequip buttons. Wire `PurchaseConfirmModal` for buy flow. Update `_layout.tsx`: 3 tabs only — Dashboard (index), Hábitos (habits), Tienda (shop). Add `cart.fill` icon for shop tab. Delete `explore.tsx`.
**Completion criteria**: Navigation shows 3 tabs; Shop tab shows catalog grid; toggle to inventory shows owned items with equip/unequip; purchase flow triggers confirmation modal.

### Task 13: Add StreakBadge to HabitCard
**Area**: frontend
**Depends on**: Task 10
**Files to modify**: `components/HabitCard.tsx`
**Estimated effort**: S
**Description**: Import and render `<StreakBadge streak={habit.currentStreak} />` inside `HabitCard` (between stats row and chevron). Show only for POSITIVE habits with streak > 0. Color codes by streak tier per design spec.
**Completion criteria**: Habits screen shows colored streak badges on cards with active streaks; zero-streak habits show no badge.

### Task 14: Update Dashboard (gems, shop link, streak summary, equipment)
**Area**: frontend
**Depends on**: Tasks 9, 10, 11
**Files to modify**: `app/(tabs)/index.tsx`
**Estimated effort**: M
**Description**: Replace the hardcoded "🍷 Comprar Poción" button with "🏪 Ir a la Tienda" link (navigates to shop tab via `router.navigate('/(tabs)/shop')`). Add gem display (`💎 {player?.gems}`) next to gold line. Add a "Streaks" section showing top habit streaks with multipliers. Add an equipment preview section showing equipped cosmetics (SKIN, accessories) with item names and rarities.
**Completion criteria**: Dashboard shows gems, shop navigation link, top streaks with multipliers, and equipped items preview.

---

## Phase 5 — Polish

### Task 15: RPG visual polish
**Area**: frontend
**Depends on**: Tasks 12, 13, 14
**Files to create**: `components/InventoryList.tsx`, `components/EquipmentSlot.tsx`, `components/ItemRarityBorder.tsx`
**Files to modify**: various screen files for integration
**Estimated effort**: M
**Description**: Add rarity border colors (white/green/blue/purple/orange) to `ShopItemCard` and inventory items via `ItemRarityBorder` wrapper. Create `EquipmentSlot` component for Dashboard equipment section (SKIN slot centered, accessory slots on sides). Add toast-style notifications for purchase success/failure (replaces `Alert.alert` with temporary in-app overlay). Implement streak badge animation (subtle pulse on new streak day).
**Completion criteria**: Rarity colors visible on all item cards; equipment slots render on Dashboard; purchase notifications are toast-style (non-blocking).

### Task 16: Edge case handling + testing
**Area**: both
**Depends on**: Tasks 1-15
**Files to create**: test files: `StreakServiceTest.java`, `ShopServiceTest.java` (under `src/test/java`)
**Estimated effort**: L
**Description**: Backend tests: `StreakServiceTest` — mock repository, test all streak scenarios (first completion, consecutive, gap reset, duplicate 409, multiplier tiers at boundaries: 6→7, 13→14, 29→30, 89→90). `ShopServiceTest` — test purchase with insufficient gold/gems, max_owned limit, concurrent purchase (CountDownLatch), equip non-cosmetic, equip unowned item. Frontend: handle 409 in `habitStore.completeHabit` (show "Already completed today" message), handle `INSUFFICIENT_GOLD` in shopStore (distinct from network errors), handle `isPurchasing` stuck state safety (timeout fallback). Verify all spec error states return correct HTTP codes and messages.
**Completion criteria**: All spec scenarios pass; concurrent purchase test validates lock behavior; frontend shows distinct messages per error type; no stuck loading states.
