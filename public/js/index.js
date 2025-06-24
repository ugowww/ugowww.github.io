import { createClient } from '@supabase/supabase-js'

// === Supabase Config ===
const SUPABASE_URL = 'https://ksgrrlzmervlrpdjtprg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ3JybHptZXJ2bHJwZGp0cHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTIwNzUsImV4cCI6MjA2NjMyODA3NX0._d8aSPBnQzNA08zuRzE4GAHLpu-wm7BcLixnqK9RgZg';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === App State ===
let currentPlantCode = null;
let placedEntity = null;

// === Helpers ===
function showPositionAlert(lat, lon) {
  alert(`Position GPS actuelle :\nLatitude : ${lat}\nLongitude : ${lon}`);
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => resolve(pos.coords),
        err => reject(err),
        { enableHighAccuracy: true }
      );
    } else {
      reject(new Error("La géolocalisation n'est pas supportée."));
    }
  });
}

// === Load a Plant Model ===
async function loadPlant(code) {
  const modelPath = `models/${code}/${code}.glb`;

  try {
    const response = await fetch(modelPath);
    if (!response.ok) throw new Error("Modèle introuvable.");

    currentPlantCode = code;

    if (placedEntity) {
      placedEntity.remove();
      placedEntity = null;
    }

    const scene = document.querySelector('a-scene');
    placedEntity = document.createElement('a-entity');
    placedEntity.setAttribute('glb-model', modelPath);
    placedEntity.setAttribute('scale', '1 1 1');
    placedEntity.setAttribute('position', '0 0 -3');
    placedEntity.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
    placedEntity.setAttribute('id', 'placed-plant');

    scene.appendChild(placedEntity);

  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

// === Confirm & Save Placement to Supabase ===
async function confirmPlacement() {
  if (!currentPlantCode || !placedEntity) {
    alert("Chargez une plante d'abord.");
    return;
  }

  try {
    const coords = await getCurrentPosition();
    showPositionAlert(coords.latitude, coords.longitude);

    // Attach GPS info
    placedEntity.setAttribute('gps-entity-place', {
      latitude: coords.latitude,
      longitude: coords.longitude
    });

    placedEntity.removeAttribute('position'); // Remove default local position

    // Save to Supabase
    const { error } = await supabase.from('Plants').insert({
      id: currentPlantCode,
      latitude: coords.latitude,
      longitude: coords.longitude
    });

    if (error) {
      throw error;
    }

    alert("Plante enregistrée avec succès !");
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

// === Load Existing Plants from Supabase ===
async function loadPlacedPlants() {
  try {
    const { data, error } = await supabase.from('Plants').select('*');
    if (error) throw error;

    const scene = document.querySelector('a-scene');

    data.forEach(({ id, latitude, longitude }) => {
      const plant = document.createElement('a-entity');
      plant.setAttribute('gps-entity-place', { latitude, longitude });
      plant.setAttribute('glb-model', `models/${id}/${id}.glb`);
      plant.setAttribute('scale', '1 1 1');
      plant.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
      scene.appendChild(plant);
    });
  } catch (err) {
    console.error("Erreur chargement plantes : ", err);
  }
}

// === Event Bindings ===
window.onload = () => {
  document.getElementById('loadPlantBtn').onclick = () => {
    const code = document.getElementById('plantCodeInput').value.trim().toUpperCase();
    if (code.length === 3) {
      loadPlant(code);
    } else {
      alert("Code plante invalide (3 lettres).");
    }
  };

  document.getElementById('confirmPlacementBtn').onclick = confirmPlacement;

  loadPlacedPlants(); // auto-load on startup
};
