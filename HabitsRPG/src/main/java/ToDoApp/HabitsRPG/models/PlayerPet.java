package ToDoApp.HabitsRPG.models;

import ToDoApp.HabitsRPG.models.Enum.PetMood;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "player_pets",
       uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "pet_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerPet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_id", nullable = false)
    private Long playerId;

    @Column(name = "pet_id", nullable = false)
    private Long petId;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_mood")
    private PetMood currentMood = PetMood.NEUTRAL;

    private int affection = 0;

    @Column(name = "is_active")
    private boolean isActive = false;

    @Column(name = "last_mood_update")
    private LocalDateTime lastMoodUpdate;
}
