package ToDoApp.HabitsRPG.repositories;
import ToDoApp.HabitsRPG.models.Player;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {
    // Aquí podrías crear métodos personalizados luego, como findByName
}
