package ToDoApp.HabitsRPG.services;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class GameSchedulerService {

    private final PlayerRepository playerRepository;
    private final PetService petService;

    public GameSchedulerService(PlayerRepository playerRepository,
                                PetService petService) {
        this.playerRepository = playerRepository;
        this.petService = petService;
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

    // Se ejecuta cada 6 horas
    @Scheduled(cron = "0 0 */6 * * *")
    public void applyPetMoodDecay() {
        petService.applyMoodDecay();
        System.out.println("Se ha aplicado decaimiento de humor a las mascotas activas.");
    }
}
