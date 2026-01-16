package ToDoApp.HabitsRPG.repositories;
import ToDoApp.HabitsRPG.models.Habit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface HabitRepository extends JpaRepository<Habit, Long> {
    // Aquí podrías crear métodos personalizados luego, como findByType
    // Spring Data JPA crea la consulta automáticamente por el nombre del método
    List<Habit> findByPlayerId(Long playerId);
    @Query("SELECT h FROM Habit h WHERE h.player.id = :playerId OR h.player IS NULL")
    List<Habit> findByPlayerIdOrGlobal(@Param("playerId") Long playerId);
}
