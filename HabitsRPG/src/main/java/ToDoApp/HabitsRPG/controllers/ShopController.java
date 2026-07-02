package ToDoApp.HabitsRPG.controllers;

import ToDoApp.HabitsRPG.dto.PurchaseResult;
import ToDoApp.HabitsRPG.exceptions.*;
import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import ToDoApp.HabitsRPG.models.Enum.ItemType;
import ToDoApp.HabitsRPG.services.ShopService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/shop")
@CrossOrigin(origins = "*")
public class ShopController {

    private final ShopService shopService;

    public ShopController(ShopService shopService) {
        this.shopService = shopService;
    }

    @GetMapping("/items")
    public ResponseEntity<?> getCatalog(
            @RequestParam(required = false) ItemType category) {
        try {
            var items = shopService.getCatalog(category);
            return ResponseEntity.ok(Map.of("items", items));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/buy/{itemId}")
    public ResponseEntity<?> buyItem(
            @PathVariable Long itemId,
            @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            PurchaseResult result = shopService.purchaseItem(playerId, itemId);
            return ResponseEntity.ok(result);
        } catch (InsufficientCurrencyException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getErrorCode(),
                    "message", e.getMessage(),
                    "required", e.getRequired(),
                    "available", e.getAvailable()));
        } catch (ItemNotAvailableException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getErrorCode(),
                    "message", e.getMessage()));
        } catch (MaxOwnedExceededException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getErrorCode(),
                    "message", e.getMessage()));
        } catch (ItemNotFoundException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "ITEM_NOT_FOUND",
                    "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "PURCHASE_FAILED",
                            "message", e.getMessage()));
        }
    }

    @GetMapping("/inventory")
    public ResponseEntity<?> getInventory(@RequestParam Long playerId) {
        try {
            var inventory = shopService.getInventory(playerId);
            return ResponseEntity.ok(Map.of("inventory", inventory));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/equipment")
    public ResponseEntity<?> getEquipment(@RequestParam Long playerId) {
        try {
            var equipment = shopService.getEquipment(playerId);
            return ResponseEntity.ok(Map.of("equipment", equipment));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/inventory/equip/{inventoryId}")
    public ResponseEntity<?> equipItem(
            @PathVariable Long inventoryId,
            @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            shopService.equipItem(playerId, inventoryId);
            return ResponseEntity.ok(Map.of("success", true, "equipped", true));
        } catch (NotEquippableException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", e.getErrorCode(),
                    "message", e.getMessage()));
        } catch (ItemNotFoundException e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "error", "ITEM_NOT_IN_INVENTORY",
                    "message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/inventory/unequip/{slot}")
    public ResponseEntity<?> unequipItem(
            @PathVariable String slot,
            @RequestBody Map<String, Long> body) {
        try {
            Long playerId = body.get("playerId");
            shopService.unequipItem(playerId, EquipSlot.valueOf(slot.toUpperCase()));
            return ResponseEntity.ok(Map.of("success", true, "equipped", false));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", "INVALID_SLOT",
                            "message", "Slot inválido: " + slot));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
