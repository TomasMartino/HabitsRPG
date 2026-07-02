package ToDoApp.HabitsRPG.services;

import ToDoApp.HabitsRPG.exceptions.DuplicateCompletionException;
import ToDoApp.HabitsRPG.models.*;
import ToDoApp.HabitsRPG.repositories.HabitCompletionRepository;
import ToDoApp.HabitsRPG.repositories.HabitRepository;
import ToDoApp.HabitsRPG.repositories.HabitStreakRepository;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;

@Service
public class StreakService {

    private final HabitCompletionRepository completionRepository;
    private final HabitStreakRepository streakRepository;
    private final HabitRepository habitRepository;
    private final PlayerRepository playerRepository;

    public StreakService(HabitCompletionRepository completionRepository,
                         HabitStreakRepository streakRepository,
                         HabitRepository habitRepository,
                         PlayerRepository playerRepository) {
        this.completionRepository = completionRepository;
        this.streakRepository = streakRepository;
        this.habitRepository = habitRepository;
        this.playerRepository = playerRepository;
    }

    @Transactional
    public StreakResult recordCompletion(Long habitId, Long playerId) {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);

        // 1. Idempotency check
        if (completionRepository
                .findByHabitIdAndPlayerIdAndCompletedDate(habitId, playerId, today)
                .isPresent()) {
            throw new DuplicateCompletionException("Habit already completed today");
        }

        // 2. Load Habit and Player for reward calculation and references
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new RuntimeException("Hábito no encontrado"));

        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        // 3. Get or create streak
        HabitStreak streak = streakRepository
                .findByHabitIdAndPlayerId(habitId, playerId)
                .orElseGet(() -> {
                    HabitStreak newStreak = new HabitStreak();
                    newStreak.setHabit(habit);
                    newStreak.setPlayer(player);
                    return newStreak;
                });

        // 4. Streak calculation logic
        int newStreakCount;
        if (streak.getLastCompletedDate() == null) {
            newStreakCount = 1;
        } else if (streak.getLastCompletedDate().equals(today.minusDays(1))) {
            newStreakCount = streak.getCurrentStreak() + 1;
        } else if (streak.getLastCompletedDate().equals(today)) {
            // This case is already guarded by the idempotency check above
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
        completion.setPlayer(player);
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
