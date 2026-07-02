package ToDoApp.HabitsRPG.models;

import ToDoApp.HabitsRPG.models.Enum.ItemType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "pets")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url")
    private String imageUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "item_type", nullable = false)
    private ItemType itemType = ItemType.PET;

    @Column(name = "happiness_decay")
    private double happinessDecay;

    @Column(name = "sadness_threshold")
    private int sadnessThreshold;

    @Column(name = "anger_threshold")
    private int angerThreshold;

    @Column(name = "price_gold")
    private int priceGold = 0;

    @Column(name = "price_gems")
    private int priceGems = 0;

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
