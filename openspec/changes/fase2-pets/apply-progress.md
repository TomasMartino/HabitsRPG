# Apply Progress: Fase 2 — Pets

> MERGED — Phase 2 (Core) + Phase 3 (Integration)

## Completed

### Phase 2 — PetService + PetController

- [x] **2.1** `PetService.java` — mood engine with `recalculateMood()`:
  - Analyzes last 10 HabitCompletions per player
  - Counts POSITIVE vs NEGATIVE, applies species thresholds (angerThreshold → ANGRY, sadnessThreshold → SAD)
  - HAPPY condition: positive > negative * (2 + happinessDecay)
  - CONTENT when positive >= negative, default NEUTRAL
  - Affection ≥ 300 → boost mood one level (DEPRESSED→SAD→NEUTRAL→CONTENT→HAPPY)
- [x] **2.2** `onHabitCompleted()` — ±2/-1 affection clamp [0..500], triggers mood recalculation
- [x] **2.3** `applyMoodDecay()` — degrades mood if lastMoodUpdate > 6h ago, -1 affection if no completions in 24h
- [x] **2.4** `selectPet()` — deactivates current active pet, finds/creates PlayerPet, activates and recalculates mood
- [x] **2.5** `PetController.java` — GET /active, GET /available, POST /select, POST /decay

### Phase 3 — Backend Integration

- [x] **3.1** `ShopService.purchaseItem()` — PET type creates PlayerPet (not inventory), rejects if already owned via `existsByPlayerIdAndPetId`, auto-activates if no active pet
- [x] **3.2** `HabitService.completeHabit()` — calls `petService.onHabitCompleted()` for both POSITIVE and NEGATIVE, returns `ActivePetDTO` in `CompletableResult`, wrapped in try-catch
- [x] **3.3** `GameSchedulerService` — added `applyPetMoodDecay()` cron `0 0 */6 * * *`
- [x] **3.4** `DataSeeder` — seeds 4 pet species (Fénix, Gato Sombrío, Dragón Dorado, Slime) with distinct mood personalities + PET shop items

### Files Created
- `dto/ActivePetDTO.java` — record: petId, petName, mood, affection, imageUrl
- `dto/AvailablePetDTO.java` — record: petId, name, description, imageUrl, priceGold
- `services/PetService.java` — full mood engine
- `controllers/PetController.java` — 4 endpoints, @CrossOrigin("*")

### Files Modified
- `models/Pet.java` — added priceGold, priceGems
- `repositories/PlayerPetRepository.java` — added `findByPlayerIdAndPetId`, `findByIsActiveTrue`
- `repositories/HabitCompletionRepository.java` — added `findTop10ByPlayerIdOrderByCompletedDateDesc`, `countCompletionsSince`
- `models/CompletableResult.java` — added `ActivePetDTO activePet` field
- `services/HabitService.java` — pet integration with try-catch
- `services/ShopService.java` — PET purchase flow
- `services/GameSchedulerService.java` — mood decay cron
- `config/DataSeeder.java` — 4 pet species + shop items
- `controllers/HabitController.java` — added `activePet` to response map

### Pet Species Seeded
| Pet | Decay | Sadness Threshold | Anger Threshold | Price | Personality |
|-----|-------|------------------|----------------|-------|-------------|
| Fénix | 0.1 | 4 | 5 | 200g | Resilient |
| Gato Sombrío | 0.3 | 2 | 3 | 150g | Moody |
| Dragón Dorado | 0.05 | 5 | 6 | 500g | Legendary |
| Slime | 0.5 | 3 | 4 | 100g | Bouncy but fickle |
