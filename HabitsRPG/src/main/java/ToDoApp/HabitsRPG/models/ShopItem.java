package ToDoApp.HabitsRPG.models;

import ToDoApp.HabitsRPG.models.Enum.EffectType;
import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import ToDoApp.HabitsRPG.models.Enum.ItemType;
import ToDoApp.HabitsRPG.models.Enum.Rarity;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "shop_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ShopItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private ItemType itemType;

    @Enumerated(EnumType.STRING)
    private Rarity rarity = Rarity.COMMON;

    @Column(name = "price_gold")
    private int priceGold = 0;

    @Column(name = "price_gems")
    private int priceGems = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "effect_type")
    private EffectType effectType;

    @Column(name = "effect_value")
    private int effectValue;

    @Column(name = "image_url")
    private String imageUrl;

    @Column(name = "is_purchasable")
    private boolean isPurchasable = true;

    @Column(name = "max_owned", nullable = true)
    private Integer maxOwned;

    @Column(name = "duration_hours", nullable = true)
    private Integer durationHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "equip_slot")
    private EquipSlot equipSlot;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
