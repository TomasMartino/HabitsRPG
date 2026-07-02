package ToDoApp.HabitsRPG.exceptions;

public class DuplicateCompletionException extends RuntimeException {
    public DuplicateCompletionException(String message) {
        super(message);
    }
}
