package ToDoApp.HabitsRPG.services;

import ToDoApp.HabitsRPG.exceptions.PetNotFoundException;
import ToDoApp.HabitsRPG.models.Enum.PetMood;
import ToDoApp.HabitsRPG.models.HabitCompletion;
import ToDoApp.HabitsRPG.models.Pet;
import ToDoApp.HabitsRPG.models.PlayerPet;
import ToDoApp.HabitsRPG.repositories.HabitCompletionRepository;
import ToDoApp.HabitsRPG.repositories.PetRepository;
import ToDoApp.HabitsRPG.repositories.PlayerPetRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PetService {

    private final PlayerPetRepository playerPetRepository;
    private final PetRepository petRepository;
    private final HabitCompletionRepository habitCompletionRepository;

    public PetService(PlayerPetRepository playerPetRepository,
                      PetRepository petRepository,
                      HabitCompletionRepository habitCompletionRepository) {
        this.playerPetRepository = playerPetRepository;
        this.petRepository = petRepository;
        this.habitCompletionRepository = habitCompletionRepository;
    }

    // ──────────────────────────────────────────────
    // 2.2 — onHabitCompleted
    // ──────────────────────────────────────────────

    @Transactional
    public void onHabitCompleted(Long playerId, String habitType, double streakMultiplier) {
        PlayerPet activePet = playerPetRepository
                .findByPlayerIdAndIsActiveTrue(playerId)
                .orElse(null);
        if (activePet == null) return;

        // Update affection: +2 POSITIVE, -1 NEGATIVE, clamp [0..500]
        int delta = "POSITIVE".equals(habitType) ? 2 : -1;
        int newAffection = Math.max(0, Math.min(500, activePet.getAffection() + delta));
        activePet.setAffection(newAffection);

        // Recalculate mood
        Pet species = petRepository.findById(activePet.getPetId())
                .orElseThrow(() -> new PetNotFoundException("PET_NOT_FOUND",
                        "Pet species not found for id " + activePet.getPetId()));

        PetMood newMood = recalculateMood(activePet, species, streakMultiplier);
        activePet.setCurrentMood(newMood);
        activePet.setLastMoodUpdate(LocalDateTime.now());

        playerPetRepository.save(activePet);
    }

    // ──────────────────────────────────────────────
    // 2.1 — Mood recalculation core
    // ──────────────────────────────────────────────

    public PetMood recalculateMood(PlayerPet playerPet, Pet species, double streakMultiplier) {
        List<HabitCompletion> lastCompletions = habitCompletionRepository
                .findTop10ByPlayerIdOrderByCompletedDateDesc(
                        playerPet.getPlayerId(), PageRequest.of(0, 10));

        int positiveCount = 0;
        int negativeCount = 0;
        for (HabitCompletion hc : lastCompletions) {
            if ("POSITIVE".equals(hc.getHabit().getType())) {
                positiveCount++;
            } else if ("NEGATIVE".equals(hc.getHabit().getType())) {
                negativeCount++;
            }
        }

        PetMood mood;

        // Check anger FIRST (highest priority negative)
        if (negativeCount >= species.getAngerThreshold()) {
            mood = PetMood.ANGRY;
        }
        // Then sadness
        else if (negativeCount >= species.getSadnessThreshold()) {
            mood = PetMood.SAD;
        }
        // Happiness: positive ratio (amplified by streak multiplier)
        // must beat decay-adjusted threshold
        else {
            double effectivePositive = positiveCount * Math.max(streakMultiplier, 1.0);
            if (negativeCount == 0
                    || effectivePositive > negativeCount * (2 + species.getHappinessDecay())) {
                mood = PetMood.HAPPY;
            }
            // Content: more or equal positive than negative
            else if (positiveCount >= negativeCount) {
                mood = PetMood.CONTENT;
            }
            // Default
            else {
                mood = PetMood.NEUTRAL;
            }
        }

        // Affection ≥ 300 → boost mood one level
        if (playerPet.getAffection() >= 300) {
            mood = boostMood(mood);
        }

        // If no completions at all, start neutral
        if (lastCompletions.isEmpty()) {
            mood = PetMood.NEUTRAL;
        }

        return mood;
    }

    private PetMood boostMood(PetMood mood) {
        return switch (mood) {
            case DEPRESSED -> PetMood.SAD;
            case ANGRY     -> PetMood.NEUTRAL;
            case SAD       -> PetMood.NEUTRAL;
            case NEUTRAL   -> PetMood.CONTENT;
            case CONTENT   -> PetMood.HAPPY;
            case HAPPY     -> PetMood.HAPPY;
        };
    }

    // ──────────────────────────────────────────────
    // 2.3 — applyMoodDecay
    // ──────────────────────────────────────────────

    @Transactional
    public void applyMoodDecay() {
        List<PlayerPet> activePets = playerPetRepository.findByIsActiveTrue();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sixHoursAgo = now.minusHours(6);
        LocalDateTime twentyFourHoursAgo = now.minusHours(24);

        for (PlayerPet pp : activePets) {
            LocalDateTime lastUpdate = pp.getLastMoodUpdate();

            // Mood degradation: only if last update > 6h ago
            if (lastUpdate == null || lastUpdate.isBefore(sixHoursAgo)) {
                pp.setCurrentMood(degradeMood(pp.getCurrentMood()));
                pp.setLastMoodUpdate(now);
            }

            // Affection decay: -1 if no completions in last 24h, min 0
            long recentCompletions = habitCompletionRepository
                    .countCompletionsSince(pp.getPlayerId(), twentyFourHoursAgo);
            if (recentCompletions == 0) {
                pp.setAffection(Math.max(0, pp.getAffection() - 1));
            }
        }

        playerPetRepository.saveAll(activePets);
    }

    private PetMood degradeMood(PetMood mood) {
        return switch (mood) {
            case HAPPY     -> PetMood.CONTENT;
            case CONTENT   -> PetMood.NEUTRAL;
            case NEUTRAL   -> PetMood.SAD;
            case SAD       -> PetMood.ANGRY;
            case ANGRY     -> PetMood.DEPRESSED;
            case DEPRESSED -> PetMood.DEPRESSED; // floor
        };
    }

    // ──────────────────────────────────────────────
    // Query methods
    // ──────────────────────────────────────────────

    public PlayerPet getActivePet(Long playerId) {
        return playerPetRepository
                .findByPlayerIdAndIsActiveTrue(playerId)
                .orElse(null);
    }

    public List<Pet> getAvailablePets(Long playerId) {
        return petRepository.findAll();
    }

    // ──────────────────────────────────────────────
    // 2.4 — selectPet
    // ──────────────────────────────────────────────

    @Transactional
    public PlayerPet selectPet(Long playerId, Long petId) {
        // Deactivate current active pet
        playerPetRepository.findByPlayerIdAndIsActiveTrue(playerId)
                .ifPresent(active -> {
                    active.setActive(false);
                    playerPetRepository.save(active);
                });

        // Find or create PlayerPet for this player+pet combo
        PlayerPet playerPet = playerPetRepository
                .findByPlayerIdAndPetId(playerId, petId)
                .orElseGet(() -> {
                    PlayerPet newPet = new PlayerPet();
                    newPet.setPlayerId(playerId);
                    newPet.setPetId(petId);
                    newPet.setCurrentMood(PetMood.NEUTRAL);
                    newPet.setAffection(0);
                    newPet.setActive(false);
                    return newPet;
                });

        playerPet.setActive(true);
        playerPet.setLastMoodUpdate(LocalDateTime.now());

        // Recalculate mood for the newly activated pet (no current streak context → 1.0)
        Pet species = petRepository.findById(petId)
                .orElseThrow(() -> new PetNotFoundException("PET_NOT_FOUND",
                        "Pet species not found for id " + petId));
        PetMood mood = recalculateMood(playerPet, species, 1.0);
        playerPet.setCurrentMood(mood);

        return playerPetRepository.save(playerPet);
    }
}
