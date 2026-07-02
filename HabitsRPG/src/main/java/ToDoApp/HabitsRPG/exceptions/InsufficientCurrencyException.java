package ToDoApp.HabitsRPG.exceptions;

import lombok.Getter;

@Getter
public class InsufficientCurrencyException extends RuntimeException {
    private final String errorCode;
    private final int required;
    private final int available;

    public InsufficientCurrencyException(String errorCode, String message, int required, int available) {
        super(message);
        this.errorCode = errorCode;
        this.required = required;
        this.available = available;
    }
}
