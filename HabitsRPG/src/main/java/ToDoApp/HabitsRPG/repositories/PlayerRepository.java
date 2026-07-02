package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.Player;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PlayerRepository extends JpaRepository<Player, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Player p WHERE p.id = :id")
    Optional<Player> findByIdWithLock(@Param("id") Long id);
}
