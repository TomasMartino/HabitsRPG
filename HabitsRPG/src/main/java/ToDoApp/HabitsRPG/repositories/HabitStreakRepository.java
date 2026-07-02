package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.HabitStreak;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface HabitStreakRepository extends JpaRepository<HabitStreak, Long> {
    Optional<HabitStreak> findByHabitIdAndPlayerId(Long habitId, Long playerId);
    List<HabitStreak> findByPlayerId(Long playerId);
}
