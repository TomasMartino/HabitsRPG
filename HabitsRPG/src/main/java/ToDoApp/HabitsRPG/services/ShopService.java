package ToDoApp.HabitsRPG.services;

import ToDoApp.HabitsRPG.dto.EquipmentDTO;
import ToDoApp.HabitsRPG.dto.InventoryDTO;
import ToDoApp.HabitsRPG.dto.PurchaseResult;
import ToDoApp.HabitsRPG.exceptions.*;
import ToDoApp.HabitsRPG.models.*;
import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import ToDoApp.HabitsRPG.models.Enum.ItemType;
import ToDoApp.HabitsRPG.models.Enum.PetMood;
import ToDoApp.HabitsRPG.repositories.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ShopService {

    private final PlayerRepository playerRepository;
    private final ShopItemRepository shopItemRepository;
    private final PlayerInventoryRepository inventoryRepository;
    private final PlayerEquipmentRepository equipmentRepository;
    private final PlayerPetRepository playerPetRepository;
    private final PetRepository petRepository;

    public ShopService(PlayerRepository playerRepository,
                       ShopItemRepository shopItemRepository,
                       PlayerInventoryRepository inventoryRepository,
                       PlayerEquipmentRepository equipmentRepository,
                       PlayerPetRepository playerPetRepository,
                       PetRepository petRepository) {
        this.playerRepository = playerRepository;
        this.shopItemRepository = shopItemRepository;
        this.inventoryRepository = inventoryRepository;
        this.equipmentRepository = equipmentRepository;
        this.playerPetRepository = playerPetRepository;
        this.petRepository = petRepository;
    }

    public List<ShopItem> getCatalog(ItemType category) {
        if (category != null) {
            return shopItemRepository.findByItemTypeAndIsPurchasableTrue(category);
        }
        return shopItemRepository.findByIsPurchasableTrue();
    }

    @Transactional
    public PurchaseResult purchaseItem(Long playerId, Long itemId) {
        // 1. Pessimistic lock on player
        Player player = playerRepository.findByIdWithLock(playerId)
                .orElseThrow(() -> new RuntimeException("Jugador no encontrado"));

        // 2. Load item
        ShopItem item = shopItemRepository.findById(itemId)
                .orElseThrow(() -> new ItemNotFoundException("Ítem no encontrado"));

        if (!item.isPurchasable()) {
            throw new ItemNotAvailableException("ITEM_NOT_AVAILABLE", "Ítem no disponible para compra");
        }

        // 3. Validate currency
        if (player.getGold() < item.getPriceGold()) {
            throw new InsufficientCurrencyException("INSUFFICIENT_GOLD",
                    "Oro insuficiente: necesitas " + item.getPriceGold(),
                    item.getPriceGold(), player.getGold());
        }
        if (player.getGems() < item.getPriceGems()) {
            throw new InsufficientCurrencyException("INSUFFICIENT_GEMS",
                    "Gemas insuficientes: necesitas " + item.getPriceGems(),
                    item.getPriceGems(), player.getGems());
        }

        // 4. Validate max_owned for limit items
        if (item.getMaxOwned() != null) {
            int owned = inventoryRepository.countByPlayerIdAndItemId(playerId, itemId);
            if (owned >= item.getMaxOwned()) {
                throw new MaxOwnedExceededException("MAX_OWNED_EXCEEDED",
                        "Ya posees el máximo de este ítem (" + item.getMaxOwned() + ")");
            }
        }

        // 5. Deduct currency
        player.setGold(player.getGold() - item.getPriceGold());
        player.setGems(player.getGems() - item.getPriceGems());
        playerRepository.save(player);

        // 6. Handle based on item type
        boolean consumed = false;
        if (item.getItemType() == ItemType.CONSUMABLE) {
            applyConsumableEffect(player, item);
            playerRepository.save(player);
            consumed = true;  // no inventory row for consumed items
        } else if (item.getItemType() == ItemType.PET) {
            // PET: find the matching species by effectValue (stores Pet ID)
            Long petId = (long) item.getEffectValue();
            Pet petSpecies = petRepository.findById(petId)
                    .orElseThrow(() -> new PetNotFoundException("PET_NOT_FOUND",
                            "Pet species not found for this item"));

            // Reject if player already owns this pet species
            if (playerPetRepository.existsByPlayerIdAndPetId(playerId, petId)) {
                throw new PetNotFoundException("ALREADY_OWNED",
                        "Ya posees esta mascota");
            }

            // Create PlayerPet — auto-activate if player has no active pet
            boolean hasActivePet = playerPetRepository
                    .findByPlayerIdAndIsActiveTrue(playerId)
                    .isPresent();

            PlayerPet newPet = new PlayerPet();
            newPet.setPlayerId(playerId);
            newPet.setPetId(petId);
            newPet.setCurrentMood(PetMood.NEUTRAL);
            newPet.setAffection(100); // start with some affection
            newPet.setActive(!hasActivePet); // auto-activate if none active
            newPet.setLastMoodUpdate(LocalDateTime.now());
            playerPetRepository.save(newPet);

            consumed = true; // no inventory row
        } else {
            // COSMETIC or BOOST → inventory
            PlayerInventory inv = inventoryRepository
                    .findByPlayerIdAndItemId(playerId, itemId)
                    .orElseGet(() -> {
                        PlayerInventory newInv = new PlayerInventory();
                        newInv.setPlayer(player);
                        newInv.setItem(item);
                        newInv.setQuantity(0);
                        return newInv;
                    });
            inv.setQuantity(inv.getQuantity() + 1);

            // Set expiry for BOOST items
            if (item.getItemType() == ItemType.BOOST && item.getDurationHours() != null) {
                inv.setExpiresAt(LocalDateTime.now().plusHours(item.getDurationHours()));
            }
            inventoryRepository.save(inv);
        }

        return new PurchaseResult(true, player.getGold(), player.getGems(),
                consumed ? 0 : 1);
    }

    private void applyConsumableEffect(Player player, ShopItem item) {
        switch (item.getEffectType()) {
            case HEAL -> player.setHealth(
                    Math.min(player.getHealth() + item.getEffectValue(), 100));
            case ENERGY -> player.setEnergy(
                    Math.min(player.getEnergy() + item.getEffectValue(), 100));
            default -> {
                // XP_BOOST, GOLD_BOOST, COSMETIC have no immediate effect
            }
        }
    }

    @Transactional
    public void equipItem(Long playerId, Long inventoryId) {
        PlayerInventory inv = inventoryRepository.findById(inventoryId)
                .orElseThrow(() -> new ItemNotFoundException("Ítem no encontrado en inventario"));

        if (!inv.getPlayer().getId().equals(playerId)) {
            throw new RuntimeException("Este ítem no te pertenece");
        }
        if (inv.getItem().getItemType() != ItemType.COSMETIC) {
            throw new NotEquippableException("NOT_EQUIPPABLE",
                    "Solo ítems cosméticos pueden equiparse");
        }
        if (inv.getQuantity() < 1) {
            throw new RuntimeException("No tienes este ítem");
        }

        EquipSlot slot = inv.getItem().getEquipSlot();
        if (slot == null) {
            throw new NotEquippableException("NOT_EQUIPPABLE",
                    "Este ítem no tiene un slot de equipo definido");
        }

        // Unequip any existing item in this slot
        equipmentRepository.findByPlayerIdAndSlot(playerId, slot)
                .ifPresent(equipmentRepository::delete);

        // Equip new item
        PlayerEquipment eq = new PlayerEquipment();
        eq.setPlayer(inv.getPlayer());
        eq.setItem(inv.getItem());
        eq.setSlot(slot);
        equipmentRepository.save(eq);
    }

    @Transactional
    public void unequipItem(Long playerId, EquipSlot slot) {
        equipmentRepository.deleteByPlayerIdAndSlot(playerId, slot);
    }

    public List<InventoryDTO> getInventory(Long playerId) {
        return inventoryRepository.findByPlayerId(playerId)
                .stream()
                .map(inv -> new InventoryDTO(
                        inv.getId(),
                        inv.getItem().getId(),
                        inv.getItem().getName(),
                        inv.getItem().getDescription(),
                        inv.getItem().getItemType(),
                        inv.getItem().getRarity(),
                        inv.getQuantity(),
                        isEquipped(playerId, inv.getItem().getEquipSlot(), inv.getItem()),
                        inv.getExpiresAt(),
                        inv.getItem().getEquipSlot()))
                .toList();
    }

    public List<EquipmentDTO> getEquipment(Long playerId) {
        return equipmentRepository.findByPlayerId(playerId)
                .stream()
                .map(eq -> new EquipmentDTO(
                        eq.getId(),
                        eq.getItem().getId(),
                        eq.getItem().getName(),
                        eq.getItem().getRarity(),
                        eq.getSlot(),
                        eq.getEquippedAt()))
                .toList();
    }

    private boolean isEquipped(Long playerId, EquipSlot slot, ShopItem item) {
        if (slot == null) return false;
        return equipmentRepository.findByPlayerIdAndSlot(playerId, slot)
                .map(eq -> eq.getItem().getId().equals(item.getId()))
                .orElse(false);
    }
}
