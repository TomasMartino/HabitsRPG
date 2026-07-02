package ToDoApp.HabitsRPG.exceptions;

import lombok.Getter;

@Getter
public class NotEquippableException extends RuntimeException {
    private final String errorCode;

    public NotEquippableException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
