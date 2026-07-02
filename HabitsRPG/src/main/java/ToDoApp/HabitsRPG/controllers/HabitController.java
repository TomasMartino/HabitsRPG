package ToDoApp.HabitsRPG.controllers;

import ToDoApp.HabitsRPG.exceptions.DuplicateCompletionException;
import ToDoApp.HabitsRPG.models.CompletableResult;
import ToDoApp.HabitsRPG.models.Habit;
import ToDoApp.HabitsRPG.models.HabitSubTask;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.HabitRepository;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import ToDoApp.HabitsRPG.services.HabitService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/habits")
@CrossOrigin(origins = "*")
public class HabitController {

    private final HabitRepository habitRepository;
    private final PlayerRepository playerRepository;
    private final HabitService habitService;

    public HabitController(HabitRepository habitRepository, PlayerRepository playerRepository,
            HabitService habitService) {
        this.habitRepository = habitRepository;
        this.playerRepository = playerRepository;
        this.habitService = habitService;
    }

    // 🆕 MÉTODO ACTUALIZADO: Crea hábito Y sus etiquetas
    @PostMapping("/player/{playerId}")
    public ResponseEntity<?> createHabitForPlayer(@PathVariable Long playerId, @RequestBody Habit habit) {
        try {
            Player player = playerRepository.findById(playerId)
                    .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

            habit.setPlayer(player); // 1. Vinculamos al Jugador

            // 2. VINCULACIÓN DE SUBTAREAS (La parte nueva)
            // Recorremos las etiquetas que vienen del Frontend y les asignamos este Hábito
            // como padre.
            if (habit.getSubTasks() != null) {
                for (HabitSubTask subTask : habit.getSubTasks()) {
                    subTask.setHabit(habit);
                }
            }

            Habit savedHabit = habitRepository.save(habit);
            return ResponseEntity.ok(savedHabit);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error al crear el hábito: " + e.getMessage());
        }
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
        try {
            CompletableResult result = habitService.completeHabit(habitId, playerId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "player", result.player(),
                    "xpEarned", result.xpEarned(),
                    "goldEarned", result.goldEarned(),
                    "currentStreak", result.currentStreak(),
                    "longestStreak", result.longestStreak(),
                    "streakMultiplier", result.multiplier(),
                    "leveledUp", result.leveledUp()
            ));
        } catch (DuplicateCompletionException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("error", "ALREADY_COMPLETED_TODAY",
                            "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body("Error: " + e.getMessage());
        }
    }
}