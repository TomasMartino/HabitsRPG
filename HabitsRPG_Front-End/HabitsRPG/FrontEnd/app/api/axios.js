import axios from "axios";

// Cambiá 192.168.1.XX por la IP real de tu PC
// Podés verla escribiendo 'ipconfig' en la terminal de Windows
const instance = axios.create({
  baseURL: "http://192.168.1.36:8080/api",
});

export default instance;
