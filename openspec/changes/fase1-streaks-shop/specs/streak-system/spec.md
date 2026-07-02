# Streak System Specification

## Purpose

Track consecutive daily habit completions per player per habit. Streaks are calculated lazily on read (no scheduler). A streak multiplier tiers XP and gold rewards based on streak length, reinforcing engagement through compounding progression.

## Requirements

### Requirement: Record Habit Completion

The system SHALL record each habit completion as a row in `habit_completions` with `completed_date` as a `LocalDate` in UTC.

#### Scenario: First completion of the day

- GIVEN a player has not completed habit H today (UTC)
- WHEN POST /habits/{habitId}/complete/{playerId} is called
- THEN a `habit_completions` row is inserted with `completed_date = today(UTC)`
- AND the player receives XP and gold multiplied by the current streak multiplier

#### Scenario: Duplicate completion on same UTC day

- GIVEN a player already completed habit H today (UTC)
- WHEN POST /habits/{habitId}/complete/{playerId} is called again
- THEN the request returns HTTP 409 (Conflict)
- AND no duplicate row is inserted (UNIQUE constraint on `(habit_id, player_id, completed_date)`)

#### Scenario: Completion across UTC midnight

- GIVEN a player in UTC+12 completes habit H at 11 PM local (11 AM UTC, day D)
- WHEN the player completes habit H again at 1 AM local (1 PM UTC, same calendar day D)
- THEN both completions map to the same UTC date D
- AND the second request returns HTTP 409

### Requirement: Calculate Current Streak

The system SHALL calculate the current streak lazily on read by counting consecutive calendar days (UTC) backward from today or yesterday.

#### Scenario: Streak alive — completed today

- GIVEN a player completed habit H on days [Jul 1, Jul 2, Jul 3] (today = Jul 3 UTC)
- WHEN GET /habits/{habitId}/streak?playerId={id} is called
- THEN response contains `currentStreak: 3`

#### Scenario: Streak alive — completed yesterday, not yet today

- GIVEN a player completed habit H on days [Jul 1, Jul 2] (today = Jul 3 UTC, no completion today)
- WHEN GET /habits/{habitId}/streak?playerId={id} is called
- THEN response contains `currentStreak: 2` (streak is still alive)

#### Scenario: Streak broken — gap of 2+ days

- GIVEN a player completed habit H on days [Jun 28, Jun 29, Jul 2] (today = Jul 3 UTC)
- WHEN GET /habits/{habitId}/streak?playerId={id} is called
- THEN response contains `currentStreak: 1` (only Jul 2 counts; Jun 29→Jul 2 is a gap)

#### Scenario: No completions ever

- GIVEN a player has never completed habit H
- WHEN GET /habits/{habitId}/streak?playerId={id} is called
- THEN response contains `currentStreak: 0`

### Requirement: Calculate Longest Streak

The system SHALL track the longest historical streak per habit per player.

#### Scenario: Longest streak returned

- GIVEN a player's completion history for habit H includes a 14-day consecutive run and a current streak of 3
- WHEN GET /habits/{habitId}/streak?playerId={id} is called
- THEN response contains `longestStreak: 14`

### Requirement: Streak Multiplier Tiers

The system SHALL apply an XP and gold multiplier based on the current streak value using these tiers:

| Streak (days) | Multiplier |
|---------------|------------|
| 0–6           | 1.0x       |
| 7–13          | 1.5x       |
| 14–29         | 1.75x      |
| 30–59         | 2.0x       |
| 60–89         | 2.5x       |
| 90+           | 3.0x       |

#### Scenario: Multiplier applied on completion

- GIVEN a player has a 10-day streak on habit H (base XP: 20, base gold: 10)
- WHEN the player completes habit H
- THEN XP earned = 20 × 1.5 = 30
- AND gold earned = 10 × 1.5 = 15

#### Scenario: Multiplier resets on streak break

- GIVEN a player had a 15-day streak (1.75x) but missed 2 days
- WHEN the player completes habit H again
- THEN streak resets to 1
- AND multiplier is 1.0x

### Requirement: Streak Summary for Player

The system SHALL provide a summary of all habit streaks for a player.

#### Scenario: Dashboard streak data

- GIVEN a player has 3 habits with streaks of 5, 12, and 0 days
- WHEN GET /player/{id}/streaks is called
- THEN response contains an array of streak summaries with `habitId`, `currentStreak`, `longestStreak`, and `multiplier` for each habit

### Requirement: Frontend Streak Display

The system SHALL display streak information in the UI using a `StreakBadge` component.

#### Scenario: Streak badge rendering

- GIVEN a habit has a current streak of 10 days
- WHEN the HabitCard renders
- THEN a badge displays "🔥 10d" with a silver color (tier: 7–13 days)

#### Scenario: Zero streak hides badge

- GIVEN a habit has a current streak of 0 days
- WHEN the HabitCard renders
- THEN no streak badge is shown

#### Scenario: Dashboard streak summary

- GIVEN a player has habits with active streaks
- WHEN the Dashboard loads
- THEN a "Streaks" section shows the top streaks with day counts and multiplier indicators

## Data Contracts

### POST /habits/{habitId}/complete/{playerId}

**Response 200:**
```json
{
  "success": true,
  "xpEarned": 30,
  "goldEarned": 15,
  "streakMultiplier": 1.5,
  "currentStreak": 10
}
```

**Response 409:**
```json
{
  "error": "ALREADY_COMPLETED_TODAY",
  "message": "Habit already completed today"
}
```

### GET /habits/{habitId}/streak?playerId={id}

**Response 200:**
```json
{
  "habitId": 42,
  "playerId": 1,
  "currentStreak": 10,
  "longestStreak": 14,
  "multiplier": 1.5,
  "lastCompletedDate": "2026-07-01"
}
```

### GET /player/{id}/streaks

**Response 200:**
```json
{
  "streaks": [
    { "habitId": 42, "habitName": "Meditar", "currentStreak": 10, "longestStreak": 14, "multiplier": 1.5 },
    { "habitId": 43, "habitName": "Leer", "currentStreak": 3, "longestStreak": 7, "multiplier": 1.0 },
    { "habitId": 44, "habitName": "Gym", "currentStreak": 0, "longestStreak": 21, "multiplier": 1.0 }
  ]
}
```

## Validation Rules

- `completed_date` MUST be in UTC (server-side using `LocalDate.now(ZoneOffset.UTC)`)
- UNIQUE constraint: one completion per `(habit_id, player_id, completed_date)`
- Streak calculation MUST use UTC dates exclusively
- No scheduler — streaks are lazy-evaluated on read

## Error States

| Error | HTTP | Condition |
|-------|------|-----------|
| `ALREADY_COMPLETED_TODAY` | 409 | Duplicate completion on same UTC day |
| `HABIT_NOT_FOUND` | 404 | Invalid habitId |
| `PLAYER_NOT_FOUND` | 404 | Invalid playerId |

## Files Affected

| File | Action |
|------|--------|
| `models/HabitCompletion.java` | Create |
| `models/StreakTier.java` | Create |
| `repositories/HabitCompletionRepository.java` | Create |
| `services/StreakService.java` | Create |
| `controllers/StreakController.java` | Create |
| `services/HabitService.java` | Modify — inject StreakService |
| Frontend: `components/StreakBadge.tsx` | Create |
| Frontend: `services/api/streaks.ts` | Create |
| Frontend: `stores/habitStore.ts` | Modify — include streak data |
