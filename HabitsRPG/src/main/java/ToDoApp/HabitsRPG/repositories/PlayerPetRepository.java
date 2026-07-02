package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.PlayerPet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlayerPetRepository extends JpaRepository<PlayerPet, Long> {

    Optional<PlayerPet> findByPlayerIdAndIsActiveTrue(Long playerId);

    List<PlayerPet> findByPlayerId(Long playerId);

    boolean existsByPlayerIdAndPetId(Long playerId, Long petId);

    Optional<PlayerPet> findByPlayerIdAndPetId(Long playerId, Long petId);

    List<PlayerPet> findByIsActiveTrue();
}
