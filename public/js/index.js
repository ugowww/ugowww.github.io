let userPosition = null;
let watchId = null;
let placedEntity = null;
let plant
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
async function getIconURL(plantId) {
  const { data, error } = await _supabase
    .storage
    .from('plants')
    .createSignedUrl(`${plantId}/thumb.jpeg`, 6000); // URL valide 6000 secondes

  if (error) {
    log("Erreur génération signed URL :", error);
    return null;
  }
  log(`Icone ${plantId}/${plantId} accessible à : ${data.signedUrl}`);
  return data.signedUrl;
}

async function getModelURL(plantId) {
  const { data, error } = await _supabase
    .storage
    .from('plants')
    .createSignedUrl(`${plantId}/model_00001_.glb`, 6000); // URL valide 6000 secondes

  if (error) {
    log("Erreur génération signed URL :", error);
    return null;
  }
  log(`Modèle ${plantId}/${plantId} accessible à : ${data.signedUrl}`);
  return data.signedUrl;
}

async function renderPlantsFromDatabase() {
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

  for (const plant of data) {
    if(plant.latitude === null || plant.longitude === null) continue; // Skip plants without GPS data
    const url = await getModelURL(plant.id);
    if (!url) continue;

    const entity = document.createElement('a-entity-camera');
    entity.classList.add('rendered-plant-db');
    entity.setAttribute('scale', '1 1 1');
    entity.setAttribute('gps-new-entity-place', `latitude:${plant.latitude}; longitude:${plant.longitude}`);
    entity.setAttribute('gltf-model', url);
    document.querySelector('a-scene').appendChild(entity);
    log(`Plante ${plant.id} créée à ${plant.latitude}, ${plant.longitude}`);
  }
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
      timeout: 0
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

async function loadPlantModel(code) {

  //Get supabase request
  const { data, error } = await _supabase
    .from('Plants')
    .select('*')
    .eq('id', code)
    .single();

  if (error) {
    log("Erreur récupération plante :", error);
    return;
  }

  if (data.isSet) {
    log(`La plante ${code} a déjà été positionnée.`);
    return;
  }

  //Create a signed url for the model and its icon
  const url = await getModelURL(code);
  if (!url) return;
  const iconurl = await getIconURL(code)
  if(!iconurl) return;

  placedEntity = document.createElement('a-entity');
  placedEntity.setAttribute('gltf-model', url);
  placedEntity.setAttribute('position', { x: 1, y: 0, z: 0 });
  placedEntity.setAttribute('scale', { x: 1, y: 1, z: 1 });
  placedEntity.setAttribute('gps-new-entity-place', {
    latitude: userPosition.latitude,
    longitude: userPosition.longitude
  });
  document.querySelector("a-scene").appendChild(placedEntity);

  storedPlants.push({
    id: code, 
    latitude: userPosition.latitude,
    longitude: userPosition.longitude,
    isSet: false
  });

  //document.querySelector('a-scene').flushToDOM(true);
  const thumb = document.getElementById('plantThumb');
  thumb.src = iconurl;
  thumb.style.display = 'block';

  log(`Chargement du modèle pour la plante ${code} depuis ${url}`);
  currentPlantCode = code;
}

async function confirmPosition() {
  if (!userPosition || !_supabase || !storedPlants) {
    log("Position utilisateur, Supabase ou données plantes non disponibles");
    return;
  }

  index = storedPlants.findIndex(p => p.id === currentPlantCode)
  if (index === -1) {
    log(`Plante ${currentPlantCode} non trouvée dans storedPlants`);
    return;
  }

  if (storedPlants[index].isSet) {
    log(`La plante ${currentPlantCode} a déjà été positionnée.`);
    return;
  }

  // Met à jour dans Supabase
  const { error } = await _supabase
    .from('Plants')
    .update({
      latitude: userPosition.latitude,
      longitude: userPosition.longitude,
      isSet: true
    })
    .eq('id', currentPlantCode);

  if (error) {
    log("Erreur lors de la mise à jour de la plante :", error);
    return;
  }

  // Met à jour localement aussi
  storedPlants[index].latitude = userPosition.latitude;
  storedPlants[index].longitude = userPosition.longitude;
  storedPlants[index].isSet = true;

  log(`Plante ${currentPlantCode} positionnée à ${userPosition.latitude}, ${userPosition.longitude}`);
  document.getElementById('plantThumb').style.display = 'none';
  // Optionnel : re-render ou update
  renderPlant(storedPlants[index]);
}

async function renderPlant(plant){
    const url = await getModelURL(plant.id);
    if (!url) return;

    const entity = document.createElement('a-entity');
    entity.classList.add('rendered-plant-db');
    entity.setAttribute('scale', '1 1 1');
    entity.setAttribute('gps-new-entity-place', `latitude:${plant.latitude}; longitude:${plant.longitude}`);
    entity.setAttribute('gltf-model', url);
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
  renderPlantsFromDatabase();
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
