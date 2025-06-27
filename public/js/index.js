let userPosition = null;
let watchId = null;
let placedEntity = null;
let currentPlantCode = null;
let storedPlants = []; // JSON local [{ id, latitude, longitude }]

function getCurrentPositionOnce() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject("Géolocalisation non supportée.");
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true
    });
  });
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
      //renderPlants(); // Réactualise les plantes visibles
    },
    err => {
      console.error("Erreur GPS :", err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 5000
    }
  );
}

function stopTrackingPosition() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
}

function waitForGPSReady(callback) {
  const onGPSUpdate = (e) => {
    console.log('GPS ready at:', e.detail.position);
    document.removeEventListener('gps-camera-update-position', onGPSUpdate);
    callback(e.detail.position);
  };

  document.addEventListener('gps-camera-update-position', onGPSUpdate);
}

function updatePositionDisplay() {
  const el = document.getElementById('positionDisplay');
  if (!userPosition) {
    el.innerText = "GPS: en attente...";
  } else {
    el.innerText = `GPS:\nLat: ${userPosition.latitude.toFixed(5)}\nLon: ${userPosition.longitude.toFixed(5)}`;
    console.log(`Position actuelle: ${userPosition.latitude}, ${userPosition.longitude}`);
  }
}

function loadPlantModel(code) {
  modelPath = `models/${code}/${code}.glb`;

  placedEntity = document.createElement('a-entity');
  placedEntity.setAttribute('glb-model', modelPath);
  placedEntity.setAttribute('scale', { x: 1, y: 1, z: 1 });
  placedEntity.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
  placedEntity.setAttribute('id', 'placed-plant');
  placedEntity.setAttribute('gps-new-entity-place', {
                    latitude: userPosition.latitude +0.001,
                    longitude: userPosition.longitude
  });
  document.querySelector("a-scene").appendChild(placedEntity);

  const thumb = document.getElementById('plantThumb');
  thumb.src = `models/${code}/thumb.jpg`;
  thumb.style.display = 'block';

  console.log(`Chargement du modèle pour la plante ${code} depuis ${modelPath}`);
  currentPlantCode = code;
}

//function to load the batch of plants stored in the json file
function loadjson(){
  fetch('/models/pos.json')
    .then(response => response.json())
    .then(data => {
      storedPlants = data.plants || [];
      console.log(`Chargement des plantes depuis JSON : ${storedPlants.length} plantes chargées.`);
    }
    ).catch(error => {
      console.error("Erreur lors du chargement du fichier JSON :", error);
    });
}

function setPositionPlant(lat, lon) {
  if (!placedEntity) return;
  placedEntity.setAttribute('gps-new-entity-place', { latitude: lat, longitude: lon });
  placedEntity.removeAttribute('position');
}

function confirmPosition() {
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
  storedPlants.push(newPlant);

  //add the new plant to the local json file
  const jsonData = { plants: storedPlants };
  const jsonString = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = '/models/pos.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  //alert("Plante enregistrée localement.");
  console.log("Plante enregistrée :", newPlant);
}

function destroy(entity) {
  if (entity && entity.parentNode) {
    entity.parentNode.removeChild(entity);
  }
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

function renderPlants() {
  if (!userPosition) return;

  const scene = document.querySelector('a-scene');

  // Clean previous renders (except current placedEntity)
  document.querySelectorAll('.rendered-plant').forEach(e => e.remove());

  storedPlants.forEach(plant => {
    const dist = haversine(
      userPosition.latitude,
      userPosition.longitude,
      plant.latitude,
      plant.longitude
    );

    if (dist < 200) {
      const entity = document.createElement('a-entity');
      entity.setAttribute('gps-new-entity-place', {
        latitude: plant.latitude,
        longitude: plant.longitude
      });
      entity.setAttribute('glb-model', `models/${plant.id}/${plant.id}.glb`);
      entity.setAttribute('scale', '1 1 1');
      entity.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
      entity.classList.add('rendered-plant');
      scene.appendChild(entity);
    }
  });
}

// === Initialisation ===
window.onload = () => {

  loadjson();

  entityadded = false;
  const el = document.querySelector("[gps-new-camera]");
  el.addEventListener("gps-camera-update-position", async(e) => {
            if(entityadded) return; // Ne pas ajouter si déjà ajouté
            entityadded = true;
            //alert(`Got first GPS position: lon ${e.detail.position.longitude} lat ${e.detail.position.latitude}`);
            console.log(`Position GPS initiale: lon ${e.detail.position.longitude} lat ${e.detail.position.latitude}`);
            const entity = document.createElement("a-box");
            entity.setAttribute("scale", {
                x: 20, 
                y: 20,
                z: 20
            });
            entity.setAttribute('material', { color: 'red' } );
            entity.setAttribute('gps-new-entity-place', {
                latitude: e.detail.position.latitude + 0.001,
                longitude: e.detail.position.longitude +0.001
            });
            document.querySelector("a-scene").appendChild(entity);
            

            const placedEntity = document.createElement('a-entity');
            placedEntity.setAttribute('glb-model', 'models/AEP/AEP.glb');
            placedEntity.setAttribute('scale', { x: 1, y: 1, z: 1 });
            placedEntity.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
            placedEntity.setAttribute('id', 'placed-plant');
            placedEntity.setAttribute('gps-new-entity-place', {
                latitude: e.detail.position.latitude + 0.001,
                longitude: e.detail.position.longitude
            });
  document.querySelector("a-scene").appendChild(placedEntity);
  });




  document.getElementById('loadPlantBtn').onclick = () => {
    const code = document.getElementById('plantCodeInput').value.trim().toUpperCase();
      loadPlantModel(code);
  };

  document.getElementById('confirmPlacementBtn').onclick = confirmPosition;

  startTrackingPosition();
};
