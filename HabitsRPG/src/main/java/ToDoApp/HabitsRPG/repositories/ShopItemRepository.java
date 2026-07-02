package ToDoApp.HabitsRPG.repositories;

import ToDoApp.HabitsRPG.models.Enum.ItemType;
import ToDoApp.HabitsRPG.models.ShopItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ShopItemRepository extends JpaRepository<ShopItem, Long> {
    List<ShopItem> findByIsPurchasableTrue();
    List<ShopItem> findByItemTypeAndIsPurchasableTrue(ItemType itemType);
}
