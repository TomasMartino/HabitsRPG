package ToDoApp.HabitsRPG.controllers;

import ToDoApp.HabitsRPG.models.StreakData;
import ToDoApp.HabitsRPG.services.StreakService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/streaks")
@CrossOrigin(origins = "*")
public class StreakController {

    private final StreakService streakService;

    public StreakController(StreakService streakService) {
        this.streakService = streakService;
    }

    @GetMapping("/habit/{habitId}")
    public ResponseEntity<?> getStreakByHabit(
            @PathVariable Long habitId,
            @RequestParam Long playerId) {
        try {
            StreakData data = streakService.getStreakData(habitId, playerId);
            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/player/{playerId}")
    public ResponseEntity<?> getAllStreaks(@PathVariable Long playerId) {
        try {
            var streaks = streakService.getAllStreaksForPlayer(playerId);
            return ResponseEntity.ok(Map.of("streaks", streaks));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
