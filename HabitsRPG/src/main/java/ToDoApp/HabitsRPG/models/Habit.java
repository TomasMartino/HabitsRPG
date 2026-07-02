package ToDoApp.HabitsRPG.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonManagedReference;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "habits")
@Data
public class Habit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Información básica
    private String title; // El nombre visible del hábito (Ej: "Entrenar")
    private String description; // (Opcional) Detalles extra
    private String type; // POSITIVE o NEGATIVE

    // Stats RPG (Recompensas y Costos)
    private int xpReward;
    private int goldReward;
    private int hpPenalty;
    private int energyCost;

    // 🔗 RELACIÓN PADRE (1 Hábito -> Muchas Subtareas)
    // mappedBy = "habit": Apunta al campo 'habit' en la clase HabitSubTask
    // cascade = ALL: Si borras el hábito, se borran sus etiquetas
    @OneToMany(mappedBy = "habit", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference // Permite que el JSON muestre las subtareas al pedir el hábito
    private List<HabitSubTask> subTasks = new ArrayList<>();

    // 🔗 RELACIÓN HIJO (Muchos Hábitos -> 1 Jugador)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    @JsonIgnore // Evita que al pedir un hábito, te traiga todo el jugador entero
    private Player player;

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