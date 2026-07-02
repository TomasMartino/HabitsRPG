package ToDoApp.HabitsRPG.controllers;

import ToDoApp.HabitsRPG.dto.ActivePetDTO;
import ToDoApp.HabitsRPG.dto.AvailablePetDTO;
import ToDoApp.HabitsRPG.models.Pet;
import ToDoApp.HabitsRPG.models.PlayerPet;
import ToDoApp.HabitsRPG.repositories.PetRepository;
import ToDoApp.HabitsRPG.services.PetService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pets")
@CrossOrigin(origins = "*")
public class PetController {

    private final PetService petService;
    private final PetRepository petRepository;

    public PetController(PetService petService, PetRepository petRepository) {
        this.petService = petService;
        this.petRepository = petRepository;
    }

    @GetMapping("/active")
    public ResponseEntity<?> getActivePet(@RequestParam Long playerId) {
        try {
            PlayerPet active = petService.getActivePet(playerId);
            if (active == null) {
                java.util.Map<String, Object> empty = new java.util.HashMap<>();
                empty.put("activePet", null);
                return ResponseEntity.ok(empty);
            }

            Pet species = petRepository.findById(active.getPetId()).orElse(null);
            ActivePetDTO dto = new ActivePetDTO(
                    active.getPetId(),
                    species != null ? species.getName() : null,
                    active.getCurrentMood(),
                    active.getAffection(),
                    species != null ? species.getImageUrl() : null
            );

            return ResponseEntity.ok(Map.of("activePet", dto));

        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            return ResponseEntity.badRequest()
                    .body(Map.of("error", msg));
        }
    }

    @GetMapping("/available")
    public ResponseEntity<?> getAvailablePets(@RequestParam Long playerId) {
        try {
            List<Pet> pets = petService.getAvailablePets(playerId);
            List<AvailablePetDTO> dtos = pets.stream()
                    .map(p -> new AvailablePetDTO(
                            p.getId(),
                            p.getName(),
                            p.getDescription(),
                            p.getImageUrl(),
                            p.getPriceGold()))
                    .toList();
            return ResponseEntity.ok(Map.of("pets", dtos));
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            return ResponseEntity.badRequest()
                    .body(Map.of("error", msg));
        }
    }

    @PostMapping("/select")
    public ResponseEntity<?> selectPet(@RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            Long petId = body.get("petId");

            if (playerId == null || petId == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "playerId and petId are required"));
            }

            PlayerPet updated = petService.selectPet(playerId, petId);
            Pet species = petRepository.findById(updated.getPetId()).orElse(null);

            ActivePetDTO dto = new ActivePetDTO(
                    updated.getPetId(),
                    species != null ? species.getName() : null,
                    updated.getCurrentMood(),
                    updated.getAffection(),
                    species != null ? species.getImageUrl() : null
            );

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "activePet", dto
            ));

        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            return ResponseEntity.badRequest()
                    .body(Map.of("error", msg));
        }
    }

    @PostMapping("/decay")
    public ResponseEntity<?> triggerDecay() {
        try {
            petService.applyMoodDecay();
            return ResponseEntity.ok(Map.of("success", true,
                    "message", "Mood decay applied"));
        } catch (Exception e) {
            String msg = e.getMessage() != null ? e.getMessage() : "Unknown error";
            return ResponseEntity.badRequest()
                    .body(Map.of("error", msg));
        }
    }
}
