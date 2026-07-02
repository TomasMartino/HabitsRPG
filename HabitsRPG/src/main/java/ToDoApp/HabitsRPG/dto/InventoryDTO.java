package ToDoApp.HabitsRPG.dto;

import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import ToDoApp.HabitsRPG.models.Enum.ItemType;
import ToDoApp.HabitsRPG.models.Enum.Rarity;

import java.time.LocalDateTime;

public record InventoryDTO(Long id, Long itemId, String name, String description,
                           ItemType itemType, Rarity rarity, int quantity,
                           boolean isEquipped, LocalDateTime expiresAt,
                           EquipSlot equipSlot) {
}
