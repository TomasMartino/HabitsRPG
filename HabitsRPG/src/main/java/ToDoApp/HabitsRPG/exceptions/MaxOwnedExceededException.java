package ToDoApp.HabitsRPG.exceptions;

import lombok.Getter;

@Getter
public class MaxOwnedExceededException extends RuntimeException {
    private final String errorCode;

    public MaxOwnedExceededException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
