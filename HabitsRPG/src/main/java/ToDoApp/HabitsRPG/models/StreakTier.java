package ToDoApp.HabitsRPG.models;

import java.util.List;

public record StreakTier(int days, double multiplier) {
    private static final List<StreakTier> TIERS = List.of(
        new StreakTier(7, 1.5),
        new StreakTier(14, 1.75),
        new StreakTier(30, 2.0),
        new StreakTier(60, 2.5),
        new StreakTier(90, 3.0)
    );

    public static double getMultiplier(int streak) {
        double mult = 1.0;
        for (StreakTier t : TIERS) {
            if (streak >= t.days) mult = Math.max(mult, t.multiplier);
        }
        return mult;
    }
}
