let userPosition = null;
let watchId = null;
let placedEntity = null;
let currentPlantCode = null;
let storedPlants = [];
const alldRenderedPlantDb = []
let plantsInitialized = false;
let loadPromises = [];

const SUPABASE_URL = 'https://ksgrrlzmervlrpdjtprg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZ3JybHptZXJ2bHJwZGp0cHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3NTIwNzUsImV4cCI6MjA2NjMyODA3NX0._d8aSPBnQzNA08zuRzE4GAHLpu-wm7BcLixnqK9RgZg';
const { createClient } = supabase;
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
log('Supabase Instance: ', _supabase)

function log(msg) {
  const panel = document.getElementById('log-panel');
  if (panel) {
    panel.textContent += msg + '\n';
    panel.scrollTop = panel.scrollHeight;
  }
  console.log(msg);
}

async function loadFromSupabase() {

  let { data: Plants, error } = await _supabase
    .from('Plants')
    .select('*')

  if (error) {
    log("Erreur chargement depuis Supabase :", error);
    return;
  }
  storedPlants = Plants;
}

async function getModelURL(folder, filename) {
  const { data, error } = await _supabase
    .storage
    .from('plants')
    .createSignedUrl(`${folder}/${filename}`, 6000); // URL valide 6000 secondes

  if (error) {
    log("Erreur génération signed URL :", error);
    return null;
  }
  log(`Modèle ${folder}/${filename} accessible à : ${data.signedUrl}`);
  return data.signedUrl;
}

async function renderPlantsFromDatabase() {
  // Si déjà initialisé, update position
  if (plantsInitialized) {
    //log("Plantes déjà initialisées, mise à jour des positions uniquement.");
    //updateModelPositions(userPosition);
    return;
  }

  if (!_supabase) {
    log("Supabase n'est pas initialisé !");
    return;
  }

  const { data, error } = await _supabase
    .from('Plants')
    .select('*');

  if (error) {
    log("Erreur lors du chargement des plantes :", error);
    return;
  }

  log(`Plantes chargées depuis Supabase : ${data.length}`);

  //loadPromises = [];

  for (const plant of data) {
    const url = await getModelURL(plant.id, `${plant.id}.glb`);
    if (!url) continue;

    const entity = document.createElement('a-entity');
    entity.classList.add('rendered-plant-db');
    entity.setAttribute('scale', '1 1 1');
    entity.setAttribute('gps-new-entity-place', `latitude:${plant.latitude}; longitude:${plant.longitude}`);
    entity.setAttribute('gltf-model', url);
    //entity.dataset.id = plant.id;
    //entity.dataset.lat = plant.latitude;
    //entity.dataset.lon = plant.longitude;

/*     const loadedPromise = new Promise(resolve => {
      entity.addEventListener('model-loaded', () => {
        log(`Modèle ${plant.id} chargé`);
        resolve();
      });
    });
 */
    //loadPromises.push(loadedPromise);
    document.querySelector('a-scene').appendChild(entity);
    log(`Plante ${plant.id} créée à ${plant.latitude}, ${plant.longitude}`);
  }

/*   await Promise.all(loadPromises);
  plantsInitialized = true;
  log("Tous les modèles sont chargés. Mise à jour des positions..."); */
  //updateModelPositions(userPosition);
}


function startTrackingPosition() {
  if (!navigator.geolocation) {
    //alert("Géolocalisation non supportée.");
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    pos => {
      userPosition = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      };
      updatePositionDisplay();
    },
    err => {
      log("Erreur GPS :", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 5000
    }
  );
}

function updatePositionDisplay() {
  const el = document.getElementById('positionDisplay');
  if (!userPosition) {
    el.innerText = "GPS: en attente...";
  } else {
    el.innerText = `GPS:\nLat: ${userPosition.latitude.toFixed(5)}\nLon: ${userPosition.longitude.toFixed(5)}`;
    log(`Position actuelle: ${userPosition.latitude}, ${userPosition.longitude}`);
  }
}

function loadPlantModel(code) {
  modelPath = `models/${code}/${code}.glb`;
  scalepos = "1 1 1"
  placedEntity = document.createElement('a-entity');
  placedEntity.setAttribute('gltf-model', modelPath);
  placedEntity.setAttribute('position', { x: 0, y: 0, z: 0 });
  placedEntity.setAttribute('scale', { x: 1, y: 1, z: 1 });
  placedEntity.setAttribute('gps-new-entity-place', {
    latitude: userPosition.latitude,
    longitude: userPosition.longitude
  });
  document.querySelector("a-scene").appendChild(placedEntity);
  //document.querySelector('a-scene').flushToDOM(true);
  const thumb = document.getElementById('plantThumb');
  thumb.src = `models/${code}/thumb.jpg`;
  thumb.style.display = 'block';

  log(`Chargement du modèle pour la plante ${code} depuis ${modelPath}`);
  currentPlantCode = code;
}

function setPositionPlant(lat, lon) {
  if (!placedEntity) return;
  placedEntity.setAttribute('gps-new-entity-place', { latitude: lat, longitude: lon });
}

async function confirmPosition() {
  if (!userPosition || !currentPlantCode) {
    //alert("Chargez une plante et attendez la position.");
    return;
  }

  const newPlant = {
    id: currentPlantCode,
    latitude: userPosition.latitude,
    longitude: userPosition.longitude
  };

  setPositionPlant(userPosition.latitude, userPosition.longitude);

  const { data, error } = await _supabase
    .from('Plants')
    .upsert([
      {
        id: newPlant.id,
        latitude: newPlant.latitude,
        longitude: newPlant.longitude
      }
    ], {
      onConflict: 'id'
    })
    .select();

  if (error) {
    log("Erreur lors de l'enregistrement Supabase.");
    log(error);
    return;
  }

  storedPlants.push(newPlant);


  //alert("Plante enregistrée localement.");
  log("Plante enregistrée :", newPlant.id);
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // m
  const toRad = x => x * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* function updateModelPositions(userPos) {
  const plantEntities = document.querySelectorAll('.rendered-plant-db');
  for (const plantEntity of plantEntities) {
    log(plantEntity?.dataset?.id)
    log(plantEntity?.dataset?.lat)
    log(plantEntity?.dataset?.lon)
    const dist = haversine(userPos.latitude, userPos.longitude, plantEntity?.dataset?.lat, plantEntity?.dataset?.lon);
    plantEntity.setAttribute('gps-new-entity-place', {
        latitude: plantEntity?.dataset?.lat,
        longitude: plantEntity?.dataset?.lon
      });
    if (dist < 200) {
      plantEntity.setAttribute('visible', 'true'); // SHOW IF CLOSE ENOUGH
    } else {
      plantEntity.setAttribute('visible', 'false'); // HIDE IF TOO FAR
    }
  }
} */

// === INIT ===
window.onload = () => {

  loadFromSupabase()
  rendered = false;
  const el = document.querySelector("[gps-new-camera]");
  el.addEventListener("gps-camera-update-position", async(e) => {
    userPosition = {
      latitude: e.detail.position.latitude,
      longitude: e.detail.position.longitude
    };
    if(!rendered){
      renderPlantsFromDatabase();
      rendered = true;
    }
    
  });


  document.getElementById('loadPlantBtn').onclick = () => {
    const code = document.getElementById('plantCodeInput').value.trim().toUpperCase();
    loadPlantModel(code);
  };

  document.getElementById('confirmPlacementBtn').onclick = confirmPosition;
  startTrackingPosition();
};
