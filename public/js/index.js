let currentPlantCode = null;
let placedEntity = null;

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
      reject(new Error("La géolocalisation n'est pas supportée par ce navigateur."));
    }
  });
}

// Charger la plante et l'afficher devant la caméra
async function loadPlant(code) {
  try {
    const res = await fetch(`/api/get-plant/${code}`);
    if (!res.ok) throw new Error('Plante non trouvée');
    const data = await res.json();

    currentPlantCode = code.toUpperCase();

    // Supprime l'entité précédente
    if (placedEntity) {
      placedEntity.remove();
      placedEntity = null;
    }

    const scene = document.querySelector('a-scene');
    placedEntity = document.createElement('a-entity');

    // Correction ici : gltf-model (et non glb-model)
    placedEntity.setAttribute('gltf-model', data.modelUrl);
    placedEntity.setAttribute('scale', '1 1 1');
    placedEntity.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
    placedEntity.setAttribute('id', 'placed-plant');

    // ✅ Ajoute position temporaire devant la caméra
    placedEntity.setAttribute('position', '0 0 -3');

    scene.appendChild(placedEntity);

  } catch (err) {
    alert(err.message);
  }
}

async function confirmPlacement() {
  if (!currentPlantCode || !placedEntity) {
    alert("Aucune plante chargée.");
    return;
  }

  try {
    const coords = await getCurrentPosition();
    //showPositionAlert(coords.latitude, coords.longitude);

    // Enlève la position relative
    placedEntity.removeAttribute('position');

    // Ajoute la position GPS réelle
    placedEntity.setAttribute('gps-entity-place', {
      latitude: coords.latitude,
      longitude: coords.longitude
    });

    // Enregistre côté serveur
    const res = await fetch(`/api/save-position/${currentPlantCode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: coords.latitude,
        longitude: coords.longitude
      })
    });

    const data = await res.json();
    if (data.success) {
      alert("Plante positionnée et enregistrée !");
    } else {
      alert("Erreur lors de l'enregistrement : " + (data.error || ''));
    }

  } catch (err) {
    alert("Erreur GPS ou réseau : " + err.message);
  }
}

async function loadPlacedPlants() {
  try {
    const res = await fetch('/api/get-all-positions');
    if (!res.ok) throw new Error("Impossible de charger les plantes placées.");
    const plants = await res.json();

    const scene = document.querySelector('a-scene');
    plants.forEach(({ code, latitude, longitude }) => {
      const plant = document.createElement('a-entity');
      plant.setAttribute('gps-entity-place', {
        latitude,
        longitude
      });
      plant.setAttribute('gltf-model', `../models/${code}/${code}.glb`);
      plant.setAttribute('scale', '1 1 1');
      plant.setAttribute('gesture-handler', 'minScale: 0.5; maxScale: 5');
      scene.appendChild(plant);
    });
  } catch (err) {
    console.error(err);
  }
}

window.onload = () => {
  document.getElementById('loadPlantBtn').onclick = () => {
    const code = document.getElementById('plantCodeInput').value.trim().toUpperCase();
    if (code.length === 3) {
      loadPlant(code);
    } else {
      alert("Entrez un code de plante valide (3 lettres).");
    }
  };

  document.getElementById('confirmPlacementBtn').onclick = confirmPlacement;

  loadPlacedPlants();
};
