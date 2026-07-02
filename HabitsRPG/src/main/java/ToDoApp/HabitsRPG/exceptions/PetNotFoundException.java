package ToDoApp.HabitsRPG.exceptions;

import lombok.Getter;

@Getter
public class PetNotFoundException extends RuntimeException {
    private final String errorCode;

    public PetNotFoundException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
