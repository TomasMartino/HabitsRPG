package ToDoApp.HabitsRPG.services;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class GameSchedulerService {

    private final PlayerRepository playerRepository;

    public GameSchedulerService(PlayerRepository playerRepository) {
        this.playerRepository = playerRepository;
    }

    // Se ejecuta cada 1 hora (0 minutos, 0 segundos)
    @Scheduled(cron = "0 0 * * * *")
    public void recoverEnergyPerHour() {
        List<Player> players = playerRepository.findAll();
        for (Player player : players) {
            // Suma 5 de energía sin pasarse de 100
            int newEnergy = Math.min(player.getEnergy() + 5, 100);
            player.setEnergy(newEnergy);
        }
        playerRepository.saveAll(players);
        System.out.println("Se han recuperado 5 puntos de energía para todos los jugadores.");
    }
}
