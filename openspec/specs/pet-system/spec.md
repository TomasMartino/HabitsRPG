# Pet System Specification

## Purpose

The pet system provides emotional companions that react to player discipline or neglect. Each pet has a mood derived from recent habit completions and an affection score that decays over time, creating an emotional feedback loop that drives retention.

## Requirements

### Requirement: Pet Type Definitions

The system SHALL maintain a catalog of pet types, each defining species name, mood weight multipliers (positive/negative), icon reference, and gold cost.

#### Scenario: Pet catalog contains valid entries

- GIVEN a seeded pet catalog
- WHEN a player queries available pets
- THEN each pet SHALL have species, positiveWeight, negativeWeight, icon, and cost fields

### Requirement: PlayerPet Entity

The system SHALL maintain a join entity linking a player to an owned pet, tracking mood (enum), affection (0–500), and active status. A player SHALL own at most one active pet.

#### Scenario: Player activates a pet

- GIVEN player owns pet A (active) and pet B (inactive)
- WHEN player activates pet B
- THEN pet B becomes active, pet A inactive, mood recalculates for pet B

#### Scenario: Player has no active pet

- GIVEN player owns no pets
- WHEN player views dashboard
- THEN mood indicator shows "No pet" or is hidden

### Requirement: Mood Calculation Engine

The system SHALL calculate pet mood from the last 10 completions using per-species weight multipliers and streak multiplier. Mood states: HAPPY, CONTENT, NEUTRAL, SAD, ANGRY, DEPRESSED.

#### Scenario: All recent completions are positive

- GIVEN 10 POSITIVE completions with streak multiplier 2x
- WHEN mood recalculates
- THEN mood SHALL be HAPPY or CONTENT based on species positiveWeight

#### Scenario: Mixed completions with streak bonus

- GIVEN 6 POSITIVE and 4 NEGATIVE completions with streak multiplier 1.5x
- WHEN mood recalculates
- THEN streak multiplier SHALL amplify positive weight contribution

#### Scenario: Fewer than 10 completions

- GIVEN player has only 3 completions
- WHEN mood recalculates
- THEN mood SHALL use only available completions

### Requirement: Affection System

The system SHALL track affection as integer 0–500. POSITIVE: +2. NEGATIVE: -1. Daily decay: -1/day, minimum 0.

#### Scenario: Positive completion increases affection

- GIVEN pet has affection 100
- WHEN POSITIVE habit completed
- THEN affection increases to 102

#### Scenario: Negative completion decreases affection

- GIVEN pet has affection 100
- WHEN NEGATIVE habit completed
- THEN affection decreases to 99

#### Scenario: Daily decay floor

- GIVEN pet has affection 0
- WHEN daily decay runs
- THEN affection remains 0

#### Scenario: Affection cap

- GIVEN pet has affection 499
- WHEN +2 would be added
- THEN affection caps at 500

### Requirement: Pet Purchase Flow

Purchase pets via shop using gold. Successful purchase creates PlayerPet with mood NEUTRAL and affection 100.

#### Scenario: Successful purchase

- GIVEN 500 gold, player does not own "Dragon"
- WHEN purchasing "Dragon" (cost: 200)
- THEN gold decreases by 200, PlayerPet created

#### Scenario: Already owned

- GIVEN player owns "Dragon"
- WHEN attempting to purchase "Dragon"
- THEN purchase rejected with appropriate message

#### Scenario: Insufficient gold

- GIVEN 50 gold
- WHEN purchasing "Dragon" (cost: 200)
- THEN purchase rejected

### Requirement: Active Pet Selection

Toggle which owned pet is active. Only one active at a time. Changing active triggers mood recalculation.

#### Scenario: Switch active pet

- GIVEN pet A active, pet B inactive
- WHEN selecting pet B
- THEN pet B mood recalculates, dashboard reflects pet B
