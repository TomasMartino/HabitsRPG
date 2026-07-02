package ToDoApp.HabitsRPG.models;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Entity
@Table(name = "players")
@Data
public class Player {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private int health = 100;
    private int energy = 100;
    private int gold = 0;
    private int lives = 3;

    private int gems = 0;

    @Version
    private Integer version;

    // --- CAMBIOS IMPORTANTES PARA EL LEVEL UP ---

    // 1. Ahora el nivel se guarda en la DB, no se calcula al vuelo
    private int level = 1;

    // 2. XP actual acumulada para el SIGUIENTE nivel (se resetea al subir)
    private int xp = 0;

    // 3. Cuánta XP necesito para pasar de nivel (aumentará con la dificultad)
    @Column(name = "xp_to_next_level")
    @JsonProperty("xpToNextLevel")
    private int xpToNextLevel = 100;

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

    /**
     * Lógica inteligente para ganar experiencia.
     * Retorna true si el jugador subió de nivel (para avisar al frontend).
     */
    // En Player.java
    public boolean gainXp(int amount) {
        this.xp += amount;
        boolean leveledUp = false;

        while (this.xp >= this.xpToNextLevel) { // <--- Entra aquí
            this.xp -= this.xpToNextLevel;
            this.level++;

            // 👇👇 ¿ESTA LÍNEA EXISTE EN TU CÓDIGO? 👇👇
            this.xpToNextLevel = (int) (this.xpToNextLevel * 1.2);

            this.health = 100;
            this.energy = 100;
            leveledUp = true;
        }
        return leveledUp;
    }

    /**
     * Calcula el porcentaje (0 a 100) para la barra de progreso en el celular.
     * Ahora es dinámico basado en la dificultad actual.
     */
    public int getXpProgress() {
        if (xpToNextLevel == 0) return 0; // Evitar división por cero
        return (int) ((double) xp / xpToNextLevel * 100);
    }
}