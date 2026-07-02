# Delta for Streak System

> Modifies: `openspec/changes/fase1-streaks-shop/specs/streak-system/spec.md`

## MODIFIED Requirements

### Requirement: Record Habit Completion

The system SHALL record each habit completion as a row in `habit_completions` with `completed_date` as a `LocalDate` in UTC. After recording, the system SHALL trigger `PetService.updateMood()` if the player has an active pet, passing the completion type and current streak data.

(Previously: Only recorded completion and awarded XP/gold — no pet mood trigger)

#### Scenario: First completion of the day

- GIVEN a player has not completed habit H today (UTC)
- WHEN POST /habits/{habitId}/complete/{playerId} is called
- THEN a `habit_completions` row is inserted with `completed_date = today(UTC)`
- AND the player receives XP and gold multiplied by the current streak multiplier
- AND if the player has an active pet, PetService.updateMood() is called with completion type and streak data

#### Scenario: Duplicate completion on same UTC day

- GIVEN a player already completed habit H today (UTC)
- WHEN POST /habits/{habitId}/complete/{playerId} is called again
- THEN the request returns HTTP 409 (Conflict)
- AND no duplicate row is inserted
- AND PetService.updateMood() is NOT called

#### Scenario: Completion across UTC midnight

- GIVEN a player in UTC+12 completes habit H at 11 PM local (11 AM UTC, day D)
- WHEN the player completes habit H again at 1 AM local (1 PM UTC, same calendar day D)
- THEN both completions map to the same UTC date D
- AND the second request returns HTTP 409

## ADDED Requirements

### Requirement: Streak Multiplier in Mood Calculation

The system SHALL pass the player's current streak multiplier to `PetService.updateMood()`. The mood calculation engine SHALL apply this multiplier as a bonus factor to the positive weight contribution, making it easier to maintain good pet mood during consistent play.

#### Scenario: High streak boosts mood

- GIVEN a player has a streak multiplier of 3x and 7 POSITIVE completions out of 10
- WHEN mood recalculates
- THEN the positive weight contribution SHALL be multiplied by 3 before comparing against mood thresholds

#### Scenario: Zero streak has no multiplier effect

- GIVEN a player has a streak multiplier of 1x
- WHEN mood recalculates
- THEN weights SHALL be applied without additional multiplier (1x = baseline)

### Requirement: Affection Bonuses on Streak Milestones

The system SHALL award bonus affection when a player reaches streak milestones (7, 14, 30, 60, 90 days). The bonus SHALL be +5 for 7-day, +10 for 14-day, +20 for 30-day, +30 for 60-day, and +50 for 90-day milestones. Each milestone SHALL award only once per streak cycle.

#### Scenario: 7-day streak milestone bonus

- GIVEN a player has an active pet with affection 100 and streak at 6 days
- WHEN the player completes a habit reaching streak day 7
- THEN affection SHALL increase by +5 (to 105) and mood SHALL recalculate

#### Scenario: Milestone awards once per cycle

- GIVEN a player already received the 7-day milestone bonus in the current streak
- WHEN the player maintains or resets and rebuilds the streak
- THEN the 7-day bonus SHALL NOT be awarded again until the streak resets and reaches 7 again

#### Scenario: Multiple milestones in rapid succession

- GIVEN a player's streak jumps from 6 to 14 due to backdated completions
- WHEN mood recalculates
- THEN both 7-day (+5) and 14-day (+10) bonuses SHALL be awarded if not previously claimed
