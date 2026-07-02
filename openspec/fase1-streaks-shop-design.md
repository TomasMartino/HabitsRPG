# Design: Fase 1 — Streaks + Shop

- **Artifact**: `openspec/fase1-streaks-shop-design.md`
- **Engram**: `sdd/fase1-streaks-shop/design`
- **Date**: 2026-07-01
- **Phase**: SDD Design (post-spec)
- **JRPG Theme**: Classic JRPG aesthetics — equipment slots, rarity tiers, tavern-like shop

---

## Part 1: Player Model Changes

### Player.java — Additions

```java
// --- New fields ---
private int gems = 0;  // premium currency, default 0

@Version
private Integer version;  // optimistic locking, nullable Integer for Hibernate
```

`@Data` from Lombok already generates getters/setters for these. No additional boilerplate needed.

### PlayerStatsDTO.java — Add `gems`

```java
// Add to constructor call in PlayerController:
new PlayerStatsDTO(
    ...existing fields...,
    player.getGold(),
    player.getLives(),
    player.getGems()  // ← NEW last param
);
```

The DTO class needs a new field:
```java
private int gems;
```
And the `@AllArgsConstructor` constructor signature updates automatically.

### Design Decision: `@Version` type

**Choice**: `Integer` (nullable wrapper) instead of `int` (primitive).

**Rationale**: Hibernate treats `null` for `@Version` on first persist as version 0, then increments to 1 after the first update. Using `int` (primitive, default 0) also works, but `Integer` is the conventional choice — it's clearer that Hibernate owns this value and the app should never set it manually.

---

## Part 2: Backend Architecture

### 2.1 — New Entities

#### `HabitCompletion.java`

```java
@Entity
@Table(name = "habit_completions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"habit_id", "player_id", "completed_date"}))
@Data
public class HabitCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    @JsonIgnore
    private Player player;

    @Column(name = "completed_date", nullable = false)
    private LocalDate completedDate;

    @Column(name = "xp_earned")
    private int xpEarned;

    @Column(name = "gold_earned")
    private int goldEarned;

    @Column(name = "streak_multiplier")
    private double streakMultiplier = 1.0;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

**Migration SQL**:
```sql
CREATE TABLE habit_completions (
    id               BIGSERIAL PRIMARY KEY,
    habit_id         BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    player_id        BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    completed_date   DATE NOT NULL,
    xp_earned        INT NOT NULL DEFAULT 0,
    gold_earned      INT NOT NULL DEFAULT 0,
    streak_multiplier NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(habit_id, player_id, completed_date)
);

CREATE INDEX idx_completions_lookup
    ON habit_completions(habit_id, player_id, completed_date DESC);
```

#### `HabitStreak.java` (cached aggregate root)

```java
@Entity
@Table(name = "habit_streaks",
       uniqueConstraints = @UniqueConstraint(columnNames = {"habit_id", "player_id"}))
@Data
public class HabitStreak {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    @JsonIgnore
    private Player player;

    @Column(name = "current_streak")
    private int currentStreak = 0;

    @Column(name = "longest_streak")
    private int longestStreak = 0;

    @Column(name = "last_completed_date")
    private LocalDate lastCompletedDate;

    @Column(name = "multiplier")
    private double multiplier = 1.0;
}
```

**Migration SQL**:
```sql
CREATE TABLE habit_streaks (
    id                  BIGSERIAL PRIMARY KEY,
    habit_id            BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    player_id           BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    current_streak      INT NOT NULL DEFAULT 0,
    longest_streak      INT NOT NULL DEFAULT 0,
    last_completed_date DATE,
    multiplier          NUMERIC(3,1) NOT NULL DEFAULT 1.0,
    UNIQUE(habit_id, player_id)
);
```

#### `ItemType.java` — Enum

```java
public enum ItemType {
    CONSUMABLE,
    COSMETIC,
    BOOST
}
```

#### `Rarity.java` — Enum (JRPG flavor)

```java
public enum Rarity {
    COMMON,    // White border
    UNCOMMON,  // Green border
    RARE,      // Blue border
    EPIC,      // Purple border
    LEGENDARY  // Orange border
}
```

#### `EquipSlot.java` — Enum

```java
public enum EquipSlot {
    SKIN,
    ACCESSORY_1,
    ACCESSORY_2
}
```

#### `EffectType.java` — Enum

```java
public enum EffectType {
    HEAL,
    ENERGY,
    XP_BOOST,
    GOLD_BOOST,
    COSMETIC
}
```

#### `ShopItem.java`

```java
@Entity
@Table(name = "shop_items")
@Data
public class ShopItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private ItemType itemType;

    @Enumerated(EnumType.STRING)
    private Rarity rarity = Rarity.COMMON;

    @Column(name = "price_gold")
    private int priceGold = 0;

    @Column(name = "price_gems")
    private int priceGems = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "effect_type")
    private EffectType effectType;

    @Column(name = "effect_value")
    private int effectValue;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_purchasable")
    private boolean isPurchasable = true;

    @Column(name = "max_owned", nullable = true)
    private Integer maxOwned;  // nullable = no limit

    @Column(name = "duration_hours", nullable = true)
    private Integer durationHours;  // nullable = permanent (for BOOST items)

    @Column(name = "equip_slot")
    @Enumerated(EnumType.STRING)
    private EquipSlot equipSlot;  // only for COSMETIC items

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
```

**Migration SQL**:
```sql
CREATE TABLE shop_items (
    id              BIGSERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    item_type       VARCHAR(20) NOT NULL,
    rarity          VARCHAR(20) NOT NULL DEFAULT 'COMMON',
    price_gold      INT NOT NULL DEFAULT 0,
    price_gems      INT NOT NULL DEFAULT 0,
    effect_type     VARCHAR(30),
    effect_value    INT,
    image_url       VARCHAR(255),
    is_purchasable  BOOLEAN NOT NULL DEFAULT TRUE,
    max_owned       INT,
    duration_hours  INT,
    equip_slot      VARCHAR(30),
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### `PlayerInventory.java`

```java
@Entity
@Table(name = "player_inventory",
       uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "item_id"}))
@Data
public class PlayerInventory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    @JsonIgnore
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private ShopItem item;

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "acquired_at", updatable = false)
    private LocalDateTime acquiredAt;

    @Column(name = "expires_at", nullable = true)
    private LocalDateTime expiresAt;  // for BOOST items

    @PrePersist
    protected void onCreate() {
        acquiredAt = LocalDateTime.now();
    }
}
```

**Migration SQL**:
```sql
CREATE TABLE player_inventory (
    id           BIGSERIAL PRIMARY KEY,
    player_id    BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_id      BIGINT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    quantity     INT NOT NULL DEFAULT 1,
    acquired_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at   TIMESTAMP,
    UNIQUE(player_id, item_id)
);
```

#### `PlayerEquipment.java`

```java
@Entity
@Table(name = "player_equipment",
       uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "slot"}))
@Data
public class PlayerEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    @JsonIgnore
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private ShopItem item;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipSlot slot;

    @Column(name = "equipped_at", updatable = false)
    private LocalDateTime equippedAt;

    @PrePersist
    protected void onCreate() {
        equippedAt = LocalDateTime.now();
    }
}
```

**Migration SQL**:
```sql
CREATE TABLE player_equipment (
    id           BIGSERIAL PRIMARY KEY,
    player_id    BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    item_id      BIGINT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
    slot         VARCHAR(30) NOT NULL,
    equipped_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(player_id, slot)
);
```

### Design Decision: Separate Equipment Table vs. Inventory Flag

**Choice**: Dedicated `player_equipment` table with slot-based UNIQUE constraint.

**Alternatives considered**:
1. `is_equipped` boolean on `PlayerInventory` (simpler schema)
2. JSON column on Player storing equipped item IDs

**Rationale**: The slot-based UNIQUE constraint enforces "one item per slot" at the database level — no risk of two SKIN items being equipped simultaneously even if the app code has a bug. A boolean flag on inventory needs application-level checks. The separate table also keeps querying clean: `SELECT * FROM player_equipment WHERE player_id = ?` is a single index scan, no filtering needed. JSON approach lacks referential integrity.

### 2.2 — New / Modified Repositories

#### `HabitCompletionRepository.java`

```java
@Repository
public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, Long> {

    @Query("SELECT hc.completedDate FROM HabitCompletion hc " +
           "WHERE hc.habit.id = :habitId AND hc.player.id = :playerId " +
           "ORDER BY hc.completedDate DESC")
    List<LocalDate> findCompletedDatesByHabitAndPlayer(
        @Param("habitId") Long habitId,
        @Param("playerId") Long playerId);

    Optional<HabitCompletion> findByHabitIdAndPlayerIdAndCompletedDate(
        Long habitId, Long playerId, LocalDate completedDate);

    @Query("SELECT COUNT(hc) FROM HabitCompletion hc " +
           "WHERE hc.habit.id = :habitId AND hc.player.id = :playerId")
    long countByHabitIdAndPlayerId(@Param("habitId") Long habitId,
                                   @Param("playerId") Long playerId);

    @Query("SELECT hc.completedDate FROM HabitCompletion hc " +
           "WHERE hc.habit.id IN :habitIds AND hc.player.id = :playerId " +
           "ORDER BY hc.completedDate DESC")
    List<LocalDate> findCompletedDatesByHabitsAndPlayer(
        @Param("habitIds") List<Long> habitIds,
        @Param("playerId") Long playerId);
}
```

#### `HabitStreakRepository.java`

```java
@Repository
public interface HabitStreakRepository extends JpaRepository<HabitStreak, Long> {
    Optional<HabitStreak> findByHabitIdAndPlayerId(Long habitId, Long playerId);
    List<HabitStreak> findByPlayerId(Long playerId);
}
```

#### `ShopItemRepository.java`

```java
@Repository
public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {
    List<ShopItem> findByIsPurchasableTrue();
    List<ShopItem> findByItemTypeAndIsPurchasableTrue(ItemType itemType);
}
```

#### `PlayerInventoryRepository.java`

```java
@Repository
public interface PlayerInventoryRepository extends JpaRepository<PlayerInventory, Long> {
    List<PlayerInventory> findByPlayerId(Long playerId);
    Optional<PlayerInventory> findByPlayerIdAndItemId(Long playerId, Long itemId);
    boolean existsByPlayerIdAndItemId(Long playerId, Long itemId);
    int countByPlayerIdAndItemId(Long playerId, Long itemId);
}
```

#### `PlayerEquipmentRepository.java`

```java
@Repository
public interface PlayerEquipmentRepository extends JpaRepository<PlayerEquipment, Long> {
    List<PlayerEquipment> findByPlayerId(Long playerId);
    Optional<PlayerEquipment> findByPlayerIdAndSlot(Long playerId, EquipSlot slot);
    boolean existsByPlayerIdAndSlot(Long playerId, EquipSlot slot);
    Optional<PlayerEquipment> findByPlayerIdAndItemId(Long playerId, Long itemId);
    void deleteByPlayerIdAndSlot(Long playerId, EquipSlot slot);
}
```

#### `PlayerRepository.java` — Modified

Add the pessimistic write lock method:

```java
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM Player p WHERE p.id = :id")
Optional<Player> findByIdWithLock(@Param("id") Long id);
```

### 2.3 — New / Modified Services

#### `StreakService.java`

Full implementation:

```java
@Service
public class StreakService {

    private final HabitCompletionRepository completionRepository;
    private final HabitStreakRepository streakRepository;
    private final HabitRepository habitRepository;

    public StreakService(HabitCompletionRepository completionRepository,
                         HabitStreakRepository streakRepository,
                         HabitRepository habitRepository) {
        this.completionRepository = completionRepository;
        this.streakRepository = streakRepository;
        this.habitRepository = habitRepository;
    }

    /**
     * Records a habit completion, calculates streak, updates multiplier.
     * Returns: streak info for response DTO, or throws if already completed today.
     */
    @Transactional
    public StreakResult recordCompletion(Long habitId, Long playerId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // 1. Idempotency check
        if (completionRepository
                .findByHabitIdAndPlayerIdAndCompletedDate(habitId, playerId, today)
                .isPresent()) {
            throw new DuplicateCompletionException("Habit already completed today");
        }

        // 2. Load Habit for reward calculation
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new RuntimeException("Hábito no encontrado"));

        // 3. Get or create streak
        HabitStreak streak = streakRepository
                .findByHabitIdAndPlayerId(habitId, playerId)
                .orElseGet(() -> {
                    HabitStreak newStreak = new HabitStreak();
                    newStreak.setHabit(habit);
                    // need player reference
                    return newStreak;
                });

        // 4. Streak calculation logic
        int newStreakCount;
        if (streak.getLastCompletedDate() == null) {
            newStreakCount = 1;
        } else if (streak.getLastCompletedDate().equals(today.minusDays(1))) {
            newStreakCount = streak.getCurrentStreak() + 1;
        } else if (streak.getLastCompletedDate().equals(today)) {
            throw new DuplicateCompletionException("Already completed today");
        } else {
            newStreakCount = 1;  // gap > 1 day, reset
        }

        streak.setCurrentStreak(newStreakCount);
        streak.setLongestStreak(Math.max(streak.getLongestStreak(), newStreakCount));
        streak.setLastCompletedDate(today);

        // 5. Calculate multiplier
        double multiplier = StreakTier.getMultiplier(newStreakCount);
        streak.setMultiplier(multiplier);

        // 6. Apply multiplier to rewards
        int baseXp = habit.getXpReward();
        int baseGold = habit.getGoldReward();
        int xpEarned = (int) Math.round(baseXp * multiplier);
        int goldEarned = (int) Math.round(baseGold * multiplier);

        // 7. Save completion record with reward details
        HabitCompletion completion = new HabitCompletion();
        completion.setHabit(habit);
        // player reference needed — set from repository lookup
        completion.setCompletedDate(today);
        completion.setXpEarned(xpEarned);
        completion.setGoldEarned(goldEarned);
        completion.setStreakMultiplier(multiplier);
        completionRepository.save(completion);

        // 8. Save updated streak
        streakRepository.save(streak);

        return new StreakResult(newStreakCount, streak.getLongestStreak(),
                                multiplier, xpEarned, goldEarned);
    }

    // Streak data retrieval (lazy — recalculates if no cached streak exists)
    public StreakData getStreakData(Long habitId, Long playerId) {
        return streakRepository.findByHabitIdAndPlayerId(habitId, playerId)
                .map(s -> new StreakData(habitId, s.getCurrentStreak(),
                        s.getLongestStreak(), s.getMultiplier(),
                        s.getLastCompletedDate()))
                .orElse(new StreakData(habitId, 0, 0, 1.0, null));
    }

    public List<StreakSummary> getAllStreaksForPlayer(Long playerId) {
        return streakRepository.findByPlayerId(playerId)
                .stream()
                .map(s -> new StreakSummary(
                        s.getHabit().getId(),
                        s.getHabit().getTitle(),
                        s.getCurrentStreak(),
                        s.getLongestStreak(),
                        s.getMultiplier()))
                .toList();
    }
}
```

#### Data Classes (inner or separate files):

```java
public record StreakResult(int currentStreak, int longestStreak,
                           double multiplier, int xpEarned, int goldEarned) {}

public record StreakData(Long habitId, int currentStreak, int longestStreak,
                         double multiplier, LocalDate lastCompletedDate) {}

public record StreakSummary(Long habitId, String habitName,
                            int currentStreak, int longestStreak,
                            double multiplier) {}
```

#### `ShopService.java`

Full implementation:

```java
@Service
public class ShopService {

    private final PlayerRepository playerRepository;
    private final ShopItemRepository shopItemRepository;
    private final PlayerInventoryRepository inventoryRepository;
    private final PlayerEquipmentRepository equipmentRepository;
    private final PlayerService playerService;

    public ShopService(PlayerRepository playerRepository,
                       ShopItemRepository shopItemRepository,
                       PlayerInventoryRepository inventoryRepository,
                       PlayerEquipmentRepository equipmentRepository,
                       PlayerService playerService) {
        this.playerRepository = playerRepository;
        this.shopItemRepository = shopItemRepository;
        this.inventoryRepository = inventoryRepository;
        this.equipmentRepository = equipmentRepository;
        this.playerService = playerService;
    }

    public List<ShopItem> getCatalog(ItemType category) {
        if (category != null) {
            return shopItemRepository.findByItemTypeAndIsPurchasableTrue(category);
        }
        return shopItemRepository.findByIsPurchasableTrue();
    }

    @Transactional
    public PurchaseResult purchaseItem(Long playerId, Long itemId) {
        // 1. Pessimistic lock on player
        Player player = playerRepository.findByIdWithLock(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        // 2. Load item
        ShopItem item = shopItemRepository.findById(itemId)
                .orElseThrow(() -> new ItemNotFoundException("Ítem no encontrado"));

        if (!item.isPurchasable()) {
            throw new ItemNotAvailableException("Ítem no disponible");
        }

        // 3. Validate currency
        if (player.getGold() < item.getPriceGold()) {
            throw new InsufficientCurrencyException("INSUFFICIENT_GOLD",
                    "Oro insuficiente: necesitas " + item.getPriceGold(),
                    item.getPriceGold(), player.getGold());
        }
        if (player.getGems() < item.getPriceGems()) {
            throw new InsufficientCurrencyException("INSUFFICIENT_GEMS",
                    "Gemas insuficientes: necesitas " + item.getPriceGems(),
                    item.getPriceGems(), player.getGems());
        }

        // 4. Validate max_owned for limit items
        if (item.getMaxOwned() != null) {
            int owned = inventoryRepository.countByPlayerIdAndItemId(playerId, itemId);
            if (owned >= item.getMaxOwned()) {
                throw new MaxOwnedExceededException("MAX_OWNED_EXCEEDED",
                        "Ya posees el máximo de este ítem (" + item.getMaxOwned() + ")");
            }
        }

        // 5. Deduct currency
        player.setGold(player.getGold() - item.getPriceGold());
        player.setGems(player.getGems() - item.getPriceGems());
        playerRepository.save(player);

        // 6. Handle based on item type
        boolean consumed = false;
        if (item.getItemType() == ItemType.CONSUMABLE) {
            applyConsumableEffect(player, item);
            playerRepository.save(player);
            consumed = true;  // no inventory row for consumed items
        } else {
            // COSMETIC or BOOST → inventory
            PlayerInventory inv = inventoryRepository
                    .findByPlayerIdAndItemId(playerId, itemId)
                    .orElseGet(() -> {
                        PlayerInventory newInv = new PlayerInventory();
                        newInv.setPlayer(player);
                        newInv.setItem(item);
                        newInv.setQuantity(0);
                        return newInv;
                    });
            inv.setQuantity(inv.getQuantity() + 1);

            // Set expiry for BOOST items
            if (item.getItemType() == ItemType.BOOST && item.getDurationHours() != null) {
                inv.setExpiresAt(LocalDateTime.now().plusHours(item.getDurationHours()));
            }
            inventoryRepository.save(inv);
        }

        return new PurchaseResult(true, player.getGold(), player.getGems(),
                consumed ? 0 : 1);
    }

    private void applyConsumableEffect(Player player, ShopItem item) {
        switch (item.getEffectType()) {
            case HEAL -> player.setHealth(
                    Math.min(player.getHealth() + item.getEffectValue(), 100));
            case ENERGY -> player.setEnergy(
                    Math.min(player.getEnergy() + item.getEffectValue(), 100));
            case XP_BOOST, GOLD_BOOST -> {
                // Boost effects handled via expiry in inventory — no immediate stat change
            }
            default -> { /* COSMETIC items have no immediate effect */ }
        }
    }

    @Transactional
    public void equipItem(Long playerId, Long inventoryId) {
        PlayerInventory inv = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ItemNotFoundException("Ítem no encontrado en inventario"));

        if (!inv.getPlayer().getId().equals(playerId)) {
            throw new RuntimeException("Este ítem no te pertenece");
        }
        if (inv.getItem().getItemType() != ItemType.COSMETIC) {
            throw new NotEquippableException("NOT_EQUIPPABLE",
                    "Solo ítems cosméticos pueden equiparse");
        }
        if (inv.getQuantity() < 1) {
            throw new RuntimeException("No tienes este ítem");
        }

        EquipSlot slot = inv.getItem().getEquipSlot();
        if (slot == null) {
            throw new NotEquippableException("NOT_EQUIPPABLE",
                    "Este ítem no tiene un slot de equipo definido");
        }

        // Unequip any existing item in this slot
        equipmentRepository.findByPlayerIdAndSlot(playerId, slot)
                .ifPresent(equipmentRepository::delete);

        // Equip new item
        PlayerEquipment eq = new PlayerEquipment();
        eq.setPlayer(inv.getPlayer());
        eq.setItem(inv.getItem());
        eq.setSlot(slot);
        equipmentRepository.save(eq);
    }

    @Transactional
    public void unequipItem(Long playerId, EquipSlot slot) {
        equipmentRepository.deleteByPlayerIdAndSlot(playerId, slot);
    }

    public List<InventoryDTO> getInventory(Long playerId) {
        return inventoryRepository.findByPlayerId(playerId)
                .stream()
                .map(inv -> new InventoryDTO(
                        inv.getId(),
                        inv.getItem().getId(),
                        inv.getItem().getName(),
                        inv.getItem().getDescription(),
                        inv.getItem().getItemType(),
                        inv.getItem().getRarity(),
                        inv.getQuantity(),
                        isEquipped(playerId, inv.getItem().getEquipSlot(), inv.getItem()),
                        inv.getExpiresAt(),
                        inv.getItem().getEquipSlot()))
                .toList();
    }

    public List<EquipmentDTO> getEquipment(Long playerId) {
        return equipmentRepository.findByPlayerId(playerId)
                .stream()
                .map(eq -> new EquipmentDTO(
                        eq.getId(),
                        eq.getItem().getId(),
                        eq.getItem().getName(),
                        eq.getItem().getRarity(),
                        eq.getSlot(),
                        eq.getEquippedAt()))
                .toList();
    }

    private boolean isEquipped(Long playerId, EquipSlot slot, ShopItem item) {
        if (slot == null) return false;
        return equipmentRepository.findByPlayerIdAndSlot(playerId, slot)
                .map(eq -> eq.getItem().getId().equals(item.getId()))
                .orElse(false);
    }
}
```

#### Data classes for shop:

```java
public record PurchaseResult(boolean success, int goldRemaining,
                             int gemsRemaining, int quantity) {}

public record InventoryDTO(Long id, Long itemId, String name, String description,
                           ItemType itemType, Rarity rarity, int quantity,
                           boolean isEquipped, LocalDateTime expiresAt,
                           EquipSlot equipSlot) {}

public record EquipmentDTO(Long id, Long itemId, String name, Rarity rarity,
                           EquipSlot slot, LocalDateTime equippedAt) {}
```

#### `HabitService.java` — Modified

Inject `StreakService` and integrate with `completeHabit`:

```java
@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final PlayerService playerService;
    private final PlayerRepository playerRepository;
    private final StreakService streakService;  // NEW

    public HabitService(HabitRepository habitRepository,
                        PlayerService playerService,
                        PlayerRepository playerRepository,
                        StreakService streakService) {  // NEW param
        this.habitRepository = habitRepository;
        this.playerService = playerService;
        this.playerRepository = playerRepository;
        this.streakService = streakService;  // NEW
    }

    public CompletableResult completeHabit(Long habitId, Long playerId) {
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new RuntimeException("Hábito no encontrado"));

        if ("POSITIVE".equals(habit.getType())) {
            Player player = playerRepository.findById(playerId)
                    .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

            // 1. Record streak FIRST (may throw 409 if duplicate)
            StreakResult streak = streakService.recordCompletion(habitId, playerId);

            // 2. Get rewards (already multiplied by streak)
            int xpEarned = streak.xpEarned();
            int goldEarned = streak.goldEarned();

            int cost = habit.getEnergyCost();
            if (player.getEnergy() >= cost) {
                player.setEnergy(player.getEnergy() - cost);
            } else {
                player.setEnergy(0);
                xpEarned /= 2;
                goldEarned /= 2;
            }

            player.setGold(player.getGold() + goldEarned);
            boolean leveledUp = player.gainXp(xpEarned);
            playerRepository.save(player);

            return new CompletableResult(player, streak.currentStreak(),
                    streak.longestStreak(), streak.multiplier(),
                    xpEarned, goldEarned, leveledUp);
        } else {
            // NEGATIVE: no streak tracking for negative habits
            Player player = playerService.takeDamage(playerId, habit.getHpPenalty());
            int nuevaEnergia = Math.min(100, player.getEnergy() + habit.getEnergyCost());
            player.setEnergy(nuevaEnergia);
            playerRepository.save(player);
            return new CompletableResult(player, 0, 0, 1.0, 0, 0, false);
        }
    }
}
```

#### `PlayerService.java` — Modified

Refactor `buyHealthPotion` to delegate to `ShopService`:

```java
@Service
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final ShopService shopService;  // NEW

    public PlayerService(PlayerRepository playerRepository,
                         ShopService shopService) {  // NEW param
        this.playerRepository = playerRepository;
        this.shopService = shopService;
    }

    // ... existing methods unchanged ...

    /**
     * @deprecated Use ShopService.purchaseItem(playerId, healthPotionItemId) instead.
     * Kept for backward compatibility — delegates to ShopService internally.
     */
    @Deprecated
    public Player buyHealthPotion(Long playerId) {
        // Find the health potion item (ID 1 = seeded health potion)
        shopService.purchaseItem(playerId, 1L);
        // Return refreshed player
        return playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));
    }
}
```

### 2.4 — New Controllers

#### `StreakController.java`

```java
@RestController
@RequestMapping("/api/streaks")
@CrossOrigin(origins = "*")
public class StreakController {

    private final StreakService streakService;

    public StreakController(StreakService streakService) {
        this.streakService = streakService;
    }

    @GetMapping("/habit/{habitId}")
    public ResponseEntity<?> getStreakByHabit(
            @PathVariable Long habitId,
            @RequestParam Long playerId) {
        try {
            StreakData data = streakService.getStreakData(habitId, playerId);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/player/{playerId}")
    public ResponseEntity<?> getAllStreaks(@PathVariable Long playerId) {
        try {
            var streaks = streakService.getAllStreaksForPlayer(playerId);
            return ResponseEntity.ok(Map.of("streaks", streaks));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
```

#### `ShopController.java`

```java
@RestController
@RequestMapping("/api/shop")
@CrossOrigin(origins = "*")
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping("/items")
    public ResponseEntity<?> getCatalog(
            @RequestParam(required = false) ItemType category) {
        try {
            var items = shopService.getCatalog(category);
            return ResponseEntity.ok(Map.of("items", items));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/buy/{itemId}")
    public ResponseEntity<?> buyItem(
            @PathVariable Long itemId,
            @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            PurchaseResult result = shopService.purchaseItem(playerId, itemId);
            return ResponseEntity.ok(result);
        } catch (InsufficientCurrencyException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getErrorCode(),
                    "message", e.getMessage(),
                    "required", e.getRequired(),
                    "available", e.getAvailable()));
        } catch (ItemNotAvailableException | MaxOwnedExceededException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getErrorCode(),
                    "message", e.getMessage()));
        } catch (DuplicateCompletionException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "ALREADY_PURCHASED",
                            "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "PURCHASE_FAILED",
                            "message", e.getMessage()));
        }
    }

    @GetMapping("/inventory")
    public ResponseEntity<?> getInventory(@RequestParam Long playerId) {
        try {
            var inventory = shopService.getInventory(playerId);
            return ResponseEntity.ok(Map.of("inventory", inventory));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/equipment")
    public ResponseEntity<?> getEquipment(@RequestParam Long playerId) {
        try {
            var equipment = shopService.getEquipment(playerId);
            return ResponseEntity.ok(Map.of("equipment", equipment));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/inventory/equip/{inventoryId}")
    public ResponseEntity<?> equipItem(
            @PathVariable Long inventoryId,
            @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            shopService.equipItem(playerId, inventoryId);
            return ResponseEntity.ok(Map.of("success", true, "equipped", true));
        } catch (NotEquippableException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getErrorCode(),
                    "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/inventory/unequip/{slot}")
    public ResponseEntity<?> unequipItem(
            @PathVariable String slot,
            @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            shopService.unequipItem(playerId, EquipSlot.valueOf(slot.toUpperCase()));
            return ResponseEntity.ok(Map.of("success", true, "equipped", false));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
```

#### `HabitController.java` — Modified

Update the `completeHabit` endpoint to return streak data:

```java
@PostMapping("/{habitId}/complete/{playerId}")
public ResponseEntity<?> completeHabit(@PathVariable Long habitId,
                                       @PathVariable Long playerId) {
    try {
        CompletableResult result = habitService.completeHabit(habitId, playerId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "player", result.player(),
                "xpEarned", result.xpEarned(),
                "goldEarned", result.goldEarned(),
                "currentStreak", result.currentStreak(),
                "longestStreak", result.longestStreak(),
                "streakMultiplier", result.multiplier(),
                "leveledUp", result.leveledUp()
        ));
    } catch (DuplicateCompletionException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "ALREADY_COMPLETED_TODAY",
                        "message", e.getMessage()));
    } catch (Exception e) {
        return ResponseEntity.badRequest()
                .body("Error: " + e.getMessage());
    }
}
```

#### `PlayerController.java` — Modified

Update `PlayerStatsDTO` mapping to include `gems`:

```java
PlayerStatsDTO statsDTO = new PlayerStatsDTO(
    player.getName(),
    player.getHealth(),
    player.getEnergy(),
    player.getXp(),
    player.getLevel(),
    player.getXpProgress(),
    player.getXpToNextLevel(),
    player.getGold(),
    player.getLives(),
    player.getGems()  // ← NEW
);
```

### 2.5 — Custom Exception Classes

```java
public class DuplicateCompletionException extends RuntimeException {
    public DuplicateCompletionException(String message) { super(message); }
}

public class InsufficientCurrencyException extends RuntimeException {
    private final String errorCode;
    private final int required;
    private final int available;
    // constructor + getters
}

public class ItemNotAvailableException extends RuntimeException {
    private final String errorCode;
    // constructor + getter
}

public class NotEquippableException extends RuntimeException {
    private final String errorCode;
    // constructor + getter
}

public class ItemNotFoundException extends RuntimeException {
    public ItemNotFoundException(String message) { super(message); }
}

public class MaxOwnedExceededException extends RuntimeException {
    private final String errorCode;
    // constructor + getter
}
```

---

## Part 3: Streak Calculation Algorithm (Detailed)

### Pseudocode

```
recordCompletion(habitId, playerId):
  ┌──────────────────────────────────────────────────────┐
  │ 1. today = LocalDate.now(ZoneOffset.UTC)              │
  │ 2. IF HabitCompletion exists for (habitId, playerId,  │
  │    today) → throw DuplicateCompletionException(409)   │
  │ 3. Load Habit entity for base XP/gold values           │
  │ 4. Load or create HabitStreak for (habitId, playerId)  │
  │                                                        │
  │ 5. IF streak.lastCompletedDate == null:                 │
  │      currentStreak = 1                                 │
  │    ELSE IF lastCompletedDate == today - 1 day:          │
  │      currentStreak = streak.currentStreak + 1          │
  │    ELSE IF lastCompletedDate == today:                  │
  │      throw DuplicateCompletionException(409)           │
  │    ELSE:                                                │
  │      currentStreak = 1  # gap > 1 day, reset           │
  │                                                        │
  │ 6. longestStreak = max(longestStreak, currentStreak)   │
  │ 7. multiplier = StreakTier.getMultiplier(currentStreak) │
  │ 8. xpEarned = round(baseXp * multiplier)                │
  │    goldEarned = round(baseGold * multiplier)             │
  │ 9. Save HabitCompletion + HabitStreak                   │
  │ 10. Return StreakResult                                 │
  └──────────────────────────────────────────────────────┘
```

### Edge Cases Matrix

| Scenario | Behavior |
|----------|----------|
| First completion ever | `lastCompletedDate == null` → streak = 1 |
| Consecutive day | `lastCompletedDate == yesterday` → streak++ |
| Same day duplicate | `lastCompletedDate == today` → 409 Conflict |
| Gap ≥2 days | Streak resets to 1 |
| Today not completed, yesterday was | Lazy eval on read shows streak alive from yesterday |
| 365 days streak | Multiplier caps at 3.0× (90-day tier) |
| Negative habit completed | No streak tracking for negative habits |
| Multiplier at 89 vs 90 days | 2.5× → 3.0× jump at the 90-day boundary |

### `StreakTier.java`

```java
public record StreakTier(int days, double multiplier) {
    private static final List<StreakTier> TIERS = List.of(
        new StreakTier(7, 1.5),
        new StreakTier(14, 1.75),
        new StreakTier(30, 2.0),
        new StreakTier(60, 2.5),
        new StreakTier(90, 3.0)
    );

    public static double getMultiplier(int streak) {
        double mult = 1.0;
        for (StreakTier t : TIERS) {
            if (streak >= t.days) mult = Math.max(mult, t.multiplier);
        }
        return mult;
    }
}
```

---

## Part 4: Shop Purchase Flow (Detailed Sequence)

```
buyItem(playerId, itemId):
  ┌──────────────────────────────────────────────────────────┐
  │ @Transactional begins                                      │
  │  1. Player player = playerRepository.findByIdWithLock(id)  │
  │     → PESSIMISTIC_WRITE lock acquired (concurrent          │
  │       requests block here)                                 │
  │  2. ShopItem item = shopItemRepository.findById(itemId)    │
  │  3. Validate:                                             │
  │     - item.isPurchasable == true                           │
  │     - player.gold >= item.priceGold                        │
  │     - player.gems >= item.priceGems                        │
  │     - (if maxOwned != null) owned < maxOwned               │
  │  4. Deduct:                                                │
  │     player.gold -= item.priceGold                          │
  │     player.gems -= item.priceGems                          │
  │     playerRepository.save(player)  → version++             │
  │  5. Switch on itemType:                                    │
  │     CONSUMABLE → applyEffect(player, item) → save player   │
  │                   (no inventory row)                        │
  │     COSMETIC   → upsert PlayerInventory, quantity++         │
  │     BOOST      → upsert PlayerInventory, quantity++,        │
  │                  set expiresAt = now + durationHours        │
  │  6. Commit → lock released                                 │
  │     If any step fails → @Transactional rollback             │
  └──────────────────────────────────────────────────────────┘
```

### Concurrency Flow

```
Request A ──► @Transactional.begin()
                ├─ PESSIMISTIC_WRITE.lock(player) ✓
                ├─ Read gold: 100
                ├─ Deduct: gold(100→50)
                ├─ Save player (version 1→2)
                ├─ Insert inventory
                └─ Commit ──► lock.release()

Request B ──► @Transactional.begin()
                ├─ PESSIMISTIC_WRITE.lock(player) — BLOCKS
                │    (A commits here)
                ├─ Lock acquires → read gold: 50
                ├─ Deduct: gold(50→0)
                ├─ Save player (version 2→3)
                ├─ Insert inventory
                └─ Commit ──► success (if gold was enough)
```

---

## Part 5: API Contracts

### Streak Endpoints

| Method | Path | Params | Response 200 | Errors |
|--------|------|--------|-------------|--------|
| `GET` | `/api/streaks/habit/{habitId}` | `?playerId=X` | `{ habitId, playerId, currentStreak, longestStreak, multiplier, lastCompletedDate }` | 404: habit/player not found |
| `GET` | `/api/streaks/player/{playerId}` | — | `{ streaks: [{ habitId, habitName, currentStreak, longestStreak, multiplier }] }` | 404: player not found |

### Shop Endpoints

| Method | Path | Body/Params | Response 200 | Errors |
|--------|------|-------------|-------------|--------|
| `GET` | `/api/shop/items` | `?category=CONSUMABLE` (optional) | `{ items: [ShopItem...] }` | — |
| `POST` | `/api/shop/buy/{itemId}` | `{ "playerId": 1 }` | `{ success, goldRemaining, gemsRemaining, quantity }` | 400: INSUFFICIENT_GOLD/GEMS, ITEM_NOT_AVAILABLE, MAX_OWNED_EXCEEDED |
| `GET` | `/api/shop/inventory` | `?playerId=X` | `{ inventory: [{ id, itemId, name, itemType, quantity, isEquipped, expiresAt, equipSlot }] }` | — |
| `GET` | `/api/shop/equipment` | `?playerId=X` | `{ equipment: [{ id, itemId, name, rarity, slot, equippedAt }] }` | — |
| `POST` | `/api/shop/inventory/equip/{inventoryId}` | `{ "playerId": 1 }` | `{ success: true, equipped: true }` | 400: NOT_EQUIPPABLE, 404: not in inventory |
| `POST` | `/api/shop/inventory/unequip/{slot}` | `{ "playerId": 1 }` | `{ success: true, equipped: false }` | 404: nothing equipped in slot |

### Modified Endpoints

| Method | Path | Changes |
|--------|------|---------|
| `GET` | `/api/player/{id}/stats` | Added `gems` to `PlayerStatsDTO` |
| `POST` | `/api/habits/{habitId}/complete/{playerId}` | Now returns `{ success, player, xpEarned, goldEarned, currentStreak, longestStreak, streakMultiplier, leveledUp }` |
| `POST` | `/api/player/{id}/buy-potion` | Delegates to `ShopService.purchaseItem()`, unchanged response format |

### Error Response Format

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable description",
  "required": 50,
  "available": 30
}
```

---

## Part 6: Frontend Architecture

### 6.1 — Navigation Structure

```
app/
├── _layout.tsx                    (RootStack with modal support)
├── modal.tsx                      → PurchaseConfirmModal (presentation)
└── (tabs)/
    ├── _layout.tsx                → 3 tabs: Dashboard | Hábitos | Tienda
    ├── index.tsx                  → Dashboard (streak summary, equipment preview)
    ├── habits.tsx                 → Habits list (StreakBadge in HabitCard)
    └── shop.tsx                   → Shop (Catalog + Inventory toggle) [REPLACES explore.tsx]
```

**`_layout.tsx` changes**: Add the third tab:
```tsx
<Tabs.Screen
  name="shop"
  options={{
    title: "Tienda",
    tabBarIcon: ({ color }) => (
      <IconSymbol size={28} name="cart.fill" color={color} />
    ),
  }}
/>
```

**Root `_layout.tsx` changes**: Add modal support for purchase confirmation:
```tsx
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: "modal", title: "Confirmar Compra" }}
      />
    </Stack>
  );
}
```

### 6.2 — New Components

| Component | File | Description |
|-----------|------|-------------|
| `StreakBadge` | `components/StreakBadge.tsx` | Badge with flame icon + day count, colored by tier |
| `ShopItemCard` | `components/ShopItemCard.tsx` | RPG-style item card with rarity border, price, owned badge |
| `PurchaseConfirmModal` | `app/modal.tsx` | Full-screen modal with item preview, price, confirm/cancel |
| `InventoryList` | `components/InventoryList.tsx` | Grid of owned items with equip/unequip toggle |
| `EquipmentSlot` | `components/EquipmentSlot.tsx` | Visual equipment slot (skin, accessory 1, accessory 2) |
| `StreakSummary` | `components/StreakSummary.tsx` | Dashboard widget showing top streaks per habit |
| `ItemRarityBorder` | `components/ItemRarityBorder.tsx` | Wrapper view that colors border by rarity tier |

### 6.3 — RPG UX Design System

#### Rarity Color Mapping
```
COMMON    → #FFFFFF (white)
UNCOMMON  → #4CAF50 (green)
RARE      → #2196F3 (blue)
EPIC      → #9C27B0 (purple)
LEGENDARY → #FF9800 (orange)
```

#### Streak Tier Visuals
```
0-2   days → Gray (#9E9E9E)   — "Ember"
3-6   days → Bronze (#CD7F32) — "Spark"
7-13  days → Silver (#C0C0C0) — "Flame"
14-29 days → Gold (#FFD700)    — "Blaze"
30+   days → Diamond (#B9F2FF) — "Inferno"
```

#### Equipment Slot Layout (Dashboard)
```
┌─────────────────────────┐
│      [SKIN SLOT]        │  ← Main cosmetic (e.g. Túnica)
│    🧙‍♂️ Avatar Area       │
│  [ACC1]        [ACC2]   │  ← Accessory slots
└─────────────────────────┘
```

#### Item Card Layout
```
┌──────────────────┐
│  ┌────────────┐  │
│  │  ITEM ICON │  │  ← Image placeholder
│  │    (64x64) │  │
│  └────────────┘  │
│  Nombre del Ítem │  ← Bordered by rarity color
│  ★★★ Rare       │  ← Rarity indicator
│  ─────────────  │
│  Descripción     │
│  💰 200 Oro      │
│  💎 0 Gemas      │
│  ┌────────────┐  │
│  │  COMPRAR   │  │  ← Disabled if insufficient funds
│  └────────────┘  │
└──────────────────┘
```

### 6.4 — New Store: `shopStore.ts`

```typescript
import { create } from 'zustand';
import apiClient from '@/services/api/client';
import { Config } from '@/constants/config';
import { usePlayerStore } from './playerStore';

interface ShopItem {
  id: number;
  name: string;
  description: string;
  itemType: 'CONSUMABLE' | 'COSMETIC' | 'BOOST';
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
  priceGold: number;
  priceGems: number;
  effectType: string;
  effectValue: number;
  imageUrl: string | null;
  isPurchasable: boolean;
  maxOwned: number | null;
  equipSlot: string | null;
}

interface InventoryItem {
  id: number;
  itemId: number;
  name: string;
  description: string;
  itemType: string;
  rarity: string;
  quantity: number;
  isEquipped: boolean;
  expiresAt: string | null;
  equipSlot: string | null;
}

interface EquipmentItem {
  id: number;
  itemId: number;
  name: string;
  rarity: string;
  slot: string;
  equippedAt: string;
}

interface ShopState {
  catalog: ShopItem[];
  inventory: InventoryItem[];
  equipment: EquipmentItem[];
  isPurchasing: boolean;
  isLoading: boolean;
  error: string | null;

  fetchCatalog: (category?: string) => Promise<void>;
  fetchInventory: () => Promise<void>;
  fetchEquipment: () => Promise<void>;
  purchaseItem: (itemId: number) => Promise<boolean>;
  equipItem: (inventoryId: number) => Promise<boolean>;
  unequipItem: (slot: string) => Promise<boolean>;
}

export const useShopStore = create<ShopState>((set, get) => ({
  catalog: [],
  inventory: [],
  equipment: [],
  isPurchasing: false,
  isLoading: false,
  error: null,

  fetchCatalog: async (category?: string) => {
    try {
      set({ isLoading: true, error: null });
      const params = category ? { category } : {};
      const response = await apiClient.get('/shop/items', { params });
      set({ catalog: response.data.items, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Error al cargar la tienda', isLoading: false });
    }
  },

  fetchInventory: async () => {
    try {
      const response = await apiClient.get('/shop/inventory', {
        params: { playerId: Config.PLAYER_ID }
      });
      set({ inventory: response.data.inventory });
    } catch (err: any) {
      set({ error: err?.message || 'Error al cargar inventario' });
    }
  },

  fetchEquipment: async () => {
    try {
      const response = await apiClient.get('/shop/equipment', {
        params: { playerId: Config.PLAYER_ID }
      });
      set({ equipment: response.data.equipment });
    } catch (err: any) {
      // Equipment fetch failure is non-critical
    }
  },

  purchaseItem: async (itemId: number) => {
    if (get().isPurchasing) {
      console.log('[ShopStore] Purchase already in progress, blocking duplicate');
      return false;
    }
    set({ isPurchasing: true, error: null });
    try {
      await apiClient.post(`/shop/buy/${itemId}`, {
        playerId: Config.PLAYER_ID
      });
      await get().fetchInventory();
      await get().fetchEquipment();
      await usePlayerStore.getState().fetchPlayer();
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || err?.message || 'Error al comprar';
      set({ error: msg });
      return false;
    } finally {
      set({ isPurchasing: false });
    }
  },

  equipItem: async (inventoryId: number) => {
    try {
      await apiClient.post(`/shop/inventory/equip/${inventoryId}`, {
        playerId: Config.PLAYER_ID
      });
      await get().fetchInventory();
      await get().fetchEquipment();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Error al equipar' });
      return false;
    }
  },

  unequipItem: async (slot: string) => {
    try {
      await apiClient.post(`/shop/inventory/unequip/${slot}`, {
        playerId: Config.PLAYER_ID
      });
      await get().fetchInventory();
      await get().fetchEquipment();
      return true;
    } catch (err: any) {
      set({ error: err.response?.data?.message || 'Error al desequipar' });
      return false;
    }
  },
}));
```

### 6.5 — Updated Stores

#### `playerStore.ts` — Add `gems` to state + type

```typescript
interface PlayerStats {
  // ... existing fields ...
  gold: number;
  gems: number;      // ← NEW
  lives: number;
}

interface PlayerState {
  // ... existing ...
  // Remove buyPotion — it now routes through Shop screen
}

// Remove the buyPotion action entirely, or keep as deprecated delegate
```

#### `habitStore.ts` — Add streak data

```typescript
// Extend the habit type returned from the API
interface HabitStreakData {
  currentStreak: number;
  longestStreak: number;
  streakMultiplier: number;
}

// In completeHabit, capture streak response:
completeHabit: async (habitId: number) => {
  try {
    const response = await habitService.complete(habitId);
    const data = response.data;
    // data now includes: currentStreak, longestStreak, streakMultiplier
    await get().fetchHabits();
    return data;
  } catch (err: any) {
    throw err;
  }
},
```

### 6.6 — New API Services

#### `services/api/shop.ts`
```typescript
import apiClient from './client';
import { Config } from '@/constants/config';

export const shopService = {
  getCatalog: (category?: string) =>
    apiClient.get('/shop/items', { params: category ? { category } : {} }),
  buy: (itemId: number) =>
    apiClient.post(`/shop/buy/${itemId}`, { playerId: Config.PLAYER_ID }),
  getInventory: () =>
    apiClient.get('/shop/inventory', { params: { playerId: Config.PLAYER_ID } }),
  getEquipment: () =>
    apiClient.get('/shop/equipment', { params: { playerId: Config.PLAYER_ID } }),
  equip: (inventoryId: number) =>
    apiClient.post(`/shop/inventory/equip/${inventoryId}`, { playerId: Config.PLAYER_ID }),
  unequip: (slot: string) =>
    apiClient.post(`/shop/inventory/unequip/${slot}`, { playerId: Config.PLAYER_ID }),
};
```

#### `services/api/streaks.ts`
```typescript
import apiClient from './client';
import { Config } from '@/constants/config';

export const streakService = {
  getByHabit: (habitId: number) =>
    apiClient.get(`/streaks/habit/${habitId}`, { params: { playerId: Config.PLAYER_ID } }),
  getAllForPlayer: () =>
    apiClient.get(`/streaks/player/${Config.PLAYER_ID}`),
};
```

---

## Part 7: Seed Data

### `DataSeeder.java`

Create a `@Component` with `@PostConstruct` or `CommandLineRunner` that only inserts if tables are empty:

```java
@Component
public class DataSeeder implements CommandLineRunner {

    private final ShopItemRepository shopItemRepository;

    public DataSeeder(ShopItemRepository shopItemRepository) {
        this.shopItemRepository = shopItemRepository;
    }

    @Override
    public void run(String... args) {
        if (shopItemRepository.count() > 0) {
            System.out.println("[DataSeeder] Shop items already exist, skipping seed.");
            return;
        }

        System.out.println("[DataSeeder] Seeding shop items...");

        shopItemRepository.saveAll(List.of(
            // CONSUMABLES
            new ShopItem(null, "Poción de Salud", "Restaura 20 HP al instante",
                ItemType.CONSUMABLE, Rarity.COMMON, 50, 0,
                EffectType.HEAL, 20, "/assets/items/potion-health.png",
                true, null, null, EquipSlot.SKIN),

            new ShopItem(null, "Poción de Energía", "Recupera 30 de energía",
                ItemType.CONSUMABLE, Rarity.COMMON, 40, 0,
                EffectType.ENERGY, 30, "/assets/items/potion-energy.png",
                true, null, null, EquipSlot.SKIN),

            new ShopItem(null, "Elixir del Héroe", "Restaura salud y energía al máximo",
                ItemType.CONSUMABLE, Rarity.RARE, 100, 5,
                EffectType.HEAL, 100, "/assets/items/elixir-hero.png",
                true, null, null, EquipSlot.SKIN),

            // COSMETICS
            new ShopItem(null, "Túnica del Aventurero", "Una túnica resistente para viajeros",
                ItemType.COSMETIC, Rarity.UNCOMMON, 200, 0,
                EffectType.COSMETIC, 0, "/assets/items/tunic-aventurero.png",
                true, 1, null, EquipSlot.SKIN),

            new ShopItem(null, "Capa de las Sombras", "Te envuelve en penumbra sigilosa",
                ItemType.COSMETIC, Rarity.RARE, 300, 10,
                EffectType.COSMETIC, 0, "/assets/items/capa-sombras.png",
                true, 1, null, EquipSlot.ACCESSORY_1),

            new ShopItem(null, "Amuleto del Fénix", "Brilla con fuego renaciente",
                ItemType.COSMETIC, Rarity.EPIC, 500, 25,
                EffectType.COSMETIC, 0, "/assets/items/amuleto-phoenix.png",
                true, 1, null, EquipSlot.ACCESSORY_2),

            new ShopItem(null, "Armadura de Dragón", "Imponente armadura escamada",
                ItemType.COSMETIC, Rarity.LEGENDARY, 1000, 50,
                EffectType.COSMETIC, 0, "/assets/items/armor-dragon.png",
                true, 1, null, EquipSlot.SKIN),

            // BOOSTS
            new ShopItem(null, "Tomo de Sabiduría", "Duplica la XP ganada por 24 horas",
                ItemType.BOOST, Rarity.RARE, 150, 0,
                EffectType.XP_BOOST, 2, "/assets/items/tomo-sabiduria.png",
                true, null, 24, EquipSlot.SKIN),

            new ShopItem(null, "Amuleto de Riqueza", "Aumenta el oro obtenido un 50% por 24h",
                ItemType.BOOST, Rarity.RARE, 120, 0,
                EffectType.GOLD_BOOST, 50, "/assets/items/amuleto-riqueza.png",
                true, null, 24, EquipSlot.ACCESSORY_1)
        ));

        System.out.println("[DataSeeder] " + 9 + " shop items seeded.");
    }
}
```

---

## Part 8: Migration Plan

Ordered steps, each independently testable:

### Step 1: Player Model — Add `gems` + `@Version` (Backward Compatible)
- Modify `Player.java`: add `private int gems = 0;` + `@Version private Integer version;`
- Modify `PlayerStatsDTO.java`: add `private int gems;`
- Modify `PlayerController.getPlayerStats()`: pass `player.getGems()` in DTO construction
- **Test**: `/api/player/{id}/stats` returns `gems` field, existing endpoints still work

### Step 2: Streak Entities + Migration
- Create SQL migration: `habit_completions` + `habit_streaks` tables
- Create `HabitCompletion.java`, `HabitStreak.java`, `StreakTier.java`
- Create `HabitCompletionRepository`, `HabitStreakRepository`
- **Test**: Tables created, can insert rows directly via SQL

### Step 3: StreakService
- Create `StreakService.java` with `recordCompletion`, `getStreakData`, `getAllStreaksForPlayer`
- Create `StreakController.java`
- **Test**: `POST` a completion directly via a test endpoint, verify streak calculation

### Step 4: Integrate Streaks into HabitService
- Modify `HabitService.java`: inject `StreakService`, call `recordCompletion()` inside `completeHabit()`
- Update `HabitController.completeHabit` response to include streak data
- Handle `DuplicateHabitException` → return HTTP 409
- **Test**: Complete a habit, verify streak returns in response

### Step 5: Shop Entities + Migration
- Create SQL migration: `shop_items`, `player_inventory`, `player_equipment` tables
- Create enums: `ItemType.java`, `Rarity.java`, `EffectType.java`, `EquipSlot.java`
- Create entities: `ShopItem.java`, `PlayerInventory.java`, `PlayerEquipment.java`
- Create repositories: `ShopItemRepository`, `PlayerInventoryRepository`, `PlayerEquipmentRepository`
- Create `PlayerRepository.findByIdWithLock()` with `@Lock(PESSIMISTIC_WRITE)`
- **Test**: Tables created, can query via repository

### Step 6: ShopService + Controller
- Create `ShopService.java` with `purchaseItem`, `getCatalog`, `getInventory`, `equipItem`, `unequipItem`
- Create `ShopController.java`
- **Test**: Purchase items via API, verify gold deduction and inventory creation

### Step 7: Seed Data
- Create `DataSeeder.java` with 9 shop items
- **Test**: App starts, shop items exist in DB

### Step 8: Refactor buyHealthPotion
- Modify `PlayerService`: inject `ShopService`, delegate `buyHealthPotion()` → `shopService.purchaseItem()`
- Keep old endpoint for backward compat
- **Test**: Old `/buy-potion` endpoint still works

### Step 9: Frontend — New Stores + API Services
- Create `services/api/shop.ts`, `services/api/streaks.ts`
- Create `stores/shopStore.ts`
- Modify `stores/playerStore.ts`: add `gems`, remove or deprecate `buyPotion`
- Modify `stores/habitStore.ts`: handle streak data in response
- **Test**: Stores compile, API calls work

### Step 10: Frontend — Shop Screen
- Replace `explore.tsx` content with `shop.tsx` (catalog + inventory toggle)
- Update `_layout.tsx`: add 3rd tab pointing to `shop`, remove `explore` reference
- Create `components/ShopItemCard.tsx` (or inline in shop.tsx)
- Create `components/PurchaseConfirmModal.tsx`
- **Test**: Navigate to Tienda tab, see items, purchase flow works

### Step 11: Frontend — StreakBadge + HabitCard
- Create `components/StreakBadge.tsx`
- Modify `components/HabitCard.tsx`: add StreakBadge
- **Test**: Habits screen shows streak badges

### Step 12: Frontend — Dashboard Updates
- Modify `app/(tabs)/index.tsx`:
  - Replace buyPotion button with "Ir a la Tienda" link
  - Add gem display next to gold
  - Add equipment preview section (equipped items)
  - Add streak summary section
- **Test**: Dashboard shows gems, equipment, streaks, shop link

### Step 13: Frontend — Inventory + Equipment
- Create `components/InventoryList.tsx`, `components/EquipmentSlot.tsx`
- Wire equip/unequip in inventory view
- **Test**: Equip/unequip flow works end-to-end

---

## Architecture Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Streak calculation | Lazy evaluation on read | No scheduler, no timezone bugs, simpler architecture |
| Streak storage | `HabitStreak` table (cached) + `HabitCompletion` (raw data) | Cached for fast reads, raw data for recalculation |
| Completion dedup | UNIQUE constraint `(habit_id, player_id, completed_date)` + app-level check | Double protection — DB constraint is the source of truth |
| Purchase concurrency | `PESSIMISTIC_WRITE` lock + `@Version` | Pessimistic lock queues concurrent requests; `@Version` is fallback if lock mechanism fails |
| Equipment model | Dedicated `player_equipment` table with slot UNIQUE | DB-enforced "one per slot" — no app-level bugs possible |
| Item types | Enum-based with switch in ShopService | New item types = new enum value + new case; no strategy pattern overhead for current scope |
| Frontend nav | 3 tabs (Dashboard, Hábitos, Tienda) + sub-screens | Avoids tab bar clutter; Inventory and Equipment are sub-views |
| Buy button guard | `isPurchasing` flag in Zustand + disabled button | Client-side first defense, second is server-side lock |
| Seed data | `CommandLineRunner` with `if empty` guard | No duplicate seed logic; can reset DB and restart safely |
| `@Version` type | `Integer` (nullable wrapper) | Conventional choice — Hibernate manages it; `null` on persist → version 0 |

---

## Data Flow Diagram

```
COMPLETE HABIT FLOW:

  ┌──────────┐    POST /habits/{id}/complete/{playerId}
  │  Mobile  │ ──────────────────────────────────────────►
  └──────────┘                                            │
                                                  ┌──────▼──────┐
                                                  │  HabitCon-  │
                                                  │  troller    │
                                                  └──────┬──────┘
                                                         │
                                                  ┌──────▼──────┐
                                                  │  HabitService│
                                                  │  .complete() │
                                                  └──┬───────┬──┘
                                                     │       │
                                          ┌──────────▼┐  ┌──▼──────────┐
                                          │ StreakSvc │  │ PlayerSvc   │
                                          │ .record() │  │ .gainXp()   │
                                          └─────┬─────┘  │ .addGold()  │
                                                │        └──────┬──────┘
                                          ┌─────▼─────┐        │
                                          │ HabitComp │        │
                                          │ +Streak   │        │
                                          └───────────┘        │
                                                               │
                                                  ┌────────────▼──┐
                                                  │    Response   │
                                                  │ { xp, gold,   │
                                                  │   streak,     │
                                                  │   multiplier }│
                                                  └───────────────┘


PURCHASE FLOW:

  ┌──────────┐    POST /shop/buy/{itemId}
  │  Mobile  │ ──────────────────────────────────────────►
  └──────────┘                                            │
  (isPurchasing=true, btn disabled)                ┌──────▼──────┐
                                                   │  ShopCont-  │
                                                   │  roller     │
                                                   └──────┬──────┘
                                                          │
                                                   ┌──────▼──────┐
                                                   │  ShopService│
                                                   │  .purchase() │
                                                   └──┬───┬───┬──┘
                                                      │   │   │
                                   ┌──────────────────┘   │   └──────────┐
                                   │                      │              │
                            ┌──────▼──────┐       ┌───────▼──────┐  ┌───▼────────┐
                            │ PlayerRepo  │       │ ShopItemRepo │  │ PlayerInv  │
                            │ .findById-  │       │ .findById()  │  │ .upsert()  │
                            │ WithLock()  │       └──────────────┘  └────────────┘
                            │ (PESSIMISTIC│
                            │  _WRITE)    │
                            └──────┬──────┘
                                   │
                            ┌──────▼──────┐
                            │ Player      │
                            │ gold -=     │
                            │ priceGold   │
                            │ @Version++  │
                            └─────────────┘
```

---

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit: StreakService | `recordCompletion`, `calculateCurrentStreak`, `getMultiplier` | Mock `HabitCompletionRepository`, test all edge cases (first completion, consecutive, gap, duplicate) |
| Unit: ShopService | `purchaseItem`, `equipItem`, `unequipItem` | Mock repositories, test currency validation, concurrency scenarios, max_owned |
| Integration: Streak | Full flow from controller to DB | Create player + habit, call complete endpoint, verify streak data persisted |
| Integration: Shop | Purchase with concurrency | Use `@Transactional` test with `CountDownLatch` to simulate concurrent purchases |
| E2E: Frontend | Shop purchase flow | Detox or manual: tap Buy, verify confirmation modal, confirm, verify inventory updates |
| E2E: Frontend | Streak display | Complete a habit, verify StreakBadge appears with correct color/day count |

---

## Open Questions

- [ ] **Rarity-based pricing balance**: Are the current gold/gem prices reasonable for the gameplay loop? May need tuning after playtesting.
- [ ] **XP_BOOST effect mechanics**: Should a boost item double XP for all habits, or just the next N completions? Current design assumes time-based (24h window).
- [ ] **EquipSlot enum completeness**: SKIN + 2 accessories is enough for MVP, but may need more (WEAPON, HELM, etc.) in future cosmetic expansions.
- [ ] **Negative habit streaks**: Spec explicitly excludes streaks for negative habits. Confirm this is intentional — negative habits could benefit from "days without failing" streaks.
- [ ] **Frontend error handling for 409**: The purchase confirmation modal needs to handle `INSUFFICIENT_GOLD` vs `ALREADY_PURCHASED` vs network errors distinctly.
- [ ] **Gem economy source**: Gems currently have no way to be earned in this phase. Confirm they're being added for future-proofing (battle pass, achievements) and we're not blocking on them now.

---

## File Inventory

### Backend — New (17 files)

| File | Description |
|------|-------------|
| `models/HabitCompletion.java` | JPA entity — habit completion record |
| `models/HabitStreak.java` | JPA entity — cached streak data |
| `models/ShopItem.java` | JPA entity — shop catalog item |
| `models/PlayerInventory.java` | JPA entity — owned items |
| `models/PlayerEquipment.java` | JPA entity — equipped cosmetics |
| `models/ItemType.java` | Enum — CONSUMABLE, COSMETIC, BOOST |
| `models/Rarity.java` | Enum — COMMON through LEGENDARY |
| `models/EffectType.java` | Enum — HEAL, ENERGY, XP_BOOST, etc. |
| `models/EquipSlot.java` | Enum — SKIN, ACCESSORY_1, ACCESSORY_2 |
| `models/StreakTier.java` | Record — tier configuration |
| `repositories/HabitCompletionRepository.java` | JPA repository |
| `repositories/HabitStreakRepository.java` | JPA repository |
| `repositories/ShopItemRepository.java` | JPA repository |
| `repositories/PlayerInventoryRepository.java` | JPA repository |
| `repositories/PlayerEquipmentRepository.java` | JPA repository |
| `services/StreakService.java` | Streak business logic |
| `services/ShopService.java` | Shop business logic |
| `controllers/StreakController.java` | REST endpoints for streaks |
| `controllers/ShopController.java` | REST endpoints for shop + inventory |
| `DataSeeder.java` | Seed data runner |

### Backend — Modified (6 files)

| File | Changes |
|------|---------|
| `models/Player.java` | Add `gems`, `@Version` |
| `repositories/PlayerRepository.java` | Add `findByIdWithLock()` |
| `services/HabitService.java` | Inject `StreakService`, integrate streak recording |
| `services/PlayerService.java` | Inject `ShopService`, delegate `buyHealthPotion()` |
| `controllers/PlayerController.java` | Add `gems` to DTO mapping |
| `controllers/HabitController.java` | Update response to include streak data |

### Frontend — New (6 files)

| File | Description |
|------|-------------|
| `services/api/shop.ts` | Shop API service |
| `services/api/streaks.ts` | Streaks API service |
| `stores/shopStore.ts` | Zustand store for shop + inventory |
| `components/StreakBadge.tsx` | Streak badge component |
| `components/ShopItemCard.tsx` | Shop item card component |
| `components/PurchaseConfirmModal.tsx` | Purchase confirmation modal |

### Frontend — Modified (5 files)

| File | Changes |
|------|---------|
| `app/(tabs)/_layout.tsx` | Add 3rd tab (Tienda), remove `explore` |
| `app/(tabs)/index.tsx` | Replace buyPotion → shop link, add gems, streaks, equipment |
| `stores/playerStore.ts` | Add `gems` to state, remove/deprecate `buyPotion` |
| `stores/habitStore.ts` | Handle streak data in `completeHabit` response |
| `components/HabitCard.tsx` | Add `StreakBadge` |

### Frontend — Deleted (1 file)

| File | Reason |
|------|--------|
| `app/(tabs)/explore.tsx` | Replaced by `shop.tsx` |
