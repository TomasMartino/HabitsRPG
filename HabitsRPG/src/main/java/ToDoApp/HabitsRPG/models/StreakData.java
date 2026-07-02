package ToDoApp.HabitsRPG.models;

import java.time.LocalDate;

public record StreakData(Long habitId, int currentStreak, int longestStreak,
                         double multiplier, LocalDate lastCompletedDate) {
}
