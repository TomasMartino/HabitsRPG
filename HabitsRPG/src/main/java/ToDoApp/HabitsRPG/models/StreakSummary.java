package ToDoApp.HabitsRPG.models;

public record StreakSummary(Long habitId, String habitName,
                            int currentStreak, int longestStreak,
                            double multiplier) {
}
