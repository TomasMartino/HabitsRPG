package ToDoApp.HabitsRPG.exceptions;

import lombok.Getter;

@Getter
public class ItemNotAvailableException extends RuntimeException {
    private final String errorCode;

    public ItemNotAvailableException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
