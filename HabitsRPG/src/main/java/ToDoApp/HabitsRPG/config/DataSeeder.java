package ToDoApp.HabitsRPG.config;

import ToDoApp.HabitsRPG.models.Habit;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.repositories.HabitRepository;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(HabitRepository repository, PlayerRepository playerRepository) {
        return args -> {
            // 1. Crear el JUGADOR si no existe
            Player defaultPlayer;
            if (playerRepository.count() == 0) {
                defaultPlayer = new Player();
                defaultPlayer.setName("Tomas"); // Pon tu nombre aquí
                defaultPlayer.setHealth(100);
                defaultPlayer.setEnergy(100);
                defaultPlayer.setGold(0);

                // Nuevos campos de nivel
                defaultPlayer.setLevel(1);
                defaultPlayer.setXp(0);
                defaultPlayer.setXpToNextLevel(100);

                playerRepository.save(defaultPlayer);
                System.out.println("✅ Jugador inicial creado con éxito (ID 1).");
            } else {
                defaultPlayer = playerRepository.findAll().get(0);
            }
            if (repository.count() == 0) {
                Habit h1 = new Habit();
                h1.setName("Estudiar 1 hora");
                h1.setType("POSITIVE");
                h1.setXpReward(50);
                h1.setGoldReward(20);
                h1.setEnergyCost(20);

                Habit h2 = new Habit();
                h2.setName("Hacer Ejercicio");
                h2.setType("POSITIVE");
                h2.setXpReward(40);
                h2.setGoldReward(15);
                h2.setEnergyCost(40);

                Habit h3 = new Habit();
                h3.setName("Comer Chatarra");
                h3.setType("NEGATIVE");
                h3.setHpPenalty(20);
                h3.setEnergyCost(5);

                Habit h4 = new Habit();
                h4.setName("Procrastinar 2 horas");
                h4.setType("NEGATIVE");
                h4.setHpPenalty(10); // Te duele en el progreso
                h4.setEnergyCost(20); // ¡Pero te devuelve 20 de energía!
                
                repository.save(h1);
                repository.save(h2);
                repository.save(h3);
                repository.save(h4);
                System.out.println("Base de datos de hábitos inicializada.");
            }
        };
    }
}