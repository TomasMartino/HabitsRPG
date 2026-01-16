package ToDoApp.HabitsRPG;

import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@EnableScheduling
@SpringBootApplication
public class HabitsRpgApplication {

	public static void main(String[] args) {
		SpringApplication.run(HabitsRpgApplication.class, args);
	}

}
