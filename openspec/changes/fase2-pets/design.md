# Design: Fase 2 — Pets / Inmersión Emocional

## Technical Approach

Reuse existing `ShopItem` + `PlayerInventory` patterns. `Pet` is a species definition stored as a `ShopItem` with `ItemType.PET`. `PlayerPet` is the join entity tracking mood, affection, and active status. `PetService` implements the mood engine: recalculate from last 10 `HabitCompletion` rows, apply per-species mood weights and streak multiplier, update affection. A scheduled task in `GameSchedulerService` applies -1/day affection decay.

## Architecture Decisions

| Decision | Alternative | Rationale |
|----------|-------------|-----------|
| `Pet` extends `ShopItem` via FK, not separate table | Standalone `Pet` entity | Keeps shop e2e flow (purchase, inventory) unchanged; `PET` is just another `ItemType` |
| Mood recalc = analyze last 10 completions per player | Rolling window in-memory | Stateless, survives restarts, cheap query (10 rows per player) |
| `PlayerPet` as separate join entity | Embed in Player | One active pet per player, owned list and mood state are different concerns |
| Affection decay in scheduled task | On-completion check | Simple, predictable, aligns with existing `recoverEnergyPerHour` pattern |
| New `PetController`, not merged into `ShopController` | Merge into ShopController | Pet selection + active pet ≠ shop CRUD; separate concerns |

## Data Flow

```
HabitService.completeHabit()
  → StreakService.recordCompletion()
  → PetService.onHabitCompleted( playerId, habitType, streakMultiplier )
    → PetRepository: find active pet's species moodWeights
    → HabitCompletionRepository: last 10 completions for player
    → MoodEngine: count POSITIVE/NEGATIVE ratio → apply weights + streak bonus → resolve mood
    → Affection: +2 if POSITIVE, -1 if NEGATIVE, clamp [0..500]
    → PlayerPetRepository.save()

GameSchedulerService (daily cron)
  → PetService.applyMoodDecay()
    → All PlayerPet: affection = max(0, affection - 1)
    → Recalculate mood if affection dropped below thresholds

Frontend: petStore.fetchActivePet() → PetController → PlayerPetRepository
Frontend: on habit complete → backend returns active pet mood in CompletableResult
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `models/Enum/PetMood.java` | Create | Enum: HAPPY, CONTENT, NEUTRAL, SAD, ANGRY, DEPRESSED |
| `models/Enum/ItemType.java` | Modify | Add `PET` |
| `models/Pet.java` | Create | Species definition: id, name, description, imageUrl, itemId (FK→ShopItem), moodWeights, priceGold, priceGems |
| `models/PlayerPet.java` | Create | Join: playerId, petId, currentMood, affection(0-500), isActive, lastMoodUpdate |
| `repositories/PetRepository.java` | Create | JpaRepository |
| `repositories/PlayerPetRepository.java` | Create | Find by player, find active by player |
| `services/PetService.java` | Create | `onHabitCompleted()`, `getActivePet()`, `selectPet()`, `applyMoodDecay()`, mood engine |
| `controllers/PetController.java` | Create | 3 endpoints (see Contracts) |
| `services/HabitService.java` | Modify | After streak → call `petService.onHabitCompleted()`, include mood in `CompletableResult` |
| `services/GameSchedulerService.java` | Modify | Add daily `petService.applyMoodDecay()` cron |
| `services/ShopService.java` | Modify | In `purchaseItem`: if `ItemType.PET`, create `PlayerPet` (not inventory row) |
| `config/DataSeeder.java` | Modify | Seed 3-4 pet species as `ShopItem(PET)`, plus pet-specific helper |
| `stores/petStore.ts` | Create | Zustand: activePet, mood, affection, fetchActivePet, fetchAvailablePets, selectPet |
| `services/api/pets.ts` | Create | Axios: GET/POST pet endpoints |
| `components/PetAvatar.tsx` | Create | Display active pet emoji with mood-based animation/floating |
| `components/PetMoodIndicator.tsx` | Create | Colored dot + label (e.g. "😊 Contento") |
| `app/(tabs)/index.tsx` | Modify | Import + render `PetAvatar`, `PetMoodIndicator` above stats |
| `app/(tabs)/shop.tsx` | Modify | Add `PET` to `CategoryFilter` and `CATEGORIES` array |
| `stores/shopStore.ts` | Modify | Add `'PET'` to `ShopItem.itemType` union |
| `components/ShopItemCard.tsx` | Modify | Add `'PET'` itemType icon case |

## Interfaces / Contracts

### API Endpoints (PetController — `/api/pets`)

```java
GET    /api/pets/active?playerId={id}          → { pet, currentMood, affection }
GET    /api/pets/available?playerId={id}        → [Pet] (purchased but not active)
POST   /api/pets/select/{playerPetId}?playerId={id}  → { success, activePet }
```

### Data Structures

```java
// Pet.java — species definition (maps to shop_item row with itemType=PET)
@Entity @Table(name = "pets")
public class Pet {
    @Id private Long id;                    // same as ShopItem.id
    private String name;
    private String description;
    private String imageUrl;

    @OneToOne @MapsId @JoinColumn(name = "id")
    private ShopItem shopItem;

    @ElementCollection
    @CollectionTable(name = "pet_mood_weights", joinColumns = @JoinColumn(name = "pet_id"))
    @MapKeyEnumerated(EnumType.STRING)
    @MapKeyColumn(name = "mood")
    @Column(name = "weight")
    private Map<PetMood, Double> moodWeights;

    private int priceGold;
    private int priceGems;
}

// PlayerPet.java — join entity
@Entity @Table(name = "player_pets")
public class PlayerPet {
    @Id @GeneratedValue private Long id;
    @ManyToOne private Player player;
    @ManyToOne private Pet pet;
    @Enumerated(EnumType.STRING) private PetMood currentMood = PetMood.NEUTRAL;
    private int affection = 0;      // 0..500
    private boolean isActive = false;
    private LocalDateTime lastMoodUpdate;
}
```

### Mood Engine (PetService, pseudocode)

```
1. Query last 10 HabitCompletions for player (ordered DESC)
2. Count POSITIVE vs NEGATIVE completions
3. Apply per-species moodWeights from Pet definition
4. Apply streakMultiplier (weighted average)
5. Apply affection buffer: affection > 300 → bias toward HAPPY, < 100 → bias toward SAD
6. Resolve PetMood from weighted score
7. Update PlayerPet.currentMood + affection
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `PetService.moodEngine()` | Pure computation: given 10 completions + weights → expected mood. Test all mood transitions and affection boundary (0, 500) |
| Unit | `PetService.onHabitCompleted()` | Mock repo; verify affection ±2/-1, verify mood recalc called |
| Unit | `PetService.applyMoodDecay()` | Verify affection decrement, clamp at 0 |
| Integration | Purchase PET item | Buy → verify PlayerPet created, inventory NOT affected |
| Integration | Select active pet | Select → verify old active = false, new = true |
| Integration | Daily decay cron | Run scheduler → verify all PlayerPet rows decremented |
| E2E | Dashboard shows mood | Complete habit → verify frontend displays updated mood |

## Migration / Rollout

Add `pets`, `player_pets`, `pet_mood_weights` tables via new Flyway/Liquibase migration (or `spring.jpa.hibernate.ddl-auto=update` for MVP). No data migration needed — pets are only created on purchase or seeding.

## Open Questions

- [ ] Decay frequency: daily at midnight? Or every 24h since last mood update? Proposal says daily, design assumes midnight cron.
- [ ] Affection thresholds for mood bias: what exact values? Proposal says >300 and <100. Tuning may need adjustment post-MVP.
- [ ] Should NEGATIVE habits trigger mood update at all? Proposal implies yes (affection -1), but NEGATIVE habits don't go through HabitService streak path — need explicit hook in NEGATIVE branch too.
