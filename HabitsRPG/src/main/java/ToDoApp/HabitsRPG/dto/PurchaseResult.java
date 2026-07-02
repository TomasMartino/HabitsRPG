package ToDoApp.HabitsRPG.dto;

public record PurchaseResult(boolean success, int goldRemaining,
                             int gemsRemaining, int quantity) {
}
