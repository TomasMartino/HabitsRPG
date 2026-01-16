package ToDoApp.HabitsRPG.controllers;
import ToDoApp.HabitsRPG.models.Habit;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.HabitRepository;
import ToDoApp.HabitsRPG.services.HabitService;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import ToDoApp.HabitsRPG.services.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/habits")
@CrossOrigin(origins = "*")
public class HabitController {

    private final HabitRepository habitRepository;
    private final PlayerRepository playerRepository;
    private final PlayerService playerService; // 1. AGREGAR EL SERVICIO

    // 2. INYECTARLO EN EL CONSTRUCTOR
    public HabitController(HabitRepository habitRepository, PlayerRepository playerRepository, PlayerService playerService) {
        this.habitRepository = habitRepository;
        this.playerRepository = playerRepository;
        this.playerService = playerService;
    }

    @PostMapping("/player/{playerId}")
    public Habit createHabitForPlayer(@PathVariable Long playerId, @RequestBody Habit habit) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        habit.setPlayer(player); // Vinculamos el hábito al jugador
        return habitRepository.save(habit);
    }

    @GetMapping
    public List<Habit> getAllHabits() {
        return habitRepository.findAll();
    }
    
    @GetMapping("/player/{playerId}")
    public List<Habit> getHabitsByPlayer(@PathVariable Long playerId) {
        return habitRepository.findByPlayerIdOrGlobal(playerId);
    }
    @PostMapping("/{habitId}/complete/{playerId}")
    public ResponseEntity<?> completeHabit(@PathVariable Long habitId, @PathVariable Long playerId) {

        // Buscamos entidades
        Habit habit = habitRepository.findById(habitId).orElseThrow(() -> new RuntimeException("Hábito no encontrado"));
        Player player = playerRepository.findById(playerId).orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        if ("POSITIVE".equals(habit.getType())) {
            // --- Lógica Positiva ---
            // Validación de Energía
            if (player.getEnergy() < habit.getEnergyCost()) {
                return ResponseEntity.badRequest().body("No tienes suficiente energía.");
            }

            // Aplicar costos y recompensas
            player.setEnergy(player.getEnergy() - habit.getEnergyCost());
            player.setGold(player.getGold() + habit.getGoldReward());

            // Usar lógica de Nivel (Entidad)
            boolean leveledUp = player.gainXp(habit.getXpReward());

            if (leveledUp) {
                System.out.println("¡LEVEL UP! Nivel actual: " + player.getLevel());
            }

            // Guardamos los cambios positivos manualmente
            playerRepository.save(player);

        } else {
            // --- Lógica Negativa (CORREGIDA) ---

            // 🔴 ANTES (MALO): Resta manual que permitía negativos
            // player.setHealth(player.getHealth() - habit.getHpPenalty());

            // 🟢 AHORA (BUENO): Delegamos al servicio.
            // El servicio se encarga de revisar si muere, si tiene vidas extra, etc.
            player = playerService.takeDamage(playerId, habit.getHpPenalty());

            // Recuperar energía (esto está bien dejarlo aquí o usar restoreEnergy del servicio)
            // Como es una lógica simple de suma, podemos dejarla:
            int nuevaEnergia = Math.min(100, player.getEnergy() + habit.getEnergyCost());
            player.setEnergy(nuevaEnergia);

            playerRepository.save(player);
        }

        return ResponseEntity.ok(player);
    }
}
