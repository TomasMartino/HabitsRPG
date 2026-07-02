package ToDoApp.HabitsRPG.models;

import ToDoApp.HabitsRPG.dto.ActivePetDTO;

public record CompletableResult(Player player, int currentStreak,
                                int longestStreak, double multiplier,
                                int xpEarned, int goldEarned, boolean leveledUp,
                                ActivePetDTO activePet) {
}
