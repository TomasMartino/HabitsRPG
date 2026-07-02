package ToDoApp.HabitsRPG.models;

public record CompletableResult(Player player, int currentStreak,
                                int longestStreak, double multiplier,
                                int xpEarned, int goldEarned, boolean leveledUp) {
}
