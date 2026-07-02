package ToDoApp.HabitsRPG.models;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "player_inventory",
       uniqueConstraints = @UniqueConstraint(columnNames = {"player_id", "item_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PlayerInventory {

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

    @Column(nullable = false)
    private int quantity = 1;

    @Column(name = "acquired_at", updatable = false)
    private LocalDateTime acquiredAt;

    @Column(name = "expires_at", nullable = true)
    private LocalDateTime expiresAt;

    @PrePersist
    protected void onCreate() {
        acquiredAt = LocalDateTime.now();
    }
}
