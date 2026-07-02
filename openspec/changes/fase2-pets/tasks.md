# Tasks: Fase 2 — Pets / Inmersión Emocional

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~665 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 Foundation → PR 2 Core → PR 3 Integration → PR 4 Frontend |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Backend models + repos + enums | PR 1 | ~165 lines, base to main |
| 2 | PetService + PetController | PR 2 | ~200 lines, depends on PR 1 |
| 3 | Wiring: HabitService/ShopService/GameScheduler/DataSeeder | PR 3 | ~100 lines, depends on PR 2 |
| 4 | Frontend: store + API + components + wiring | PR 4 | ~300 lines, depends on backend API |

## Phase 1: Backend Foundation

- [ ] 1.1 Add `PET` to `ItemType.java` enum
- [ ] 1.2 Create `PetMood.java` (HAPPY, CONTENT, NEUTRAL, SAD, ANGRY, DEPRESSED)
- [ ] 1.3 Create `Pet.java` entity: @OneToOne with ShopItem via @MapsId, moodWeights Map
- [ ] 1.4 Create `PlayerPet.java`: join with Player+Pet, mood, affection(0-500), isActive, lastMoodUpdate
- [ ] 1.5 Create `PetRepository.java` (extends JpaRepository)
- [ ] 1.6 Create `PlayerPetRepository.java`: findByPlayerId, findByPlayerIdAndIsActiveTrue

## Phase 2: Backend Core

- [ ] 2.1 Create `PetService.java`: mood engine — last 10 completions, species weights, streak multiplier, affection buffer bias
- [ ] 2.2 Implement `onHabitCompleted()`: +2 affection (POSITIVE), -1 (NEGATIVE), clamp [0..500], trigger mood recalc
- [ ] 2.3 Implement `applyMoodDecay()`: -1 affection daily, floor at 0, recalc mood if threshold crossed
- [ ] 2.4 Implement `selectPet()`: deactivate current, activate new, recalc mood
- [ ] 2.5 Create `PetController.java`: GET /active, GET /available, POST /select

## Phase 3: Backend Integration

- [ ] 3.1 Modify `ShopService.purchaseItem()`: if ItemType.PET → create PlayerPet (not inventory), auto-activate if none active, reject duplicate species
- [ ] 3.2 Modify `HabitService.completeHabit()`: call petService.onHabitCompleted, add petMood to CompletableResult
- [ ] 3.3 Modify `GameSchedulerService`: add daily cron for petService.applyMoodDecay()
- [ ] 3.4 Modify `DataSeeder`: seed 3-4 PET shop items + Pet species definitions with mood weights

## Phase 4: Frontend Foundation

- [ ] 4.1 Create `services/api/pets.ts`: GET active, GET available, POST select
- [ ] 4.2 Create `stores/petStore.ts` (Zustand): activePet, mood, affection, fetchActivePet, fetchAvailablePets, selectPet
- [ ] 4.3 Modify `shopStore.ts` ItemType union: add `'PET'`; modify `ShopItemCard.tsx`: add PET icon case

## Phase 5: Frontend UI

- [ ] 5.1 Create `PetAvatar.tsx`: emoji per species + mood-based floating animation
- [ ] 5.2 Create `PetMoodIndicator.tsx`: colored dot + label per mood state
- [ ] 5.3 Modify `index.tsx` (dashboard): render PetAvatar + PetMoodIndicator above stats
- [ ] 5.4 Modify `shop.tsx`: add `'PET'` to CategoryFilter and CATEGORIES array

## Phase 6: Testing

- [ ] 6.1 Unit: PetService mood engine — all 6 mood transitions, affection boundaries (0, 500), decay clamp
- [ ] 6.2 Unit: onHabitCompleted — verify ±2/-1 affection, mood recalc triggers
- [ ] 6.3 Integration: purchase PET → PlayerPet created, inventory unchanged; select active → toggle works; duplicate species rejected
- [ ] 6.4 Integration: decay cron → all PlayerPet rows decremented
