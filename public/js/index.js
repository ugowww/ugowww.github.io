// === Supabase Config ===
const SUPABASE_URL = 'https://ksgrrlzmervlrpdjtprg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ3JybHptZXJ2bHJwZGp0cHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTIwNzUsImV4cCI6MjA2NjMyODA3NX0._d8aSPBnQzNA08zuRzE4GAHLpu-wm7BcLixnqK9RgZg'; 
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// === Global State ===
let currentPlantCode = null;
let placedEntity = null;

// === Utility: Get current GPS coordinates ===
async function getCurrentPosition() {
  if (!('geolocation' in navigator)) {
    throw new Error("La géolocalisation n'est pas supportée.");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(err),
      { enableHighAccuracy: true }
    );
  });
}

// === Load a plant model in front of the user ===
function loadPlantModel(code) {
  const modelPath = `models/${code}/${code}.glb`;
  const scene = document.querySelector('a-scene');

  // Remove old one
  if (placedEntity) {
    placedEntity.remove();
  }

  // Create new plant entity
  placedEntity = document.createElement('a-entity');
  placedEntity.setAttribute('glb-model', modelPath);
  placedEntity.setAttribute('scale', '1 1 1');
  placedEntity.setAttribute('position', '0 0 -3');
  placedEntity.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
  placedEntity.setAttribute('id', 'placed-plant');
  scene.appendChild(placedEntity);

  currentPlantCode = code;
}

// === Save plant's current GPS position to Supabase ===
async function savePlantPosition(code, lat, lon) {
  const { error } = await supabase.from('Plants').insert({
    id: code,
    latitude: lat,
    longitude: lon
  });

  if (error) {
    throw error;
  }
}

// === Place and save current plant ===
async function confirmPlacement() {
  if (!currentPlantCode || !placedEntity) {
    alert("Chargez une plante d'abord.");
    return;
  }

  try {
    const coords = await getCurrentPosition();
    const { latitude, longitude } = coords;

    placedEntity.setAttribute('gps-entity-place', { latitude, longitude });
    placedEntity.removeAttribute('position');

    await savePlantPosition(currentPlantCode, latitude, longitude);
    alert("Plante enregistrée avec succès !");
  } catch (err) {
    alert("Erreur : " + err.message);
  }
}

// === Load previously saved plants from Supabase ===
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
      loadPlantModel(code);
    } else {
      alert("Code plante invalide (3 lettres).");
    }
  };

  document.getElementById('confirmPlacementBtn').onclick = confirmPlacement;

  loadPlacedPlants();
};
