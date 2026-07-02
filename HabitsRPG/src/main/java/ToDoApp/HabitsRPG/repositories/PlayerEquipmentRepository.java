package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import ToDoApp.HabitsRPG.models.PlayerEquipment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerEquipmentRepository extends JpaRepository<PlayerEquipment, Long> {
    List<PlayerEquipment> findByPlayerId(Long playerId);
    Optional<PlayerEquipment> findByPlayerIdAndSlot(Long playerId, EquipSlot slot);
    boolean existsByPlayerIdAndSlot(Long playerId, EquipSlot slot);
    Optional<PlayerEquipment> findByPlayerIdAndItemId(Long playerId, Long itemId);
    void deleteByPlayerIdAndSlot(Long playerId, EquipSlot slot);
}
