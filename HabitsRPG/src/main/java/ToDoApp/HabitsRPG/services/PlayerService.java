package ToDoApp.HabitsRPG.services;

import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import org.springframework.stereotype.Service;

@Service
public class PlayerService {

    private final PlayerRepository playerRepository;
    private final ShopService shopService;

    public PlayerService(PlayerRepository playerRepository, ShopService shopService) {
        this.playerRepository = playerRepository;
        this.shopService = shopService;
    }

    public Player createPlayer(Player player) {
        if (player.getXpToNextLevel() == 0) {
            player.setXpToNextLevel(100);
        }
        return playerRepository.save(player);
    }

    public Player addExperience(Long playerId, int amount) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        // Usamos la lógica de la entidad para que se activen los niveles
        boolean leveledUp = player.gainXp(amount);

        if (leveledUp) {
            System.out.println("¡El servicio detectó un Level Up!");
        }

        return playerRepository.save(player);
    }
    public Player takeDamage(Long playerId, int damage) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        int newHealth = player.getHealth() - damage;

        // Si la vida baja de 0...
        if (newHealth <= 0) {

            // CASO A: AÚN LE QUEDAN VIDAS (Revive)
            if (player.getLives() > 0) {
                player.setLives(player.getLives() - 1);
                player.setHealth(100); // ❤️ Reseteamos vida
                System.out.println("El jugador perdió una vida. Restantes: " + player.getLives());
            }
            // CASO B: NO LE QUEDAN VIDAS (Game Over Real)
            else {
                player.setLives(0);  // Aseguramos que no sea negativo
                player.setHealth(0); // 💀 SE QUEDA MUERTO
                System.out.println("GAME OVER: El jugador ha muerto definitivamente.");
            }

        } else {
            // Si no murió, solo actualizamos el daño normal
            player.setHealth(newHealth);
        }

        return playerRepository.save(player);
    }
    public Player heal(Long playerId, int amount) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        player.setHealth(Math.min(player.getHealth() + amount, 100));
        return playerRepository.save(player);
    }

    public Player restoreEnergy(Long playerId, int amount) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        player.setEnergy(Math.min(player.getEnergy() + amount, 100));
        return playerRepository.save(player);
    }

    public Player sleep(Long playerId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        player.setHealth(100);
        player.setEnergy(100);

        return playerRepository.save(player);
    }

    /**
     * @deprecated Use ShopService.purchaseItem(playerId, healthPotionItemId) instead.
     * Kept for backward compatibility — delegates to ShopService internally.
     */
    @Deprecated
    public Player buyHealthPotion(Long playerId) {
        // Delegate to ShopService (item ID 1 = seeded health potion)
        shopService.purchaseItem(playerId, 1L);
        return playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));
    }

}