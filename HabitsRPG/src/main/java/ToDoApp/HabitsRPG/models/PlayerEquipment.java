package ToDoApp.HabitsRPG.models;

import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "player_equipment",
       uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "slot"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerEquipment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_id", nullable = false)
    @JsonIgnore
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "item_id", nullable = false)
    private ShopItem item;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private EquipSlot slot;

    @Column(name = "equipped_at", updatable = false)
    private LocalDateTime equippedAt;

    @PrePersist
    protected void onCreate() {
        equippedAt = LocalDateTime.now();
    }
}
