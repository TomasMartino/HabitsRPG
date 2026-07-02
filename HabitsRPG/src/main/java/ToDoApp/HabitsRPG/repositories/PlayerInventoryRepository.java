package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.PlayerInventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerInventoryRepository extends JpaRepository<PlayerInventory, Long> {
    List<PlayerInventory> findByPlayerId(Long playerId);
    Optional<PlayerInventory> findByPlayerIdAndItemId(Long playerId, Long itemId);
    boolean existsByPlayerIdAndItemId(Long playerId, Long itemId);
    int countByPlayerIdAndItemId(Long playerId, Long itemId);
}
