# Risk Solutions: Fase 1 — Streaks + Shop

- **Artifact**: `sdd/fase1-streaks-shop/risk-solutions` (engram)
- **File**: `openspec/fase1-streaks-shop-risk-solutions.md`
- **Date**: 2026-07-01
- **Author**: System Architect (AI-assisted)

---

## Risk 1 — Timezone Handling for Streaks

### The Problem

A player in UTC+12 completes a habit at 11 PM local (11 AM UTC) and again at 1 AM local next day (1 PM UTC the **same** calendar day). If we use `TIMESTAMP` + daily scheduler, both completions land on the same UTC date, breaking streak counting. The proposal originally called for a midnight UTC scheduler — this solution **removes that scheduler entirely**.

### The Solution: Lazy Streak Evaluation with UTC Dates

**Core principle**: Streaks are **calculated on read**, never maintained by a scheduler. No cron, no midnight reset. The `completed_date` is stored as a `LocalDate` in UTC so the calendar-day boundary is unambiguous.

#### 1. Schema change to `habit_completions`

Replace `completed_at TIMESTAMP` with `completed_date DATE`:

```sql
CREATE TABLE habit_completions (
    id              BIGSERIAL PRIMARY KEY,
    habit_id        BIGINT NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    player_id       BIGINT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    completed_date  DATE NOT NULL,              -- LocalDate in UTC, no time component
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(habit_id, player_id, completed_date) -- one completion per habit per UTC day
);

CREATE INDEX idx_completions_lookup
    ON habit_completions(habit_id, player_id, completed_date DESC);
```

**Why `DATE` instead of `TIMESTAMP`**:
- Eliminates timezone ambiguity entirely — a date is a date
- The UNIQUE constraint on `(habit_id, player_id, completed_date)` prevents double-counting even if the user completes at 11 PM UTC-12 and again at 1 AM local next day (both → same UTC date → second insert fails → no streak break)
- The index enables the backward-scan query for streak calculation

#### 2. New entity: `HabitCompletion.java`

```java
package ToDoApp.HabitsRPG.models;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "completed_date", nullable = false)
    private LocalDate completedDate;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
```

#### 3. New repository: `HabitCompletionRepository.java`

```java
package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.HabitCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, Long> {

    // For streak calculation: get all dates for a habit, newest first
    @Query("SELECT hc.completedDate FROM HabitCompletion hc " +
           "WHERE hc.habit.id = :habitId AND hc.playerId = :playerId " +
           "ORDER BY hc.completedDate DESC")
    List<LocalDate> findCompletedDatesByHabitAndPlayer(
        @Param("habitId") Long habitId,
        @Param("playerId") Long playerId
    );

    // Check if today already has a completion (for idempotency)
    Optional<HabitCompletion> findByHabitIdAndPlayerIdAndCompletedDate(
        Long habitId, Long playerId, LocalDate completedDate
    );

    // For longest streak calculation (full history)
    long countByHabitIdAndPlayerId(Long habitId, Long playerId);

    // For dashboard: get all completion dates for a player (all habits)
    @Query("SELECT hc.completedDate FROM HabitCompletion hc " +
           "WHERE hc.habit.id IN :habitIds AND hc.playerId = :playerId " +
           "ORDER BY hc.completedDate DESC")
    List<LocalDate> findCompletedDatesByHabitsAndPlayer(
        @Param("habitIds") List<Long> habitIds,
        @Param("playerId") Long playerId
    );
}
```

#### 4. Core streak logic: `StreakService.java`

```java
package ToDoApp.HabitsRPG.services;

import ToDoApp.HabitsRPG.models.HabitCompletion;
import ToDoApp.HabitsRPG.repositories.HabitCompletionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.*;

@Service
public class StreakService {

    private final HabitCompletionRepository completionRepository;

    public StreakService(HabitCompletionRepository completionRepository) {
        this.completionRepository = completionRepository;
    }

    /**
     * Record a habit completion for TODAY in UTC.
     * If already completed today, returns false (idempotent).
     */
    @Transactional
    public boolean recordCompletion(Long habitId, Long playerId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // Idempotency: if already completed today, skip silently
        if (completionRepository
                .findByHabitIdAndPlayerIdAndCompletedDate(habitId, playerId, today)
                .isPresent()) {
            return false;
        }

        HabitCompletion completion = new HabitCompletion();
        completion.setHabitId(habitId);  // requires adding this field or setting the Habit ref
        completion.setPlayerId(playerId);
        completion.setCompletedDate(today);
        completionRepository.save(completion);
        return true;
    }

    /**
     * Calculate the CURRENT streak lazily (on read).
     *
     * Algorithm:
     * 1. Fetch all completed dates for this habit, ordered DESC
     * 2. Start from today (UTC) and count consecutive days backward
     * 3. If today has NO completion yet, check if yesterday does — if so,
     *    start counting from yesterday (streak is still alive)
     * 4. First gap (date difference > 1) breaks the streak
     */
    public int calculateCurrentStreak(Long habitId, Long playerId) {
        List<LocalDate> dates = completionRepository
                .findCompletedDatesByHabitAndPlayer(habitId, playerId);

        if (dates.isEmpty()) return 0;

        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // Determine the anchor date: today or yesterday (whichever has a completion)
        LocalDate anchor = null;
        int startIndex = 0;

        if (dates.get(0).equals(today)) {
            anchor = today;
            startIndex = 0;
        } else if (dates.get(0).equals(today.minusDays(1))) {
            // Streak is still alive if they completed yesterday
            anchor = today.minusDays(1);
            startIndex = 0;
        } else {
            // Last completion is older than yesterday → streak is broken
            return 0;
        }

        // Count consecutive days backward from anchor
        int streak = 0;
        LocalDate expected = anchor;

        for (int i = startIndex; i < dates.size(); i++) {
            if (dates.get(i).equals(expected)) {
                streak++;
                expected = expected.minusDays(1);
            } else if (dates.get(i).isBefore(expected)) {
                // Gap found — streak ends
                break;
            }
            // If dates.get(i).isAfter(expected), skip (shouldn't happen with DESC order)
        }

        return streak;
    }

    /**
     * Calculate the LONGEST streak for a habit (historical maximum).
     * Scans all completions and finds the longest consecutive run.
     */
    public int calculateLongestStreak(Long habitId, Long playerId) {
        List<LocalDate> dates = completionRepository
                .findCompletedDatesByHabitAndPlayer(habitId, playerId);

        if (dates.isEmpty()) return 0;

        // Reverse to ascending order for easier scanning
        Collections.reverse(dates);

        int longest = 0;
        int currentRun = 1; // At least one date exists

        for (int i = 1; i < dates.size(); i++) {
            LocalDate prev = dates.get(i - 1);
            LocalDate curr = dates.get(i);

            if (prev.plusDays(1).equals(curr)) {
                // Consecutive day
                currentRun++;
            } else if (prev.equals(curr)) {
                // Same date (duplicate) — skip, shouldn't happen due to UNIQUE
                continue;
            } else {
                // Gap — streak broken
                longest = Math.max(longest, currentRun);
                currentRun = 1;
            }
        }

        return Math.max(longest, currentRun);
    }

    /**
     * Streak multiplier tiers.
     * Returns multiplier based on current streak value.
     */
    public double getMultiplier(int currentStreak) {
        // Defined as constants or from DB config
        return StreakTier.getMultiplier(currentStreak);
    }
}
```

#### 5. Streak tier configuration

```java
package ToDoApp.HabitsRPG.models;

import java.util.List;

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

#### 6. Integration with `HabitService.completeHabit()`

In `HabitService.java`, add the streak recording call:

```java
private final StreakService streakService;

public Player completeHabit(Long habitId, Long playerId) {
    // ... existing logic (energy cost, gold/xp rewards) ...

    // NEW: record habit completion for streak
    streakService.recordCompletion(habitId, playerId);

    return playerRepository.save(player);
}
```

#### 7. Frontend streak display in `HabitCard.tsx`

Add a streak badge component:

```tsx
// In HabitCard.tsx, add after the stats row:
// <StreakBadge streak={habit.currentStreak} />
```

New component `StreakBadge.tsx`:

```tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

const STREAK_COLORS = [
  { max: 2, color: "#9E9E9E", label: "gray" },    // 0-2
  { max: 6, color: "#CD7F32", label: "bronze" },   // 3-6
  { max: 13, color: "#C0C0C0", label: "silver" },  // 7-13
  { max: 29, color: "#FFD700", label: "gold" },    // 14-29
  { max: Infinity, color: "#B9F2FF", label: "diamond" }, // 30+
];

function getStreakColor(streak: number): string {
  return STREAK_COLORS.find(t => streak <= t.max)?.color ?? "#9E9E9E";
}

export default function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: getStreakColor(streak) }]}>
      <Text style={styles.text}>🔥 {streak}d</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#333",
  },
});
```

#### 8. Edge Cases Handled

| Edge Case | Behavior |
|-----------|----------|
| **Double-completion same UTC day** | UNIQUE constraint on (habit_id, player_id, completed_date) prevents second insert; `recordCompletion` checks existence and returns false |
| **User completes across UTC midnight** | Both completions on different UTC dates → counted as consecutive days |
| **User in UTC+12, completes 11 PM local (11 AM UTC)** → **1 AM local (1 PM UTC same day)** | Both map to same UTC date → second insert blocked → no double-count |
| **No completion today, completed yesterday** | Streak = count from yesterday backward (streak is still alive, user just hasn't done it yet today) |
| **No completion for 2+ days** | `calculateCurrentStreak` returns 0 — gap detected |
| **Habit deleted** | `ON DELETE CASCADE` on `habit_completions.habit_id` cleans up automatically |
| **Player deleted** | Same cascade on `player_id` (need to add FK or handle in app logic) |

**What the proposal's scheduler approach gets wrong (and why we removed it):**
- The proposal's `GameSchedulerService.checkStreaks()` at midnight UTC would reset streaks for users who haven't completed "today" yet — but "today" is ambiguous at midnight UTC because a user in UTC-8 still has 8 hours left of their day. Lazy evaluation avoids this entirely because it evaluates at read time, when "today" is well-defined.

#### 9. Files to Create / Modify

| File | Action |
|------|--------|
| `models/HabitCompletion.java` | **Create** — new entity |
| `repositories/HabitCompletionRepository.java` | **Create** — new repository |
| `services/StreakService.java` | **Create** — streak logic |
| `models/StreakTier.java` | **Create** — tier record |
| `services/HabitService.java` | **Modify** — inject StreakService, call `recordCompletion()` |
| `controllers/StreakController.java` | **Create** — streak endpoints |
| `models/Habit.java` | **Optionally** add cached `currentStreak`/`longestStreak` fields (lazy calc preferred) |
| Frontend: `components/StreakBadge.tsx` | **Create** — badge component |
| Frontend: `components/HabitCard.tsx` | **Modify** — render StreakBadge |
| Frontend: `services/api/streaks.ts` | **Create** — API service |
| Frontend: `stores/habitStore.ts` | **Modify** — include streak data in habit responses |

---

## Risk 2 — Race Conditions on Purchase

### The Problem

A player double-clicks the buy button. Two `buyHealthPotion` (or `purchaseItem`) requests arrive nearly simultaneously. Both validate sufficient gold (e.g. 50), both deduct, both succeed — player ends up with 0 gold and spent 100, or worse, negative gold.

### The Solution: Pessimistic Lock + Frontend Guard

#### 1. Add `@Version` to Player entity for optimistic locking

```java
// In Player.java — add this field
@Version
private Integer version;
```

Hibernate will increment this on every update. If two transactions read the same version and both try to update, the second one gets an `OptimisticLockException`. This is the last line of defense.

#### 2. Pessimistic write lock in PlayerRepository

```java
// In PlayerRepository.java
package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.Player;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Player p WHERE p.id = :id")
    Optional<Player> findByIdWithLock(@Param("id") Long id);
}
```

#### 3. `ShopService.java` with transactional purchase

```java
package ToDoApp.HabitsRPG.services;

import ToDoApp.HabitsRPG.models.*;
import ToDoApp.HabitsRPG.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.OptimisticLockingFailureException;

@Service
public class ShopService {

    private final PlayerRepository playerRepository;
    private final ShopItemRepository shopItemRepository;
    private final PlayerInventoryRepository inventoryRepository;
    private final PlayerService playerService;

    public ShopService(PlayerRepository playerRepository,
                       ShopItemRepository shopItemRepository,
                       PlayerInventoryRepository inventoryRepository,
                       PlayerService playerService) {
        this.playerRepository = playerRepository;
        this.shopItemRepository = shopItemRepository;
        this.inventoryRepository = inventoryRepository;
        this.playerService = playerService;
    }

    /**
     * Purchase an item with full concurrency protection:
     * 1. PESSIMISTIC_WRITE lock on the player row (blocks concurrent purchases)
     * 2. @Version on Player acts as optimistic fallback
     * 3. Transaction rolls back entirely on any failure
     */
    @Transactional
    public PurchaseResult purchaseItem(Long playerId, Long itemId) {
        // 1. Lock player row — concurrent requests queue here
        Player player = playerRepository.findByIdWithLock(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        // 2. Load item catalog entry
        ShopItem item = shopItemRepository.findById(itemId)
                .orElseThrow(() -> new RuntimeException("Ítem no encontrado"));

        if (!item.isActive()) {
            throw new RuntimeException("Ítem no disponible");
        }

        // 3. Validate gold (or gems if applicable)
        if (player.getGold() < item.getPriceGold()) {
            throw new RuntimeException("Oro insuficiente: necesitas " + item.getPriceGold());
        }

        // 4. Validate health not full for heal consumables (optional UX validation)
        if (item.getItemType() == ItemType.CONSUMABLE
                && "HEAL".equals(item.getEffectType())
                && player.getHealth() >= 100) {
            throw new RuntimeException("Tu salud ya está al máximo");
        }

        // 5. Deduct gold
        player.setGold(player.getGold() - item.getPriceGold());
        playerRepository.save(player);

        // 6. Add to inventory (upsert: increment quantity if already owned)
        PlayerInventory inventory = inventoryRepository
                .findByPlayerIdAndItemId(playerId, itemId)
                .orElseGet(() -> {
                    PlayerInventory newInv = new PlayerInventory();
                    newInv.setPlayerId(playerId);
                    newInv.setItemId(itemId);
                    newInv.setQuantity(0);
                    newInv.setEquipped(false);
                    return newInv;
                });

        inventory.setQuantity(inventory.getQuantity() + 1);
        inventoryRepository.save(inventory);

        // 7. Apply immediate effect for consumables
        if (item.getItemType() == ItemType.CONSUMABLE) {
            applyEffect(player, item);
            playerRepository.save(player);
        }

        return new PurchaseResult(true, player.getGold(), inventory.getQuantity());
    }

    private void applyEffect(Player player, ShopItem item) {
        switch (item.getEffectType()) {
            case "HEAL":
                playerService.heal(player.getId(), item.getEffectValue());
                break;
            case "RESTORE_ENERGY":
                playerService.restoreEnergy(player.getId(), item.getEffectValue());
                break;
            case "XP_BOOST":
                // XP boosts handled via a separate boost tracking mechanism
                break;
            default:
                // Cosmetic items have no immediate effect
        }
    }
}
```

#### 4. Frontend: `shopStore.ts` with `isPurchasing` guard

```typescript
import { create } from 'zustand';
import { shopService } from '@/services/api/shop';

interface ShopItem {
  id: number;
  name: string;
  description: string;
  itemType: string;
  priceGold: number;
  priceGems: number;
  effectType: string;
  effectValue: number;
  imageUrl: string;
}

interface InventoryItem {
  id: number;
  itemId: number;
  name: string;
  quantity: number;
  isEquipped: boolean;
}

interface ShopState {
  catalog: ShopItem[];
  inventory: InventoryItem[];
  isPurchasing: boolean;
  isLoading: boolean;
  error: string | null;

  fetchCatalog: () => Promise<void>;
  fetchInventory: () => Promise<void>;
  purchaseItem: (itemId: number) => Promise<boolean>;
}

export const useShopStore = create<ShopState>((set, get) => ({
  catalog: [],
  inventory: [],
  isPurchasing: false,
  isLoading: false,
  error: null,

  fetchCatalog: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await shopService.getCatalog();
      set({ catalog: response.data, isLoading: false });
    } catch (err: any) {
      set({ error: err?.message || 'Error al cargar la tienda', isLoading: false });
    }
  },

  fetchInventory: async () => {
    try {
      const response = await shopService.getInventory();
      set({ inventory: response.data });
    } catch (err: any) {
      set({ error: err?.message || 'Error al cargar inventario' });
    }
  },

  purchaseItem: async (itemId: number) => {
    // 🔒 CONCURRENCY GUARD: block if already purchasing
    if (get().isPurchasing) {
      console.log('[ShopStore] Purchase already in progress, blocking duplicate');
      return false;
    }

    set({ isPurchasing: true, error: null });

    try {
      const response = await shopService.purchase(itemId);
      // Refresh inventory and player data
      await get().fetchInventory();
      // Import playerStore dynamically to avoid circular deps
      const { usePlayerStore } = await import('@/stores/playerStore');
      await usePlayerStore.getState().fetchPlayer();
      return true;
    } catch (err: any) {
      set({ error: err?.message || 'Error al comprar' });
      return false;
    } finally {
      // 🔓 Release the guard in ALL cases (success, error, or exception)
      set({ isPurchasing: false });
    }
  },
}));
```

#### 5. Frontend: Purchase button in `shop.tsx`

```tsx
<TouchableOpacity
  style={[
    styles.buyButton,
    shopStore.isPurchasing && styles.buyButtonDisabled,
  ]}
  onPress={() => shopStore.purchaseItem(item.id)}
  disabled={shopStore.isPurchasing}
>
  {shopStore.isPurchasing ? (
    <ActivityIndicator size="small" color="#FFF" />
  ) : (
    <Text style={styles.buyButtonText}>Comprar (${item.priceGold})</Text>
  )}
</TouchableOpacity>
```

#### 6. Concurrency Flow Diagram

```
Request A ──► @Transactional begins
                ├─ PESSIMISTIC_WRITE lock on Player
                ├─ Read gold (50)
                ├─ Set gold(50 → 0)
                ├─ Save Player ──► version bump (0→1)
                ├─ Insert inventory
                └─ Commit ──► Release lock

Request B ──► @Transactional begins
                ├─ BLOCKS on PESSIMISTIC_WRITE lock (waits)
                │     (Request A commits here)
                ├─ Acquires lock → reads Player (gold=0)
                ├─ "Oro insuficiente" → RuntimeException
                └─ Rollback ──► No changes persisted
```

#### 7. Edge Cases Handled

| Edge Case | Behavior |
|-----------|----------|
| **Double-click buy** | First request acquires lock, processes, releases. Second request blocks, then fails with "insufficient gold" |
| **Network timeout on client side** | Transaction on server already committed — gold deducted, item granted. `isPurchasing` resets on `finally` block, user refreshes and sees new inventory |
| **OptimisticLockException** | If pessimistic lock fails (rare), `@Version` prevents stale updates — transaction rolls back, client shows error |
| **Purchase same item twice** | `PlayerInventory` upsert increments quantity, so owning 2 potions is valid |
| **Frontend navigates away mid-purchase** | `finally` block in Zustand resets `isPurchasing` immediately, no stuck loading state |
| **Server crash mid-transaction** | ACID: transaction either fully commits (gold deducted, item granted) or fully rolls back — no inconsistent state |

#### 8. Files to Create / Modify

| File | Action |
|------|--------|
| `models/Player.java` | **Modify** — add `@Version private Integer version` |
| `repositories/PlayerRepository.java` | **Modify** — add `findByIdWithLock()` |
| `services/ShopService.java` | **Create** — purchase logic with pessimistic lock |
| `repositories/ShopItemRepository.java` | **Create** — new repository |
| `repositories/PlayerInventoryRepository.java` | **Create** — new repository |
| `models/ShopItem.java` | **Create** — new entity |
| `models/PlayerInventory.java` | **Create** — new entity |
| `models/ItemType.java` | **Create** — enum (CONSUMABLE, COSMETIC, BOOST) |
| `controllers/ShopController.java` | **Create** — REST endpoints |
| Frontend: `stores/shopStore.ts` | **Create** — with `isPurchasing` guard |
| Frontend: `services/api/shop.ts` | **Create** — API service |
| Frontend: `app/(tabs)/shop.tsx` | **Create** — shop screen with disabled button on purchase |

---

## Risk 3 — Tab Bar Clutter

### The Problem

Adding Shop + Inventory as separate tabs creates 4-5 bottom tabs on a mobile screen, making navigation cramped and confusing. The current app already has Dashboard + Habits + a useless Explore boilerplate.

### The Solution: 3 Tabs with Sub-Screens

```
Current:  Dashboard | Hábitos | Explore (boilerplate, useless)
Future:   Dashboard | Hábitos | Tienda (shop.tsx, replaces explore.tsx)
```

**Inventory and Equipment are NOT separate tabs.** They are sub-screens:
- **Inventory** = a section inside the Shop screen (scrollable grid of owned items below the catalog)
- **Equipment** = accessible from the Inventory section (equip/unequip toggle per item) OR from Dashboard as a modal
- **Explore** (boilerplate) is deleted entirely — its file is repurposed as the Shop screen

#### 1. Tab layout: `_layout.tsx`

```tsx
import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? "light"].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: { position: "absolute" },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="habits"
        options={{
          title: "Hábitos",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="list.bullet" color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="shop"          // ← Renamed from explore.tsx to shop.tsx
        options={{
          title: "Tienda",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="cart.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

#### 2. Shop screen: `app/(tabs)/shop.tsx` (repurposed from explore.tsx)

```tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { useShopStore } from "@/stores/shopStore";
import { usePlayerStore } from "@/stores/playerStore";

export default function ShopScreen() {
  const { catalog, inventory, isPurchasing, isLoading, error,
          fetchCatalog, fetchInventory, purchaseItem } = useShopStore();
  const player = usePlayerStore((s) => s.player);
  const [showInventory, setShowInventory] = useState(false);

  useEffect(() => {
    fetchCatalog();
    fetchInventory();
  }, []);

  const handlePurchase = async (itemId: number) => {
    const ok = await purchaseItem(itemId);
    if (ok) {
      Alert.alert("✅ Compra exitosa", "Ítem agregado a tu inventario");
    } else if (!useShopStore.getState().isPurchasing) {
      // Only show error if we weren't blocked by the guard
      Alert.alert("❌ Error", error || "No se pudo completar la compra");
    }
  };

  if (isLoading && catalog.length === 0) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {/* Header with gold display */}
      <View style={styles.header}>
        <ThemedText type="title">🏪 Tienda</ThemedText>
        <View style={styles.goldBadge}>
          <Text style={styles.goldText}>💰 {player?.gold ?? 0}</Text>
        </View>
      </View>

      {/* Toggle: Catalog / Inventory */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleBtn, !showInventory && styles.toggleActive]}
          onPress={() => setShowInventory(false)}
        >
          <Text style={[styles.toggleText, !showInventory && styles.toggleTextActive]}>
            Catálogo
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, showInventory && styles.toggleActive]}
          onPress={() => { setShowInventory(true); fetchInventory(); }}
        >
          <Text style={[styles.toggleText, showInventory && styles.toggleTextActive]}>
            Mi Inventario 🎒
          </Text>
        </TouchableOpacity>
      </View>

      {showInventory ? (
        /* ── INVENTORY SUB-SCREEN ── */
        <FlatList
          data={inventory}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.inventoryCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemQuantity}>x{item.quantity}</Text>
              <TouchableOpacity
                style={[
                  styles.equipButton,
                  item.isEquipped && styles.equippedButton,
                ]}
                onPress={() => {
                  // shopService.equipItem(item.id);
                  // (implementation detail for equip/unequip)
                }}
              >
                <Text style={styles.equipButtonText}>
                  {item.isEquipped ? "Equipado ✓" : "Equipar"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <ThemedText style={styles.emptyText}>
              Tu inventario está vacío. ¡Compra algo en el catálogo!
            </ThemedText>
          }
        />
      ) : (
        /* ── CATALOG ── */
        <FlatList
          data={catalog}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={styles.catalogRow}
          renderItem={({ item }) => (
            <View style={styles.catalogCard}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemDesc}>{item.description}</Text>
              <Text style={styles.itemPrice}>💰 {item.priceGold}</Text>

              <TouchableOpacity
                style={[
                  styles.buyButton,
                  (isPurchasing || (player?.gold ?? 0) < item.priceGold) &&
                    styles.buyButtonDisabled,
                ]}
                onPress={() => handlePurchase(item.id)}
                disabled={isPurchasing}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.buyButtonText}>Comprar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 60 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  goldBadge: {
    backgroundColor: "#FFF8E1",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#FFD54F",
  },
  goldText: { fontWeight: "bold", fontSize: 16, color: "#5D4037" },
  toggleRow: {
    flexDirection: "row",
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DDD",
  },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center" },
  toggleActive: { backgroundColor: "#4CAF50" },
  toggleText: { fontWeight: "600", color: "#666" },
  toggleTextActive: { color: "#FFF" },
  catalogRow: { justifyContent: "space-between" },
  catalogCard: {
    flex: 1,
    margin: 6,
    padding: 12,
    backgroundColor: "#FFF",
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemName: { fontSize: 16, fontWeight: "bold", marginBottom: 4 },
  itemDesc: { fontSize: 12, color: "#666", textAlign: "center", marginBottom: 8 },
  itemPrice: { fontSize: 14, fontWeight: "600", color: "#5D4037", marginBottom: 8 },
  buyButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  buyButtonDisabled: { backgroundColor: "#A5D6A7", opacity: 0.7 },
  buyButtonText: { color: "#FFF", fontWeight: "bold", fontSize: 14 },
  inventoryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 8,
  },
  itemQuantity: { marginLeft: "auto", marginRight: 12, fontSize: 16, fontWeight: "600" },
  equipButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  equippedButton: { backgroundColor: "#FF9800" },
  equipButtonText: { color: "#FFF", fontWeight: "600", fontSize: 12 },
  emptyText: { textAlign: "center", marginTop: 40, color: "#999", fontSize: 16 },
});
```

#### 3. File rename / creation

The simplest approach: **replace the contents of `explore.tsx`** with the Shop screen, then update `_layout.tsx` to reference it as `shop`. However, Expo Router uses file names for routes, so the file must be named `shop.tsx`:

1. Delete `explore.tsx` (or keep it as backup)
2. Create `shop.tsx` with the Shop screen content
3. Update `_layout.tsx` tab entries

```bash
# In the (tabs) directory:
Remove-Item -LiteralPath "explore.tsx"
New-Item -ItemType File -Path "shop.tsx"
# (then write the shop.tsx content)
```

#### 4. Dashboard simplification in `index.tsx`

Remove the hardcoded "Comprar Poción" button (since the shop is now a full screen):

```tsx
{/* Before: shopButton with buyPotion */}
{/* After: replace with a link/button that navigates to the Shop tab */}
<TouchableOpacity
  style={styles.shopLink}
  onPress={() => {
    // Navigate to shop tab
    // In Expo Router: router.navigate('/(tabs)/shop');
  }}
>
  <Text style={styles.shopLinkText}>🏪 Ir a la Tienda</Text>
</TouchableOpacity>
```

#### 5. Equipment Access Strategy

Equipment (cosmetic items from the shop) is accessible via two paths:
- **From Inventory**: Each inventory item has an **Equip/Unequip** button
- **From Dashboard**: Add an "Equipped Items" section or modal showing currently equipped cosmetics with unequip option

No dedicated tab needed.

#### 6. Files to Create / Modify

| File | Action |
|------|--------|
| `app/(tabs)/_layout.tsx` | **Modify** — 3 tabs: Dashboard, Hábitos, Tienda. Remove explore entry, add shop entry |
| `app/(tabs)/shop.tsx` | **Create** — shop screen (replaces explore.tsx) |
| `app/(tabs)/explore.tsx` | **Delete** (or archive) — boilerplate no longer needed |
| `app/(tabs)/index.tsx` | **Modify** — replace buyPotion button with shop navigation link, add gem display |
| `components/ShopItemCard.tsx` | **Create** — optional extracted component (or keep inline in shop.tsx) |

---

## Summary: All Files Affected

### Backend — New Files (8)
| File | Risk |
|------|------|
| `models/HabitCompletion.java` | R1 |
| `models/StreakTier.java` | R1 |
| `models/ShopItem.java` | R2 |
| `models/PlayerInventory.java` | R2 |
| `models/ItemType.java` | R2 |
| `repositories/HabitCompletionRepository.java` | R1 |
| `repositories/ShopItemRepository.java` | R2 |
| `repositories/PlayerInventoryRepository.java` | R2 |
| `services/StreakService.java` | R1 |
| `services/ShopService.java` | R2 |
| `controllers/StreakController.java` | R1 |
| `controllers/ShopController.java` | R2 |

### Backend — Modified Files (3)
| File | Risk |
|------|------|
| `models/Player.java` — add `@Version` field | R2 |
| `repositories/PlayerRepository.java` — add `findByIdWithLock()` | R2 |
| `services/HabitService.java` — inject StreakService | R1 |

### Frontend — New Files (6)
| File | Risk |
|------|------|
| `components/StreakBadge.tsx` | R1 |
| `stores/shopStore.ts` | R2 |
| `services/api/shop.ts` | R2 |
| `services/api/streaks.ts` | R1 |
| `app/(tabs)/shop.tsx` | R3 |
| `components/ShopItemCard.tsx` | R3 (optional extracted component) |

### Frontend — Modified Files (4)
| File | Risk |
|------|------|
| `components/HabitCard.tsx` — add StreakBadge | R1 |
| `stores/habitStore.ts` — include streak data | R1 |
| `stores/playerStore.ts` — add gems to PlayerStats | R1+R2 |
| `app/(tabs)/_layout.tsx` — 3-tab configuration | R3 |
| `app/(tabs)/index.tsx` — replace buyPotion with shop link | R3 |

### Deleted Files (1)
| File | Risk |
|------|------|
| `app/(tabs)/explore.tsx` — replaced by shop.tsx | R3 |
