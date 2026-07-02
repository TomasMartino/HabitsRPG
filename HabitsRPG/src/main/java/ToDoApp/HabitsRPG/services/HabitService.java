package ToDoApp.HabitsRPG.services;

import ToDoApp.HabitsRPG.dto.ActivePetDTO;
import ToDoApp.HabitsRPG.models.CompletableResult;
import ToDoApp.HabitsRPG.models.Habit;
import ToDoApp.HabitsRPG.models.Pet;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.models.PlayerPet;
import ToDoApp.HabitsRPG.models.StreakResult;
import ToDoApp.HabitsRPG.repositories.HabitRepository;
import ToDoApp.HabitsRPG.repositories.PetRepository;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import org.springframework.stereotype.Service;

@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final PlayerService playerService;
    private final PlayerRepository playerRepository;
    private final StreakService streakService;
    private final PetService petService;
    private final PetRepository petRepository;

    public HabitService(HabitRepository habitRepository, PlayerService playerService,
                        PlayerRepository playerRepository, StreakService streakService,
                        PetService petService, PetRepository petRepository) {
        this.habitRepository = habitRepository;
        this.playerService = playerService;
        this.playerRepository = playerRepository;
        this.streakService = streakService;
        this.petService = petService;
        this.petRepository = petRepository;
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
            boolean leveledUp = false;
            if (player.getEnergy() >= cost) {
                player.setEnergy(player.getEnergy() - cost);
            } else {
                player.setEnergy(0);
                xpEarned /= 2;
                goldEarned /= 2;
            }

            player.setGold(player.getGold() + goldEarned);
            leveledUp = player.gainXp(xpEarned);
            playerRepository.save(player);

            // 3. Pet integration — call onHabitCompleted (wrap in try-catch, non-blocking)
            try {
                petService.onHabitCompleted(playerId, "POSITIVE", streak.multiplier());
            } catch (Exception e) {
                System.err.println("Pet system error (POSITIVE): " + e.getMessage());
            }

            ActivePetDTO petDto = buildActivePetDTO(playerId);

            return new CompletableResult(player, streak.currentStreak(),
                    streak.longestStreak(), streak.multiplier(),
                    xpEarned, goldEarned, leveledUp, petDto);
        } else {
            // NEGATIVE: no streak tracking for negative habits
            Player player = playerService.takeDamage(playerId, habit.getHpPenalty());
            int nuevaEnergia = Math.min(100, player.getEnergy() + habit.getEnergyCost());
            player.setEnergy(nuevaEnergia);
            playerRepository.save(player);

            // Pet integration — negative habits affect mood too
            try {
                petService.onHabitCompleted(playerId, "NEGATIVE", 1.0);
            } catch (Exception e) {
                System.err.println("Pet system error (NEGATIVE): " + e.getMessage());
            }

            ActivePetDTO petDto = buildActivePetDTO(playerId);

            return new CompletableResult(player, 0, 0, 1.0, 0, 0, false, petDto);
        }
    }

    private ActivePetDTO buildActivePetDTO(Long playerId) {
        try {
            PlayerPet active = petService.getActivePet(playerId);
            if (active == null) return null;

            Pet species = petRepository.findById(active.getPetId()).orElse(null);
            return new ActivePetDTO(
                    active.getPetId(),
                    species != null ? species.getName() : null,
                    active.getCurrentMood(),
                    active.getAffection(),
                    species != null ? species.getImageUrl() : null
            );
        } catch (Exception e) {
            return null;
        }
    }
}
