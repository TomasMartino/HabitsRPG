package ToDoApp.HabitsRPG.models;

import ToDoApp.HabitsRPG.models.Enum.TaskType;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Table(name = "habitsSubTask")
@Entity
public class HabitSubTask {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;       // Ej: "Dominadas", "Lectura"
    private TaskType type;     // TIMER o CHECKLIST

    // Configuración de la meta
    private int targetValue;   // Ej: 4 (series) o 120 (minutos)

    @ManyToOne
    @JoinColumn(name = "habit_id")
    @JsonBackReference // Para evitar bucles infinitos al convertir a JSON
    private Habit habit;

    // --- Timestamps ---
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}