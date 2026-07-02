package ToDoApp.HabitsRPG.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "habit_completions",
       uniqueConstraints = @UniqueConstraint(columnNames = {"habit_id", "player_id", "completed_date"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HabitCompletion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id", nullable = false)
    private Habit habit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    @JsonIgnore
    private Player player;

    @Column(name = "completed_date", nullable = false)
    private LocalDate completedDate;

    @Column(name = "xp_earned")
    private int xpEarned;

    @Column(name = "gold_earned")
    private int goldEarned;

    @Column(name = "streak_multiplier")
    private double streakMultiplier = 1.0;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
