# Proposal: Fase 2 — Pets / Inmersión Emocional

## Intent

Habit completion is transactional — earn gold, no emotional feedback. Pets add a companion that reacts to discipline or neglect, turning progress into an emotional connection that drives retention.

## Scope

### In Scope
- **Mood**: HAPPY/CONTENT/NEUTRAL/SAD/ANGRY/DEPRESSED, recalculated from last 10 completions. Per-species mood weights.
- **Affection**: 0–500 score, +2/POSITIVE, -1/NEGATIVE, -1/day decay. Thresholds unlock reactions.
- **Pet Catalog**: ShopItem with `PET` type. Each has species, mood weights, icon.
- **PlayerPet**: join entity (player, pet, mood, affection, active). One active per player.
- **UI**: buy pets in shop, select active pet, mood on dashboard.
- **Decay**: daily scheduled affection decay.

### Out of Scope
Evolution, mini-games, animations, social, push notifications.

## Capabilities

### New
- `pet-system`: Pet definitions, PlayerPet, mood engine, affection, active selection, mood display.

### Modified
- `shop-economy`: PET in ItemType enum, catalog filter, purchases create PlayerPet.
- `streak-system`: Habit completion triggers `PetService.updateMood()`.

## Approach

Reuse ShopItem + PlayerInventory patterns. Mood recalc is O(1) — 10 completions. Affection capped 0–500.

**Backend**: `Pet` (species + weights), `PlayerPet` (join), `PetService`. Hook in `HabitService`. Daily decay in `GameSchedulerService`. Seed 3–4 pets.

**Frontend**: `petStore.ts` (Zustand). Shop PET filter. Owned pets view with active toggle. Mood indicator on dashboard.

## Affected Areas

| Area | Impact |
|------|--------|
| `ItemType.java` | Add `PET` |
| `Pet.java` | New |
| `PlayerPet.java` | New |
| `PetService.java` | New |
| `PetController.java` | New |
| `HabitService.java` | Hook `updateMood()` |
| `GameSchedulerService.java` | Daily decay job |
| `DataSeeder.java` | Seed pets |
| `stores/petStore.ts` | New |
| `services/api/pets.ts` | New |
| `shop.tsx` | PET filter + purchase |
| `index.tsx` | Mood indicator |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Mood recalc overhead | Low | Last 10 completions, O(1) |
| Decay feels punishing | Medium | Min affection = 0 |
| Subjective pet tuning | Medium | DB-driven weights, easy tweaks |

## Rollback Plan

1. Remove PET from ItemType (no items break).
2. Drop `pets` + `player_pets` tables.
3. Remove PetService bean + HabitService hook.
4. Frontend: remove store, revert shop filters and layout.

## Success Criteria

- [ ] Mood recalculates after each completion (API + UI)
- [ ] Affection: +2 POSITIVE, -1 NEGATIVE, -1/day decay
- [ ] Pets purchasable, appear in inventory, toggleable as active
- [ ] Active pet mood on dashboard
- [ ] Daily decay runs without errors
- [ ] All Fase 1 tests pass unchanged
