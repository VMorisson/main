// interventionForm.js
import { computeDateTimeFromOffset, pixelsPerHourDay } from './dateHelpers.js';
import { DataManager } from './dataManager.js';
import { TimelineRenderer } from './timelineRenderer.js';
import { API_BASE } from "./dateHelpers.js";
import { nameToRowId, rowIdToName } from './configCalendar.js';


let ignoreNextClick = false; // en haut de ton fichier interventionForm.js
let selectedPosition = null;
let clickStartedInsideModal = false;



export function showInterventionForm(intervention) {
  const modal = document.getElementById("form-modal");
  if (!modal) return console.error("❌ Modal introuvable.");

  console.log("[Form] showInterventionForm appelé. Ouverture du formulaire.");
  ignoreNextClick = true;

  const titleEl = document.getElementById("form-title");
  const ticketEl = document.getElementById("form-ticketName");
  const clientEl = document.getElementById("form-clientName");
  const villeEl = document.getElementById("form-ville");
  const postalEl = document.getElementById("form-codePostal");
  const leftChk = document.getElementById("form-leftTrajet");
  const rightChk = document.getElementById("form-rightTrajet");
  const saveBtn = document.getElementById("form-save");
  const cancelBtn = document.getElementById("form-cancel");
  const laureaInput = document.getElementById("laurea-detail");
  const prestaInput = document.getElementById("presta-detail");
  const techCheckboxes = document.querySelectorAll(".tech-checkbox");

  [ticketEl, clientEl, villeEl].forEach(el => el.value = "");
  leftChk.checked = false;
  rightChk.checked = false;
  if (laureaInput) laureaInput.value = "";
  if (prestaInput) prestaInput.value = "";
  techCheckboxes.forEach(cb => cb.checked = false);

  if (!intervention) {
    titleEl.textContent = "Nouvelle intervention";
    modal.dataset.interventionId = "";

    const row = parseInt(modal.dataset.row, 10);
    const map = { 1: "Romain", 2: "Lucas", 3: "Rodrigue", 9: "LAUREA", 10: "LAUREA", 11: "PRESTA",12: "PRESTA", 13: "PRESTA", 14: "PRESTA", 15: "PRESTA", 16: "PRESTA", 17: "PRESTA", 18: "PRESTA", 19: "PRESTA", 20: "PRESTA" };
    const techToCheck = map[row] || (row >= 11 ? "PRESTA" : null);

    if (techToCheck) {
      const cb = document.querySelector(`.tech-checkbox[value="${techToCheck}"]`);
      if (cb) cb.checked = true;
      if (techToCheck === "LAUREA" && laureaInput) laureaInput.value = "";
      if (techToCheck === "PRESTA" && prestaInput) prestaInput.value = "";
    }

    const offsetX = parseInt(window.lastContextOffsetX || 0, 10);
    const dateDebut = window.computeDateTimeFromOffset(offsetX);
    if (!dateDebut || isNaN(dateDebut.getTime())) {
      console.error("❌ dateDebut est invalide :", dateDebut);
      return;
    }
    const dateFin = new Date(dateDebut.getTime() + 2 * 60 * 60 * 1000);
    modal.dataset.dateDebut = dateDebut.toISOString();
    modal.dataset.dateFin = dateFin.toISOString();
  } else {
    titleEl.textContent = "Modifier intervention";
    modal.dataset.interventionId = intervention._id || "";

    ticketEl.value = intervention.ticketName || "";
    clientEl.value = intervention.clientName || "";
    villeEl.value = intervention.ville || "";
    postalEl.value = intervention.codePostal || "";

    leftChk.checked = Array.isArray(intervention.trajets) && intervention.trajets.some(t => t.direction === "left");
    rightChk.checked = Array.isArray(intervention.trajets) && intervention.trajets.some(t => t.direction === "right");

    const techArray = Array.isArray(intervention.technician) ? intervention.technician : [];
    const namesArray = Array.isArray(intervention.technicianNames) ? intervention.technicianNames : [];

    if (techArray.length === 0 && Array.isArray(intervention.technicianRows)) {
      const rowMap = { 1: "Romain", 2: "Lucas", 3: "Rodrigue", 9: "LAUREA", 10: "LAUREA", 11: "PRESTA",12: "PRESTA", 13: "PRESTA", 14: "PRESTA", 15: "PRESTA", 16: "PRESTA", 17: "PRESTA", 18: "PRESTA", 19: "PRESTA", 20: "PRESTA" };
      intervention.technicianRows.forEach(row => {
        const fallback = rowMap[row] || (row >= 11 ? "PRESTA" : null);
        if (!fallback) return;
        const cb = document.querySelector(`.tech-checkbox[value="${fallback}"]`);
        if (cb) cb.checked = true;
        if (fallback === "LAUREA" && laureaInput) laureaInput.value = "(à compléter)";
        if (fallback === "PRESTA" && prestaInput) prestaInput.value = "(à compléter)";
      });
    } else {
      techArray.forEach((tech, i) => {
        const cb = document.querySelector(`.tech-checkbox[value="${tech}"]`);
        if (cb) cb.checked = true;
        if (tech === "LAUREA" && laureaInput) laureaInput.value = namesArray[i] || "";
        if (tech === "PRESTA" && prestaInput) prestaInput.value = namesArray[i] || "";
      });
    }

    if (Array.isArray(intervention.technicianRows) && intervention.technicianRows.length > 0) {
      modal.dataset.row = intervention.technicianRows[0];
    }

    modal.dataset.dateDebut = new Date(intervention.dateDebut).toISOString();
    modal.dataset.dateFin = new Date(intervention.dateFin).toISOString();
  }

  const villeDropdown = document.getElementById("ville-dropdown");
  const postalDropdown = document.getElementById("postal-dropdown");
  let villeAbortController = null;

  villeEl.addEventListener("input", async () => {
    const val = villeEl.value.trim();
    villeDropdown.style.display = "none";
    villeDropdown.innerHTML = "";

    if (val.length < 2) return;

    // Annule la requête précédente si elle est encore en cours
    if (villeAbortController) villeAbortController.abort();
    villeAbortController = new AbortController();

    try {
      const res = await fetch(`${API_BASE}/api/villes?q=${encodeURIComponent(val)}`, {
        signal: villeAbortController.signal
      });

      if (!res.ok) return;

      const suggestions = await res.json();
      suggestions.sort((a, b) => a.ville.localeCompare(b.ville, "fr", { numeric: true }));

      suggestions.forEach(item => {
        const div = document.createElement("div");
        div.textContent = `${item.ville} (${item.codePostal})`;
        div.addEventListener("click", () => {
          villeEl.value = item.ville;
          postalEl.value = item.codePostal;
          selectedPosition = {
            latitude: item.latitude,
            longitude: item.longitude
          };
          villeDropdown.style.display = "none";
        });
        villeDropdown.appendChild(div);
      });

      if (suggestions.length > 0) {
        const rect = villeEl.getBoundingClientRect();
        villeDropdown.style.top = `${rect.bottom + window.scrollY}px`;
        villeDropdown.style.left = `${rect.left + window.scrollX}px`;
        villeDropdown.style.width = `${rect.width}px`;
        villeDropdown.style.display = "block";
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("💥 Erreur fetch ville :", err);
      }
    }
  });

  let postalAbortController = null;
postalEl.addEventListener("input", async () => {
  const val = postalEl.value.trim();
  console.log("📥 [Input Code Postal] valeur entrée :", val);

  postalDropdown.style.display = "none";
  postalDropdown.innerHTML = "";

  if (val.length < 2) {
    console.log("⏹ [Input Code Postal] Moins de 2 caractères, abandon.");
    return;
  }

  if (postalAbortController) {
    console.log("🚫 [Input Code Postal] Abort précédente requête.");
    postalAbortController.abort();
  }

  postalAbortController = new AbortController();

  try {
    console.log("🌐 [Input Code Postal] Requête vers l'API...");
    const res = await fetch(`${API_BASE}/api/villes/by-code-postal?q=${encodeURIComponent(val)}`, {
      signal: postalAbortController.signal
    });
    

    if (!res.ok) {
      console.warn("❌ [Input Code Postal] Réponse non OK :", res.status);
      return;
    }

    const villes = await res.json();
    console.log("✅ [Input Code Postal] Résultats reçus :", villes);

    // Filtrer uniquement les codes postaux commençant par ce que l’utilisateur tape
    const matching = villes.filter(v => v.codePostal.toString().startsWith(val));
    console.log("🔍 [Input Code Postal] Correspondances CP :", matching);

    matching.sort((a, b) =>
      a.codePostal.toString().localeCompare(b.codePostal.toString(), "fr", { numeric: true })
    );

    matching.forEach(item => {
      const div = document.createElement("div");
      div.textContent = `${item.codePostal} – ${item.ville}`;
      div.addEventListener("click", () => {
        console.log("🖱️ [Click Suggestion CP]", item);
        postalEl.value = item.codePostal;
        villeEl.value = item.ville;
        selectedPosition = {
          latitude: item.latitude,
          longitude: item.longitude
        };
        postalDropdown.style.display = "none";
      });
      postalDropdown.appendChild(div);
    });

    if (matching.length > 0) {
      const rect = postalEl.getBoundingClientRect();
      postalDropdown.style.top = `${rect.bottom + window.scrollY}px`;
      postalDropdown.style.left = `${rect.left + window.scrollX}px`;
      postalDropdown.style.width = `${rect.width}px`;
      postalDropdown.style.display = "block";
      console.log("📦 [Dropdown CP] Affiché.");
    } else {
      console.log("🚫 [Dropdown CP] Aucune correspondance à afficher.");
    }

  } catch (err) {
    if (err.name === "AbortError") {
      console.log("⚠️ [Input Code Postal] Requête annulée.");
    } else {
      console.error("💥 [Input Code Postal] Erreur fetch :", err);
    }
  }
});

  
  

  saveBtn.onclick = async (e) => {
    e.preventDefault();
    await prepareInterventionFromForm();
  };

  cancelBtn.onclick = (e) => {
    e.preventDefault();
    const alertEl = document.querySelector(".form-alert");
    if (alertEl) alertEl.remove();
    modal.style.display = "none";
  };

  modal.style.display = "flex";
}




async function prepareInterventionFromForm() {
  const modal = document.getElementById("form-modal");
  if (!modal) return;

  const isEditing = !!modal.dataset.interventionId;
  const id = modal.dataset.interventionId || "";

  const ticketName = document.getElementById("form-ticketName")?.value.trim() || "";
  const clientName = document.getElementById("form-clientName")?.value.trim() || "";
  const ville = document.getElementById("form-ville")?.value.trim() || "";
  const codePostal = document.getElementById("form-codePostal")?.value.trim() || "";


  const leftChecked = document.getElementById("form-leftTrajet")?.checked;
  const rightChecked = document.getElementById("form-rightTrajet")?.checked;

  const laureaDetail = document.getElementById("laurea-detail")?.value.trim();
  const prestaDetail = document.getElementById("presta-detail")?.value.trim();

  const technician = [];
  const technicianNames = [];

  document.querySelectorAll(".tech-checkbox:checked").forEach(cb => {
    const value = cb.value;
    if (value === "LAUREA") {
      technician.push("LAUREA");
      technicianNames.push("LAUREA");
    } else if (value === "PRESTA") {
      technician.push("PRESTA");
      technicianNames.push("PRESTA");
    } else {
      technician.push(value);
      technicianNames.push(value);
    }
  });

  const technicianRows = technicianNames
    .map(name => nameToRowId[name])
    .filter(id => typeof id === "number");

  if (technician.length === 0 || technicianRows.length === 0) {
    alert("Veuillez sélectionner au moins un technicien valide.");
    return;
  }

  const rawDebut = modal.dataset.dateDebut;
  const rawFin = modal.dataset.dateFin;
  const dateDebut = rawDebut ? new Date(rawDebut) : null;
  const dateFin = rawFin ? new Date(rawFin) : null;

  if (!dateDebut || !dateFin || isNaN(dateDebut.getTime()) || isNaN(dateFin.getTime())) {
    alert("⛔ Erreur : les dates de l'intervention sont invalides.");
    console.error("❌ Dates invalides :", { rawDebut, rawFin });
    return;
  }

  const intervention = {
    _id: id || undefined,
    ticketName,
    clientName,
    ville,
    codePostal,
    dateDebut,
    dateFin,
    technician,
    technicianNames,
    technicianRows,
    trajets: []
  };

  if (leftChecked) intervention.trajets.push({ direction: "left", dureeTrajet: 3600000 });
  if (rightChecked) intervention.trajets.push({ direction: "right", dureeTrajet: 3600000 });
  if (selectedPosition && selectedPosition.latitude && selectedPosition.longitude) {
    intervention.latitude = selectedPosition.latitude;
    intervention.longitude = selectedPosition.longitude;
  }
  // Nettoyer message précédent
  const existingAlert = document.querySelector(".form-alert");
  if (existingAlert) existingAlert.remove();

  let conflictDetected = false;

  for (const rowId of technicianRows) {
    if (rowId >= 1 && rowId <= 8) {
      const testIntervention = { ...intervention, technicianRows: [rowId] };
      const result = window.timeline.checkForOverlap(dateDebut, dateFin, testIntervention);
      if (result.status === "conflict") {
        conflictDetected = true;
        break;
      }
    }
  }

  if (conflictDetected) {
    const form = document.getElementById("intervention-form");
    const alertDiv = document.createElement("div");
    alertDiv.className = "form-alert";
    alertDiv.textContent = "⚠️ Conflit : une intervention existe déjà à cette date pour ce technicien.";
    alertDiv.style.color = "red";
    alertDiv.style.marginTop = "10px";
    alertDiv.style.fontWeight = "bold";
    form.appendChild(alertDiv);
    return;
  }
  try {
    const saved = await window.dataManager.saveIntervention(intervention);
    if (saved) {
      window.dataManager.updateLocalIntervention(saved);
      window.timeline.updateSingleIntervention(saved);
      
      modal.style.display = "none";
    }
    const alertEl = document.querySelector(".form-alert");
    if (alertEl) alertEl.remove();
  } catch (err) {
    console.error("❌ Erreur durant la sauvegarde :", err);
  }
}








function addHoursToDate(baseDate, hours) {
  const copy = new Date(baseDate);
  copy.setHours(copy.getHours() + hours);
  return copy;
}
function setupFormModalActions() {

document.addEventListener("click", (event) => {
    console.log("[Global Click] event.target =", event.target);
    if (ignoreNextClick) {
    console.log("[Global Click] Ignoré le premier clic après ouverture du formulaire.");
    ignoreNextClick = false;
    return;
    }
});
}
document.addEventListener("mousedown", (e) => {
  const modalContent = document.querySelector(".modal-content");
  clickStartedInsideModal = modalContent && modalContent.contains(e.target);
});

document.addEventListener("mouseup", (e) => {
  const modal = document.getElementById("form-modal");
  const modalContent = document.querySelector(".modal-content");

  // Si le clic a commencé dehors ET terminé dehors, on ferme
  if (modal.style.display === "flex" && !modalContent.contains(e.target) && !clickStartedInsideModal) {
    console.log("[Global Click] Clic complet en dehors du formulaire -> Fermeture.");
    const alertEl = document.querySelector(".form-alert");
    if (alertEl) alertEl.remove();
    modal.style.display = "none";
  } else {
    console.log("[Global Click] Clic commencé ou terminé à l'intérieur -> Rien.");
  }

  // Reset le flag
  clickStartedInsideModal = false;
});




/**************************************************************************
  MENU CONTEXTUEL + FORMULAIRE MODAL
**************************************************************************/
window.lastContextOffsetX = 0;   // on stockera la coordonnée X en pixel
let lastTimelineContent = null; // on stockera l'élément .timeline-content

function waitForCalendar() {
const calendar = document.getElementById("calendar");
if (!calendar) {
    console.warn("⏳ #calendar pas prêt, réessai dans 50ms...");
    setTimeout(waitForCalendar, 50);
    return;
}

console.log("✅ #calendar prêt, ajout des écouteurs !");

calendar.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    window.lastContextTarget = e.target;
  
    const menu = document.getElementById("context-menu");
    if (!menu) {
    console.error("❌ Pas trouvé #context-menu dans interventions.html !");
    return;
    }

    const interEl = e.target.closest(".intervention");
    lastTimelineContent = e.target.closest(".timeline-content"); 


    if (lastTimelineContent) {
      const rect = lastTimelineContent.getBoundingClientRect();
      const offsetX = e.clientX - rect.left + lastTimelineContent.scrollLeft;
      window.lastContextOffsetX = offsetX;
      window.lastContextDate = window.computeDateTimeFromOffset(offsetX); // ✅ NEW
      console.log(`[Click] Date cliquée calculée via offsetX=${offsetX} →`, window.lastContextDate);
    } else {
      window.lastContextOffsetX = 0;
      window.lastContextDate = new Date(); // au pif, mais bon
    }

    if (interEl) {
    menu.dataset.interventionId = interEl.dataset.id || "";
    
    document.getElementById("menu-add").style.display = "none";
    document.getElementById("menu-show").style.display = "block";
    document.getElementById("menu-delete").style.display = "block";
    document.getElementById("menu-toggle-aller").style.display = "block";
    document.getElementById("menu-toggle-retour").style.display = "block";
    document.getElementById("menu-divider").style.display = "block";
    // ➡️ Changer le texte selon les trajets existants
    const intervId = interEl.dataset.id;
    const intervention = window.dataManager.interventions.find(i => i._id === intervId);

    if (intervention) {
        const hasAller = intervention.trajets?.some(t => t.direction === "left");
        const hasRetour = intervention.trajets?.some(t => t.direction === "right");

        document.getElementById("menu-toggle-aller").textContent = hasAller
        ? "❌ Supprimer Trajet Aller"
        : "⬅ Ajouter Trajet Aller";

        document.getElementById("menu-toggle-retour").textContent = hasRetour
        ? "❌ Supprimer Trajet Retour"
        : "Ajouter Trajet Retour ➡";
    }
    } else {
    menu.dataset.interventionId = "";
    
    document.getElementById("menu-add").style.display = "block";
    document.getElementById("menu-show").style.display = "none";
    document.getElementById("menu-delete").style.display = "none";
    document.getElementById("menu-toggle-aller").style.display = "none";
    document.getElementById("menu-toggle-retour").style.display = "none";
    document.getElementById("menu-divider").style.display = "none";
    }
      

    menu.style.left = e.pageX + "px";
    menu.style.top = e.pageY + "px";
    menu.style.display = "block";
});

// Cacher menu au clic ailleurs
document.addEventListener("click", () => {
    const menu = document.getElementById("context-menu");
    if (menu) menu.style.display = "none";
});
}
waitForCalendar();


function setupContextMenuActions() {
    const menuAdd  = document.getElementById("menu-add");
    const menuShow = document.getElementById("menu-show");
    const menuDelete = document.getElementById("menu-delete");
    const menuToggleAller = document.getElementById("menu-toggle-aller");
    const menuToggleRetour = document.getElementById("menu-toggle-retour");

    if (menuAdd) {
      menuAdd.addEventListener("click", (e) => {
        // window.lastContextTarget = e.target;
        const menu = document.getElementById("context-menu");
        const modal = document.getElementById("form-modal");
    
        // Récupération de la ligne cliquée
        const technicianRow = window.lastContextTarget?.closest(".technician-row");
    
        if (technicianRow && technicianRow.dataset.row) {
          modal.dataset.row = technicianRow.dataset.row;
          console.log(`[Form] ✅ Ligne technicien détectée : ${modal.dataset.row}`);
        } else {
          console.warn("[Form] ❌ Impossible de déterminer la ligne technicien !");
        }
        
    
        menu.style.display = "none";
        showInterventionForm(null);
      });
    }
    
    

    if (menuShow) {
    menuShow.addEventListener("click", () => {
        const menu = document.getElementById("context-menu");
        menu.style.display = "none";
        const intervId = menu.dataset.interventionId;
        if (!intervId) return;
        const found = window.dataManager.interventions.find(i => i._id === intervId);
        if (found) showInterventionForm(found);
    });
    }

    if (menuDelete) {
    menuDelete.addEventListener("click", async () => {
        const menu = document.getElementById("context-menu");
        menu.style.display = "none";
        const intervId = menu.dataset.interventionId;
        if (!intervId) return;
        const found = window.dataManager.interventions.find(i => i._id === intervId);
        if (!found) return;
        try {
        await window.dataManager.deleteIntervention(found);
        window.timeline.renderAllInterventions();
        } catch (err) {
        console.error("Erreur suppression:", err);
        }
    });
    }

    if (menuToggleAller) {
    menuToggleAller.addEventListener("click", async () => {
        await toggleTrajet("left");
    });
    }

    if (menuToggleRetour) {
    menuToggleRetour.addEventListener("click", async () => {
        await toggleTrajet("right");
    });
    }
}
function setupDoubleClickOnIntervention() {
    const calendar = document.getElementById("calendar");
    if (!calendar) {
      console.warn("[setupDoubleClickOnIntervention] Aucun calendrier trouvé !");
      return;
    }
  
    calendar.addEventListener("dblclick", (e) => {
      const interEl = e.target.closest(".intervention");
      if (!interEl) return;
      
  
      console.log("[DoubleClic] Intervention détectée :", interEl.dataset.id);
  
      const intervention = window.dataManager.interventions.find(i => i._id === interEl.dataset.id);
      if (intervention) {
        showInterventionForm(intervention);
        ignoreNextClick = false;
      }
    });
  } 
async function toggleTrajet(direction) {
    const menu = document.getElementById("context-menu");
    menu.style.display = "none";
  
    const id = menu.dataset.interventionId;
    const found = window.dataManager.interventions.find(i => i._id === id);
    if (!found) return;
  
    const interv = { ...found, trajets: [...(found.trajets || [])] };
    const hasDirection = interv.trajets.some(t => t.direction === direction);
  
    if (hasDirection) {
      // Supprimer le trajet existant
      interv.trajets = interv.trajets.filter(t => t.direction !== direction);
    } else {
      // Ajouter un nouveau trajet
      const refDate = direction === "left" ? interv.dateDebut : interv.dateFin;
      const start = direction === "left" ? addHoursToDate(refDate, -1) : refDate;
      const end = direction === "left" ? refDate : addHoursToDate(refDate, 1);
  
      interv.trajets.push({
        direction,
        dateDebut: start,
        dateFin: end,
        type: "voiture",
        dureeTrajet: end.getTime() - start.getTime()
      });
    }
  
    try {
      const saved = await window.dataManager.saveIntervention(interv);
      if (saved) {
        window.dataManager.updateLocalIntervention(saved);
        window.timeline.updateSingleIntervention(saved);
      }
    } catch (err) {
      console.error("Erreur lors du toggle du trajet:", err);
    }
  }
  

export { waitForCalendar, setupFormModalActions, setupContextMenuActions, setupDoubleClickOnIntervention };