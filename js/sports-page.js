import { loadSports } from "./sports.js";

const STORAGE_KEY = "skycast-last-city";

const savedLocation = localStorage.getItem(STORAGE_KEY);

loadSports(savedLocation || "Mzuzu");
