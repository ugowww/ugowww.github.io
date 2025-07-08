let userPosition = null;
let watchId = null;
let placedEntity = null;
let plant
let currentPlantCode = null;
let storedPlants = [];

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

  iterator = 0;
  for(plant in storedPlants){
    const option = document.createElement('option');
    option.value = iterator;
    option.textContent = iterator;
    document.getElementById('plantSelect').appendChild(option);
    iterator++;
  }
  log(`Plantes chargées depuis Supabase : ${storedPlants.length}`);
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

    const entity = document.createElement('a-entity');
    entity.classList.add('rendered-plant-db');
    entity.setAttribute('scale', '1 1 1');
    entity.setAttribute('position', '0 -1 0');
    entity.setAttribute('gps-new-entity-place', `latitude:${plant.latitude}; longitude:${plant.longitude}`);
    entity.setAttribute('gltf-model', url);
    document.querySelector('a-scene').appendChild(entity);
    log(`Plante ${plant.id} créée à ${plant.latitude}, ${plant.longitude}`);
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

/*   if (data.isSet) {
    log(`La plante ${code} a déjà été positionnée.`);
    return;
  } */

  //Create a signed url for the model and its icon
  const url = await getModelURL(code);
  if (!url) return;
  const iconurl = await getIconURL(code)
  if(!iconurl) return;

  
  placedEntity = document.createElement('a-entity');
  placedEntity.setAttribute('gltf-model', url);
  placedEntity.setAttribute('position', { x: 0, y: 0, z: 0 });
  placedEntity.setAttribute('scale', { x: 1, y: 1, z: 1 });
/*   placedEntity.setAttribute('gps-new-entity-place', {
    latitude: userPosition.latitude,
    longitude: userPosition.longitude
  }); */
  document.querySelector("a-marker").appendChild(placedEntity);
/* 
  storedPlants.push({
    id: code, 
    latitude: 0,
    longitude: 0,
    isSet: false
  }); */

  //document.querySelector('a-scene').flushToDOM(true);
  const thumb = document.getElementById('plantThumb');
  thumb.src = iconurl;
  thumb.style.display = 'block';

  log(`Chargement du modèle pour la plante ${code} depuis ${url}`);
  currentPlantCode = code;
}


// === INIT ===
window.onload = () => {

  loadFromSupabase();

  firstcall = true;
  document.getElementById('loadPlantBtn').onclick = () => {
    const code = document.getElementById('plantSelect').value.trim().toUpperCase();
    if(!firstcall){
      document.querySelector("a-entity").remove();
    }
    if (!code){
      log("Veuillez entrer un code de plante valide (3 chiffres).");
      return;
    }
    loadPlantModel(code);
    firstcall = false;
  };
};
