import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Remplace avec tes propres clés Supabase
const supabaseUrl = "https://ksgrrlzmervlrpdjtprg.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey);

let currentPlantCode = null;
let placedEntity = null;

// Obtenir la position actuelle
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => reject(err),
        { enableHighAccuracy: true }
      );
    } else {
      reject(new Error("Géolocalisation non disponible."));
    }
  });
}

// Affiche une boîte de dialogue avec la position GPS
function showPositionAlert(lat, lon) {
  alert(`Position GPS obtenue :\nLatitude: ${lat}\nLongitude: ${lon}`);
}

// Charger un modèle de plante
async function loadPlant(code) {
  currentPlantCode = code.toUpperCase();

  // Nettoyer l'entité précédente
  if (placedEntity) {
    placedEntity.remove();
    placedEntity = null;
  }

  const scene = document.querySelector("a-scene");
  placedEntity = document.createElement("a-entity");

  placedEntity.setAttribute("glb-model", `models/${code}/${code}.glb`);
  placedEntity.setAttribute("scale", "1 1 1");
  placedEntity.setAttribute("position", "0 0 -3"); // Affiche devant la caméra
  placedEntity.setAttribute("gesture-handler", "minScale: 0.5; maxScale: 5");
  placedEntity.setAttribute("id", "placed-plant");

  scene.appendChild(placedEntity);
}

// Confirmer le placement et sauvegarder dans Supabase
async function confirmPlacement() {
  if (!currentPlantCode || !placedEntity) {
    alert("Chargez une plante d'abord.");
    return;
  }

  try {
    const coords = await getCurrentPosition();
    const { latitude, longitude } = coords;

    showPositionAlert(latitude, longitude);

    placedEntity.setAttribute("gps-entity-place", { latitude, longitude });
    placedEntity.removeAttribute("position"); // on bascule sur position réelle

    const { error } = await supabase.from("Plants").insert([{
      id: currentPlantCode,
      latitude,
      longitude
    }]);

    if (error) throw error;

    alert("Plante enregistrée !");
  } catch (err) {
    console.error(err);
    alert("Erreur : " + err.message);
  }
}

// Charger les plantes déjà sauvegardées
async function loadPlacedPlants() {
  try {
    const { data, error } = await supabase.from("Plants").select("*");
    if (error) throw error;

    const scene = document.querySelector("a-scene");

    data.forEach(({ id, latitude, longitude }) => {
      const plant = document.createElement("a-entity");
      plant.setAttribute("gps-entity-place", { latitude, longitude });
      plant.setAttribute("glb-model", `models/${id}/${id}.glb`);
      plant.setAttribute("scale", "1 1 1");
      plant.setAttribute("gesture-handler", "minScale: 0.5; maxScale: 5");
      scene.appendChild(plant);
    });
  } catch (err) {
    console.error("Erreur de chargement Supabase :", err);
  }
}

// Initialisation des boutons
window.onload = () => {
  document.getElementById("loadPlantBtn").onclick = () => {
    const code = document.getElementById("plantCodeInput").value.trim().toUpperCase();
    if (code.length === 3) {
      loadPlant(code);
    } else {
      alert("Code plante invalide (3 lettres)");
    }
  };

  document.getElementById("confirmPlacementBtn").onclick = confirmPlacement;

  loadPlacedPlants();
};
