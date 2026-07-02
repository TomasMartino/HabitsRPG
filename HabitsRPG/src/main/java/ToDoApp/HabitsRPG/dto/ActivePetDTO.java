package ToDoApp.HabitsRPG.dto;

import ToDoApp.HabitsRPG.models.Enum.PetMood;

public record ActivePetDTO(
    Long petId,
    String petName,
    PetMood mood,
    int affection,
    String imageUrl
) {}
