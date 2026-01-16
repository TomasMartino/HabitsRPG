package ToDoApp.HabitsRPG.models;

import com.fasterxml.jackson.annotation.JsonIgnore;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "habits")
@Data
public class Habit {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String type;
    private int xpReward;
    private int hpPenalty;
    private int goldReward;
    
    private int energyCost;  

    // RELACIÓN: Muchos hábitos pertenecen a un jugador
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id")
    @JsonIgnore // Para evitar bucles infinitos al convertir a JSON
    private Player player;
}
