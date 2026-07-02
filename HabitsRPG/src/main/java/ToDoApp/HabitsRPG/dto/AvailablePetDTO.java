package ToDoApp.HabitsRPG.dto;

public record AvailablePetDTO(
    Long petId,
    String name,
    String description,
    String imageUrl,
    int priceGold
) {}
