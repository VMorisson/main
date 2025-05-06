// mapRenderer.js
// Génère une carte centrée sur la France avec une grille et des utilitaires
// Prérequis :
//   npm install leaflet leaflet-graticule leaflet-control-geocoder
//   inclure CSS Leaflet et leaflet-control-geocoder dans ton HTML

import L from 'leaflet';
import 'leaflet-graticule';
import 'leaflet-control-geocoder';

/**
 * Initialise la carte dans l'élément donné.
 * @param {string} elementId - id de la div où créer la carte
 * @returns {{ map: L.Map, latLngToOffset: Function, offsetToLatLng: Function, addInterventionsMarkers: Function }}
 */
export function initMap(elementId = 'map') {
  // Centre approximatif de la France métropolitaine
  const franceCenter = [46.5, 2.0];
  const zoomLevel    = 5;

  // Création de la carte
  const map = L.map(elementId, {
    center: franceCenter,
    zoom: zoomLevel,
    minZoom: 4,
    maxZoom: 10
  });

  // Couche OpenStreetMap
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  // Ajout d'une grille (graticule) tous les 1°
  L.graticule({
    interval: 1,
    style: { color: '#444', weight: 1, opacity: 0.3 },
    showLabel: true
  }).addTo(map);

  // Geocoder Nominatim (via leaflet-control-geocoder)
  const geocoder = L.Control.Geocoder.nominatim();

  // Fonctions de conversion lat/lng ↔ offset (pixels)
  function latLngToOffset(lat, lng) {
    const point = map.latLngToLayerPoint([lat, lng]);
    return { x: point.x, y: point.y };
  }
  function offsetToLatLng(x, y) {
    const latlng = map.layerPointToLatLng([x, y]);
    return { lat: latlng.lat, lng: latlng.lng };
  }

  /**
   * Geocode un code postal + pays en coordonnées {center, name}
   * @param {string} postcode
   * @param {string} country
   * @returns {Promise<{center: L.LatLng, name: string}>}
   */
  function geocodePostcode(postcode, country) {
    return new Promise(resolve => {
      const query = country
        ? `${postcode}, ${country}`
        : postcode;
      geocoder.geocode(query, results => {
        if (results && results.length) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Place des marqueurs pour chaque intervention (champ codePostal & pays)
   * @param {Array<{ codePostal: string, pays?: string, popupContent?: string }>} interventions
   * @param {string} defaultCountry - pays par défaut si non spécifié
   */
  async function addInterventionsMarkers(interventions, defaultCountry = 'France') {
    for (const interv of interventions) {
      const cp      = interv.codePostal;
      const country = interv.pays || defaultCountry;
      const geo     = await geocodePostcode(cp, country);
      if (geo) {
        const marker = L.marker(geo.center).addTo(map);
        const popup  = interv.popupContent || `${cp} – ${country}`;
        marker.bindPopup(popup);
      } else {
        console.warn(`Échec géocodage ${cp}, ${country}`);
      }
    }
  }

  return { map, latLngToOffset, offsetToLatLng, addInterventionsMarkers };
}
