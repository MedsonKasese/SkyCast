import { loadSports } from "./sports.js";

import { readStorage } from "./storage.js";
const STORAGE_KEY = "skycast-last-city";

const savedLocation = readStorage(STORAGE_KEY);

loadSports(savedLocation || "Mzuzu");
