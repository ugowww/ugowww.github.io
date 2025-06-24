import * as THREEx from 'three';

document.addEventListener("DOMContentLoaded", () => {
    let testEntityAdded = false;

    const camera = document.querySelector("[camera]");

    camera.addEventListener("gps-camera-update-position", e => {
        if (!testEntityAdded) {
            alert(`Got first GPS position: lon ${e.detail.position.longitude} lat ${e.detail.position.latitude}`);
            console.log(`Got first GPS position: lon ${e.detail.position.longitude} lat ${e.detail.position.latitude}`);

            // Create a red box as test marker
            const box = document.createElement("a-box");
            box.setAttribute("scale", "20 20 20");
            box.setAttribute("material", "color: red");
            box.setAttribute("gps-new-entity-place", {
                latitude: e.detail.position.latitude + 0.001,
                longitude: e.detail.position.longitude
            });
            document.querySelector("a-scene").appendChild(box);

            testEntityAdded = true;
        }
    });
});

function positionPlant() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            alert(`Current location: Latitude: ${latitude}, Longitude: ${longitude}`);

            // Create phoenix model entity
            const phoenixEntity = document.createElement("a-entity");
            phoenixEntity.setAttribute("gps-new-entity-place", {
                latitude: latitude,
                longitude: longitude
            });
            phoenixEntity.setAttribute("gltf-model", "#phoenix");
            phoenixEntity.setAttribute("scale", "0.05 0.05 0.05");

            document.querySelector("a-scene").appendChild(phoenixEntity);
        }, error => {
            console.error("Error getting location:", error);
            alert("Unable to retrieve your location.");
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}
