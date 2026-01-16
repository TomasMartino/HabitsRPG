package ToDoApp.HabitsRPG.controllers;

import ToDoApp.HabitsRPG.dto.PlayerStatsDTO;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import ToDoApp.HabitsRPG.services.PlayerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/player")
@CrossOrigin(origins = "*")
public class PlayerController {

    private final PlayerRepository playerRepository; // Necesario para LEER datos
    private final PlayerService playerService;       // Necesario para MODIFICAR datos

    public PlayerController(PlayerRepository playerRepository, PlayerService playerService) {
        this.playerRepository = playerRepository;
        this.playerService = playerService;
    }

    // 1. Dashboard (Lectura de datos)
    @GetMapping("/{id}/stats")
    public ResponseEntity<PlayerStatsDTO> getPlayerStats(@PathVariable Long id) {

        // Buscamos al jugador
        Player player = playerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        // 👇 AQUÍ ESTABA EL ERROR: Tenías que rellenar el DTO con los datos 👇
        PlayerStatsDTO statsDTO = new PlayerStatsDTO(
                player.getName(),
                player.getHealth(),
                player.getEnergy(),
                player.getXp(),
                player.getLevel(),
                player.getXpProgress(),
                player.getXpToNextLevel(), // Este es el campo que daba problemas antes
                player.getGold(),
                player.getLives()
        );

        return ResponseEntity.ok(statsDTO);
    }

    // 2. Crear Jugador
    @PostMapping("/create")
    public ResponseEntity<Player> createPlayer(@RequestBody Player player) {
        return new ResponseEntity<>(playerService.createPlayer(player), HttpStatus.CREATED);
    }

    // 3. Ganar XP
    @PostMapping("/{id}/gain-xp")
    public ResponseEntity<Player> gainXp(@PathVariable Long id, @RequestParam int amount) {
        return ResponseEntity.ok(playerService.addExperience(id, amount));
    }

    // 4. Recibir Daño
    @PostMapping("/{id}/damage")
    public ResponseEntity<Player> receiveDamage(@PathVariable Long id, @RequestParam int amount) {
        return ResponseEntity.ok(playerService.takeDamage(id, amount));
    }

    // 5. Curar
    @PostMapping("/{id}/heal")
    public ResponseEntity<Player> heal(@PathVariable Long id, @RequestParam int amount) {
        return ResponseEntity.ok(playerService.heal(id, amount));
    }

    // 6. Energía
    @PostMapping("/{id}/restore-energy")
    public ResponseEntity<Player> restoreEnergy(@PathVariable Long id, @RequestParam int amount) {
        return ResponseEntity.ok(playerService.restoreEnergy(id, amount));
    }

    // 7. Dormir
    @PostMapping("/{playerId}/sleep")
    public ResponseEntity<Player> sleep(@PathVariable Long playerId) {
        return ResponseEntity.ok(playerService.sleep(playerId));
    }

    // 8. Comprar Poción de Vida
    @PostMapping("/{id}/buy-potion")
    public ResponseEntity<?> buyPotion(@PathVariable Long id) {
        try {
            Player updatedPlayer = playerService.buyHealthPotion(id);
            return ResponseEntity.ok(updatedPlayer);
        } catch (RuntimeException e) {
            // Si no tiene dinero o salud llena, devolvemos un error 400 (Bad Request)
            // con el mensaje para mostrarlo en el celular
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}