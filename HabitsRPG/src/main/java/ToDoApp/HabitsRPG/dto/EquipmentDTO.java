package ToDoApp.HabitsRPG.dto;

import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import ToDoApp.HabitsRPG.models.Enum.Rarity;

import java.time.LocalDateTime;

public record EquipmentDTO(Long id, Long itemId, String name, Rarity rarity,
                           EquipSlot slot, LocalDateTime equippedAt) {
}
