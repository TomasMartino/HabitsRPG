# 🛡️ Habits RPG - Gamify Your Life

**Habits RPG** es una aplicación Full Stack que convierte el desarrollo personal en un videojuego de rol. Completa hábitos positivos para ganar experiencia (XP) y oro, pero ten cuidado: fallar en tus deberes te quitará vida (HP).

¡Sube de nivel, compra pociones y mantén a tu personaje con vida mientras mejoras la tuya!

## 🚀 Tecnologías Usadas

### Backend (API REST)
* **Lenguaje:** Java 17
* **Framework:** Spring Boot 3
* **Base de Datos:** H2 (Dev) / MySQL (Prod)
* **ORM:** Hibernate / JPA
* **Herramientas:** Maven, Lombok

### Frontend (Móvil)
* **Framework:** React Native (Expo)
* **Lenguaje:** TypeScript / JavaScript
* **Cliente HTTP:** Axios
* **Componentes:** Themed View (Expo Router)

---

## 🎮 Funcionalidades Principales

* **Sistema de RPG:**
    * ❤️ **Salud (HP):** Si llega a 0, pierdes una vida o mueres (Game Over).
    * ⚡ **Energía:** Necesaria para realizar hábitos difíciles.
    * ⭐ **Experiencia (XP):** Sube de nivel y aumenta la dificultad dinámicamente.
    * 💰 **Economía:** Gana oro y gástalo en la Tienda.
* **Gestión de Hábitos:**
    * Creación de hábitos positivos (recompensas) y negativos (daño).
    * Validación de energía y costos.
* **Tienda de Objetos:**
    * Compra pociones para recuperar salud.
* **Mecánica de Muerte:**
    * Sistema de vidas y resurrección.

---

## 🛠️ Instalación y Ejecución

Sigue estos pasos para correr el proyecto en local.

### Prerrequisitos
* Java 17 JDK
* Node.js & npm
* Maven (opcional, si usas el wrapper `mvnw`)
* Expo Go (App en tu celular)

### 1. Iniciar el Backend (Spring Boot)
Este servicio debe correr en el puerto `8080`.

```bash
# Entrar a la carpeta del servidor
cd HabitsRPG

# Ejecutar con Maven Wrapper (Linux/Mac)
./mvnw spring-boot:run

# O en Windows:
mvnw spring-boot:run
