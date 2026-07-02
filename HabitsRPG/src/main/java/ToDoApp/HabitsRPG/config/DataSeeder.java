package ToDoApp.HabitsRPG.config;

import ToDoApp.HabitsRPG.models.Enum.EffectType;
import ToDoApp.HabitsRPG.models.Enum.EquipSlot;
import ToDoApp.HabitsRPG.models.Enum.ItemType;
import ToDoApp.HabitsRPG.models.Enum.Rarity;
import ToDoApp.HabitsRPG.models.Habit;
import ToDoApp.HabitsRPG.models.Pet;
import ToDoApp.HabitsRPG.models.Player;
import ToDoApp.HabitsRPG.models.ShopItem;
import ToDoApp.HabitsRPG.repositories.HabitRepository;
import ToDoApp.HabitsRPG.repositories.PetRepository;
import ToDoApp.HabitsRPG.repositories.PlayerRepository;
import ToDoApp.HabitsRPG.repositories.ShopItemRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DataSeeder {

    @Bean
    CommandLineRunner initDatabase(HabitRepository habitRepository, PlayerRepository playerRepository,
                                   ShopItemRepository shopItemRepository,
                                   PetRepository petRepository) {
        return args -> {
            // 1. Crear el JUGADOR si no existe
            Player defaultPlayer;
            if (playerRepository.count() == 0) {
                defaultPlayer = new Player();
                defaultPlayer.setName("Tomas");
                defaultPlayer.setHealth(100);
                defaultPlayer.setEnergy(100);
                defaultPlayer.setGold(500); // Extra gold to test shop

                defaultPlayer.setLevel(1);
                defaultPlayer.setXp(0);
                defaultPlayer.setXpToNextLevel(100);

                playerRepository.save(defaultPlayer);
                System.out.println("✅ Jugador inicial creado con éxito (ID 1).");
            } else {
                defaultPlayer = playerRepository.findAll().get(0);
            }

            // 2. Crear HÁBITOS si no existen
            if (habitRepository.count() == 0) {
                Habit h1 = new Habit();
                h1.setTitle("Estudiar 1 hora");
                h1.setType("POSITIVE");
                h1.setXpReward(50);
                h1.setGoldReward(20);
                h1.setEnergyCost(20);

                Habit h2 = new Habit();
                h2.setTitle("Hacer Ejercicio");
                h2.setType("POSITIVE");
                h2.setXpReward(40);
                h2.setGoldReward(15);
                h2.setEnergyCost(40);

                Habit h3 = new Habit();
                h3.setTitle("Comer Chatarra");
                h3.setType("NEGATIVE");
                h3.setHpPenalty(20);
                h3.setEnergyCost(5);

                Habit h4 = new Habit();
                h4.setTitle("Procrastinar 2 horas");
                h4.setType("NEGATIVE");
                h4.setHpPenalty(10);
                h4.setEnergyCost(20);

                habitRepository.save(h1);
                habitRepository.save(h2);
                habitRepository.save(h3);
                habitRepository.save(h4);
                System.out.println("✅ Base de datos de hábitos inicializada.");
            }

            // 3. Crear ÍTEMS DE LA TIENDA si no existen
            if (shopItemRepository.count() == 0) {
                shopItemRepository.save(createShopItem(
                        "Poción de Salud", "Recupera 20 puntos de salud al instante.",
                        ItemType.CONSUMABLE, Rarity.COMMON, 50, 0,
                        EffectType.HEAL, 20, null, null, null, true, null));

                shopItemRepository.save(createShopItem(
                        "Poción de Energía", "Restaura 30 puntos de energía.",
                        ItemType.CONSUMABLE, Rarity.COMMON, 40, 0,
                        EffectType.ENERGY, 30, null, null, null, true, null));

                shopItemRepository.save(createShopItem(
                        "Elixir del Héroe", "Recupera toda la salud y la energía al máximo.",
                        ItemType.CONSUMABLE, Rarity.RARE, 100, 0,
                        EffectType.HEAL, 100, null, null, null, true, null));

                shopItemRepository.save(createShopItem(
                        "Túnica del Aventurero", "Una túnica resistente para tus aventuras diarias.",
                        ItemType.COSMETIC, Rarity.UNCOMMON, 200, 0,
                        EffectType.COSMETIC, 0, EquipSlot.SKIN, null, null, true, null));

                shopItemRepository.save(createShopItem(
                        "Capa de las Sombras", "Una capa oscura que otorga un aspecto sigiloso.",
                        ItemType.COSMETIC, Rarity.UNCOMMON, 300, 0,
                        EffectType.COSMETIC, 0, EquipSlot.ACCESSORY_1, null, null, true, null));

                shopItemRepository.save(createShopItem(
                        "Amuleto del Fénix", "Otorga el doble de XP durante 24 horas.",
                        ItemType.BOOST, Rarity.RARE, 150, 0,
                        EffectType.XP_BOOST, 2, null, 24, null, true, null));

                shopItemRepository.save(createShopItem(
                        "Corona del Héroe", "Una corona dorada digna de un verdadero campeón.",
                        ItemType.COSMETIC, Rarity.EPIC, 500, 0,
                        EffectType.COSMETIC, 0, EquipSlot.SKIN, null, null, true, null));

                shopItemRepository.save(createShopItem(
                        "Botas de Velocidad", "Botas ligeras que reflejan tu velocidad y dedicación.",
                        ItemType.COSMETIC, Rarity.UNCOMMON, 250, 0,
                        EffectType.COSMETIC, 0, EquipSlot.ACCESSORY_2, null, null, true, null));

                System.out.println("✅ Tienda inicializada con 8 ítems.");
            }

            // 4. Crear ESPECIES DE MASCOTAS si no existen
            if (petRepository.count() == 0) {
                // Pet species are created FIRST so we know their IDs for ShopItem.effectValue
                Pet fenix = createPetSpecies("Fénix",
                        "Un ave majestuosa que renace de las cenizas. Resiliente y leal.",
                        "https://api.dicebear.com/9.x/icons/svg?icon=phoenix&backgroundColor=ff6b35",
                        0.1, 4, 5, 200, 0);

                Pet gato = createPetSpecies("Gato Sombrío",
                        "Un felino misterioso que refleja tu estado de ánimo. Moody pero adorable.",
                        "https://api.dicebear.com/9.x/icons/svg?icon=cat&backgroundColor=2d2d2d",
                        0.3, 2, 3, 150, 0);

                Pet dragon = createPetSpecies("Dragón Dorado",
                        "Una criatura legendaria de escamas doradas. Casi imposible de alterar.",
                        "https://api.dicebear.com/9.x/icons/svg?icon=dragon&backgroundColor=ffd700",
                        0.05, 5, 6, 500, 0);

                Pet slime = createPetSpecies("Slime",
                        "Una burbuja saltarina que rebosa energía. Cambia de humor rápidamente.",
                        "https://api.dicebear.com/9.x/icons/svg?icon=ghost&backgroundColor=44dd88",
                        0.5, 3, 4, 100, 0);

                petRepository.save(fenix);
                petRepository.save(gato);
                petRepository.save(dragon);
                petRepository.save(slime);

                // Pet IDs are now 1, 2, 3, 4 (auto-increment)
                // Create corresponding SHOP items with PET type
                // effectValue stores the Pet species ID for lookup in ShopService
                shopItemRepository.save(createShopItem(
                        "Fénix", "Un ave majestuosa que renace de las cenizas. Resiliente y leal.",
                        ItemType.PET, Rarity.EPIC, 200, 0,
                        EffectType.COSMETIC, 1, null, null,
                        "https://api.dicebear.com/9.x/icons/svg?icon=phoenix&backgroundColor=ff6b35",
                        true, 1));

                shopItemRepository.save(createShopItem(
                        "Gato Sombrío", "Un felino misterioso que refleja tu estado de ánimo.",
                        ItemType.PET, Rarity.UNCOMMON, 150, 0,
                        EffectType.COSMETIC, 2, null, null,
                        "https://api.dicebear.com/9.x/icons/svg?icon=cat&backgroundColor=2d2d2d",
                        true, 1));

                shopItemRepository.save(createShopItem(
                        "Dragón Dorado", "Una criatura legendaria de escamas doradas.",
                        ItemType.PET, Rarity.LEGENDARY, 500, 0,
                        EffectType.COSMETIC, 3, null, null,
                        "https://api.dicebear.com/9.x/icons/svg?icon=dragon&backgroundColor=ffd700",
                        true, 1));

                shopItemRepository.save(createShopItem(
                        "Slime", "Una burbuja saltarina que rebosa energía.",
                        ItemType.PET, Rarity.COMMON, 100, 0,
                        EffectType.COSMETIC, 4, null, null,
                        "https://api.dicebear.com/9.x/icons/svg?icon=ghost&backgroundColor=44dd88",
                        true, 1));

                System.out.println("✅ Mascotas inicializadas: Fénix, Gato Sombrío, Dragón Dorado, Slime.");
            }
        };
    }

    private Pet createPetSpecies(String name, String description, String imageUrl,
                                  double happinessDecay, int sadnessThreshold,
                                  int angerThreshold, int priceGold, int priceGems) {
        Pet pet = new Pet();
        pet.setName(name);
        pet.setDescription(description);
        pet.setImageUrl(imageUrl);
        pet.setItemType(ItemType.PET);
        pet.setHappinessDecay(happinessDecay);
        pet.setSadnessThreshold(sadnessThreshold);
        pet.setAngerThreshold(angerThreshold);
        pet.setPriceGold(priceGold);
        pet.setPriceGems(priceGems);
        return pet;
    }

    private ShopItem createShopItem(String name, String description,
                                     ItemType itemType, Rarity rarity,
                                     int priceGold, int priceGems,
                                     EffectType effectType, int effectValue,
                                     EquipSlot equipSlot, Integer durationHours,
                                     String imageUrl, boolean isPurchasable,
                                     Integer maxOwned) {
        ShopItem item = new ShopItem();
        item.setName(name);
        item.setDescription(description);
        item.setItemType(itemType);
        item.setRarity(rarity);
        item.setPriceGold(priceGold);
        item.setPriceGems(priceGems);
        item.setEffectType(effectType);
        item.setEffectValue(effectValue);
        item.setEquipSlot(equipSlot);
        item.setDurationHours(durationHours);
        item.setImageUrl(imageUrl);
        item.setPurchasable(isPurchasable);
        item.setMaxOwned(maxOwned);
        return item;
    }
}