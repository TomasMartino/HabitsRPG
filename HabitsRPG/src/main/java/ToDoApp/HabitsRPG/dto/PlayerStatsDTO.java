package ToDoApp.HabitsRPG.dto; // Ojo con el nombre del paquete (dto vs dtos)

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor // Genera el constructor con todos los argumentos
@NoArgsConstructor  // Genera el constructor vacío
public class PlayerStatsDTO {
    private String name;
    private int health;
    private int energy;
    private int xp;
    private int level;
    private int xpProgress;
    private int xpToNextLevel; // Campo clave
    private int gold;
    private int lives;
}