package ToDoApp.HabitsRPG.services;
import ToDoApp.HabitsRPG.models.Habit;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.HabitRepository;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import org.springframework.stereotype.Service;

@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final PlayerRepository playerRepository;

    public HabitService(HabitRepository habitRepository, PlayerRepository playerRepository) {
        this.habitRepository = habitRepository;
        this.playerRepository = playerRepository;
    }

    public Player completeHabit(Long playerId, Long habitId) {
        Player player = playerRepository.findById(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));
        Habit habit = habitRepository.findById(habitId)
                .orElseThrow(() -> new RuntimeException("Hábito no encontrado"));

        if ("POSITIVE".equals(habit.getType())) {
            // Lógica de hábito bueno (gasta energía)
            int cost = habit.getEnergyCost();
            if (player.getEnergy() >= cost) {
                player.setEnergy(player.getEnergy() - cost);
                player.setXp(player.getXp() + habit.getXpReward());
                player.setGold(player.getGold() + habit.getGoldReward());
            } else {
                player.setXp(player.getXp() + (habit.getXpReward() / 2));
                player.setGold(player.getGold() + (habit.getGoldReward() / 2));
                player.setEnergy(0);
            }
        } else {
            // Lógica de hábito MALO (RECOBRA energía pero quita vida)
            // Usamos el mismo energyCost pero para SUMAR
            int energyRecovery = habit.getEnergyCost();

            player.setHealth(player.getHealth() - habit.getHpPenalty());
            player.setEnergy(Math.min(100, player.getEnergy() + energyRecovery));

            // Los malos hábitos no deberían dar XP ni Oro (o incluso quitar)
            player.setXp(player.getXp());

            if (player.getHealth() <= 0) {
                player.setLives(player.getLives() - 1);
                player.setHealth(100);
            }
        }

        return playerRepository.save(player);
    }
}
