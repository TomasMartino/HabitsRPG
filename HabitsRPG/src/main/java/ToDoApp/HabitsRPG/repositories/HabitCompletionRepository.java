package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.HabitCompletion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface HabitCompletionRepository extends JpaRepository<HabitCompletion, Long> {

    Optional<HabitCompletion> findByHabitIdAndPlayerIdAndCompletedDate(
            Long habitId, Long playerId, LocalDate completedDate);

    @Query("SELECT hc.completedDate FROM HabitCompletion hc " +
           "WHERE hc.habit.id = :habitId AND hc.player.id = :playerId " +
           "ORDER BY hc.completedDate DESC")
    List<LocalDate> findCompletedDatesByHabitAndPlayer(
            @Param("habitId") Long habitId,
            @Param("playerId") Long playerId);

    @Query("SELECT COUNT(hc) FROM HabitCompletion hc " +
           "WHERE hc.habit.id = :habitId AND hc.player.id = :playerId")
    long countByHabitIdAndPlayerId(@Param("habitId") Long habitId,
                                   @Param("playerId") Long playerId);

    @Query("SELECT hc.completedDate FROM HabitCompletion hc " +
           "WHERE hc.habit.id IN :habitIds AND hc.player.id = :playerId " +
           "ORDER BY hc.completedDate DESC")
    List<LocalDate> findCompletedDatesByHabitsAndPlayer(
            @Param("habitIds") List<Long> habitIds,
            @Param("playerId") Long playerId);
}
