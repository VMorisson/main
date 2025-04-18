// timelineRenderer.js

// 1) On importe isWeekend (si nécessaire) depuis dateHelpers.js
import { isWeekend, dayStart, dayEnd, pixelsPerHourDay, nightWidth, weekendWidth } from './dateHelpers.js';
import interact from "https://cdn.jsdelivr.net/npm/interactjs/dist/interact.min.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { auth, db } from "../config/firebaseConfig.js"; // ajustez selon votre config
/* =========================================================
   REPRISE EXACTE DES TROIS FONCTIONS D'ORIGINE
   (on ne les modifie pas)
========================================================= */

/**
 * Fonction generateHeader(), telle que dans ton snippet
 */
function generateHeader(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth) {
  const hourContainer = document.getElementById("header-timeline");
  const dayContainer = document.getElementById("day-labels");
  hourContainer.innerHTML = "";
  dayContainer.innerHTML = "";
  window.heuresMap = [];
  window.tempsMap = new Map();

  let totalWidth = 0;
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let date = new Date(window.calendarStart);
  
  while (date <= window.calendarEnd) {
    const jourStart = totalWidth;
    const isPast = date < todayDateOnly;
    const dayClass = isPast ? "day-block past-day" : "day-block";
    
    if (isWeekend(date)) {
      hourContainer.insertAdjacentHTML("beforeend",
        `<div class='hour-block weekend-block' style='left:${totalWidth}px; width:${weekendWidth}px;'>
            Weekend
         </div>`
      );
      window.heuresMap.push({ type: "weekend", start: totalWidth, end: totalWidth + weekendWidth, date: new Date(date) });
      totalWidth += weekendWidth;
    } else {
      for (let h = dayStart; h < dayEnd; h++) {
        const blockStart = totalWidth;
        if (h % 2 === 0) {
          hourContainer.insertAdjacentHTML("beforeend",
            `<div class='hour-block' style='left:${blockStart}px; width:${pixelsPerHourDay}px;'>
                ${h}h
             </div>`
          );
        } else {
          hourContainer.insertAdjacentHTML("beforeend",
            `<div class='hour-block invisible-block' style='left:${blockStart}px; width:${pixelsPerHourDay}px;'></div>`
          );
        }
        window.heuresMap.push({ type: "hour", heure: h, start: blockStart, end: blockStart + pixelsPerHourDay, date: new Date(date) });
        totalWidth += pixelsPerHourDay;
      }
      hourContainer.insertAdjacentHTML("beforeend",
        `<div class='hour-block night-block' style='left:${totalWidth}px; width:${nightWidth}px; text-align:center;'>
            Nuit
         </div>`
      );
      window.heuresMap.push({ type: "night", start: totalWidth, end: totalWidth + nightWidth, date: new Date(date) });
      totalWidth += nightWidth;
    }
    
    const jourWidth = totalWidth - jourStart;
    const labelJour = date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
    dayContainer.insertAdjacentHTML("beforeend",
      `<div class='${dayClass}' style='left:${jourStart}px; width:${jourWidth}px;'>
          ${labelJour}
       </div>`
    );
    date.setDate(date.getDate() + 1);
  }
  hourContainer.style.width = totalWidth + "px";
  dayContainer.style.width = totalWidth + "px";
  return totalWidth;
}



/**
 * Fonction addStartOfDayLines(), telle que dans ton snippet
 */
function addStartOfDayLines() {
  // Récupération des conteneurs des headers
  const hourHeader = document.getElementById("header-timeline");
  const dayHeader = document.getElementById("day-labels");
  if (!hourHeader || !dayHeader) return;
  
  // Supprimer d'éventuelles lignes "start-of-day" existantes
  hourHeader.querySelectorAll(".hour-line.start-of-day").forEach(el => el.remove());
  dayHeader.querySelectorAll(".hour-line.start-of-day").forEach(el => el.remove());
  
  // Utilisation d'un Set pour éviter les doublons
  const addedLines = new Set();
  
  // Parcourir l'array des segments générés dans generateHeader (window.heuresMap)
  window.heuresMap.forEach(segment => {
    // On ajoute une ligne start-of-day pour les segments classiques commençant à dayStart
    // ou pour les segments weekend
    if ((((segment.type === "hour" && segment.heure === dayStart)) || segment.type === "weekend") && !addedLines.has(segment.start)) {
      const lineHTML = `<div class="hour-line start-of-day" style="left:${segment.start}px;"></div>`;
      hourHeader.insertAdjacentHTML("beforeend", lineHTML);
      dayHeader.insertAdjacentHTML("beforeend", lineHTML);
      addedLines.add(segment.start);
    }
  });
}

/**
 * Fonction generateTechnicianLines(totalWidth), telle que dans ton snippet
 */
function generateTechnicianLines(totalWidth) {
  document.querySelectorAll("#calendar .technician-row .timeline-content").forEach(timeline => {
    timeline.innerHTML = "";
    timeline.style.position = "relative";
    timeline.style.width = totalWidth + "px";
    timeline.style.overflow = "hidden";
    
    const bg = document.createElement("div");
    bg.className = "timeline-background";
    bg.style.width = totalWidth + "px";
    bg.style.height = "100%";
    bg.style.position = "absolute";
    bg.style.top = "0";
    bg.style.left = "0";
    timeline.appendChild(bg);
    
    const addedLines = new Set();
    window.heuresMap.forEach(segment => {
      if (segment.type === "weekend" && !addedLines.has(segment.start)) {
        const overlay = document.createElement("div");
        overlay.className = "weekend-overlay";
        overlay.style.left = segment.start + "px";
        overlay.style.width = (segment.end - segment.start) + "px";
        timeline.appendChild(overlay);
        const line = document.createElement("div");
        line.className = "hour-line start-of-day";
        line.style.left = segment.start + "px";
        timeline.appendChild(line);
        addedLines.add(segment.start);
      }
      if (segment.type === "night") {
        const overlay = document.createElement("div");
        overlay.className = "night-overlay";
        overlay.style.left = segment.start + "px";
        overlay.style.width = (segment.end - segment.start) + "px";
        timeline.appendChild(overlay);
      }
      if (segment.type === "hour") {
        const hourLine = document.createElement("div");
        hourLine.className = "hour-line";
        hourLine.style.left = segment.end + "px";
        timeline.appendChild(hourLine);
        if (segment.heure === dayStart && !addedLines.has(segment.start)) {
          const bigLine = document.createElement("div");
          bigLine.className = "hour-line start-of-day";
          bigLine.style.left = segment.start + "px";
          timeline.appendChild(bigLine);
          addedLines.add(segment.start);
        }
      }
    });
  });
}



/* =========================================================
   CLASSE TimelineRenderer
   - Elle va appeler ces 3 fonctions dans initCalendar(start, end).
========================================================= */
export class TimelineRenderer {
  constructor(dataManager) {
    this.dataManager = dataManager;
  }
  // Méthode qui attend que l'utilisateur soit authentifié et que window.user soit défini
  async waitForAuth() {
    return new Promise((resolve, reject) => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          console.warn("Aucun utilisateur connecté.");
          reject("User not connected");
          return;
        }
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (!userDocSnap.exists()) {
          console.warn("Utilisateur non trouvé dans Firestore.");
          reject("User not found");
          return;
        }
        const userData = userDocSnap.data();
        // Vous pouvez normaliser le champ si besoin
        userData.modifierIntervention = (userData.modifierIntervention === true || userData.modifierIntervention === "true");
        window.user = userData;
        console.log("User authenticated, window.user =", window.user);
        resolve();
      });
    });
  }
  async initCalendarWithAuth(start, end) {
    try {
      // Attendre que l'utilisateur soit authentifié (window.user défini)
      await this.waitForAuth();
      // Ensuite, appeler l'initialisation du calendrier
      await this.initCalendar(start, end);
    } catch(err) {
      console.error("Impossible d'initialiser le calendrier: ", err);
    }
  }
  async initCalendar(start, end) {
    window.calendarStart = start;
    window.calendarEnd   = end;
    const dWidth = (dayEnd - dayStart) * pixelsPerHourDay;
    const totalWidth = generateHeader(
      dayStart,
      dayEnd,
      pixelsPerHourDay,
      dWidth,
      nightWidth,
      weekendWidth
    );
    addStartOfDayLines();
    generateTechnicianLines(totalWidth);
    const expandRightZone = document.getElementById("expand-right-zone");
    if (expandRightZone) {
      expandRightZone.style.left = totalWidth + "px";
    }
    const expandLeftZone = document.getElementById("expand-left-zone");
    if (expandLeftZone) {
      expandLeftZone.style.left = "0px";
    }
  }


  getOffsetForDate(date) {
    if (typeof window.computeOffsetFromDateTime === 'function') {
      return window.computeOffsetFromDateTime(date);
    }
    console.warn("Fonction computeOffsetFromDateTime introuvable.");
    return 0;
  }
  


  setupDragResize(block, intervention) {
    const self = this;  // pour pouvoir appeler updateTrajets / updateTrajetsDOM
  
    interact(block).draggable({
      listeners: {
        start: (event) => {
          block.dataset.initialLeft = parseFloat(block.style.left) || 0;
          block.dataset.totalDx      = 0;
        },
        move: (event) => {
          // ——— calcul du newLeft comme avant ———
          const totalDx  = parseFloat(block.dataset.totalDx) + event.dx;
          block.dataset.totalDx = totalDx;
          const initialLeft = parseFloat(block.dataset.initialLeft) || 0;
          const newLeft     = Math.round((initialLeft + totalDx) / 15) * 15;
          const width       = parseFloat(block.style.width);
          if (newLeft < 0) return;
  
          // ——— application au DOM (intervention et frères) ———
          document
            .querySelectorAll(`.intervention[data-id="${intervention._id}"]`)
            .forEach(b => {
              b.style.left = `${newLeft}px`;
              b.style.width = `${width}px`;
            });
  
          // ——— mise à jour des dates de l'intervention ———
          const debut = computeDateTimeFromOffset(newLeft);
          const fin   = computeDateTimeFromOffset(newLeft + width);
          if (isNaN(debut) || isNaN(fin)) return;
          intervention.dateDebut = debut;
          intervention.dateFin   = fin;
          //trajet.dureeTrajet = newEnd.getTime() - newStart.getTime();
          // ——— recalcul et rendu *en temps réel* des trajets ———
          self.updateTrajets(intervention);
          self.updateTrajetsDOM(intervention);
        },
        end: () => {
          if (!intervention.dateDebut || !intervention.dateFin) return;
          window.dataManager
            .saveIntervention(intervention)
            .then(() => window.timeline.renderAllInterventions());
        }
      }
    });
  
    interact(block).resizable({
      edges: { left: true, right: true },
      listeners: {
        start(event) {
          block._initialResizeLeft  = parseFloat(block.style.left)  || 0;
          block._initialResizeWidth = parseFloat(block.style.width) || 0;
          block._resizeDeltaLeft    = 0;
          block._resizeDeltaWidth   = 0;
        },
        move(event) {
          // ——— accumulation des deltas ———
          block._resizeDeltaLeft  += event.deltaRect.left  || 0;
          block._resizeDeltaWidth += event.deltaRect.width || 0;
  
          // ——— calcul des valeurs alignées sur la grille ———
          let displayLeft  = block._initialResizeLeft;
          let displayWidth = block._initialResizeWidth;
          if (event.edges.left) {
            displayLeft  = Math.round((block._initialResizeLeft + block._resizeDeltaLeft) / 15) * 15;
            displayWidth = Math.round((block._initialResizeWidth - block._resizeDeltaLeft) / 15) * 15;
          }
          if (event.edges.right) {
            displayWidth = Math.round((block._initialResizeWidth + block._resizeDeltaWidth) / 15) * 15;
          }
          if (displayLeft < 0) {
            displayWidth += displayLeft;
            displayLeft = 0;
          }
  
          // ——— application au DOM (intervention et frères) ———
          document
            .querySelectorAll(`.intervention[data-id="${intervention._id}"]`)
            .forEach(b => {
              b.style.left  = `${displayLeft}px`;
              b.style.width = `${displayWidth}px`;
            });
  
          // ——— mise à jour des dates de l'intervention ———
          const debut = computeDateTimeFromOffset(displayLeft);
          const fin   = computeDateTimeFromOffset(displayLeft + displayWidth);
          if (isNaN(debut) || isNaN(fin)) return;
          intervention.dateDebut = debut;
          intervention.dateFin   = fin;
  
          // ——— recalcul et rendu *en temps réel* des trajets ———
          self.updateTrajets(intervention);
          self.updateTrajetsDOM(intervention);
        },
        end() {
          if (!intervention.dateDebut || !intervention.dateFin) return;
          window.dataManager
            .saveIntervention(intervention)
            .then(() => window.timeline.renderAllInterventions());
        }
      }
    });
  }
  
  setupDragResizeTrajet(trajetBlock, intervention, trajet) {
    const gridStep = 15;

    interact(trajetBlock).resizable({
      edges: trajet.direction === 'left' ? { left: true } : { right: true },
      listeners: {
        start(event) {
          trajetBlock._initialLeft  = parseFloat(trajetBlock.style.left)  || 0;
          trajetBlock._initialWidth = parseFloat(trajetBlock.style.width) || 0;
          trajetBlock._deltaLeft    = 0;
          trajetBlock._deltaWidth   = 0;
        },
        move(event) {
          trajetBlock._deltaLeft  += event.deltaRect.left  || 0;
          trajetBlock._deltaWidth += event.deltaRect.width || 0;

          let displayLeft  = trajetBlock._initialLeft;
          let displayWidth = trajetBlock._initialWidth;

          if (trajet.direction === 'left') {
            displayLeft  = Math.round((trajetBlock._initialLeft + trajetBlock._deltaLeft) / gridStep) * gridStep;
            displayWidth = Math.round((trajetBlock._initialWidth - trajetBlock._deltaLeft) / gridStep) * gridStep;
          } else {
            displayWidth = Math.round((trajetBlock._initialWidth + trajetBlock._deltaWidth) / gridStep) * gridStep;
          }

          if (displayLeft < 0) {
            displayWidth += displayLeft;
            displayLeft = 0;
          }

          // Mise à jour DOM
          document
            .querySelectorAll(`.trajet-block.trajet-${trajet.direction}[data-id="${intervention._id}"]`)
            .forEach(b => {
              b.style.left  = `${displayLeft}px`;
              b.style.width = `${displayWidth}px`;
            });

          // Mise à jour modèle : dateDebut, dateFin et dureeTrajet
          const newStart = computeDateTimeFromOffset(displayLeft);
          const newEnd   = computeDateTimeFromOffset(displayLeft + displayWidth);
          if (!isNaN(newStart) && !isNaN(newEnd)) {
            trajet.dateDebut   = newStart;
            trajet.dateFin     = newEnd;
            trajet.dureeTrajet = Math.round(displayWidth * 120000);
          }

          window.dataManager.saveIntervention(intervention);
        }
      }
    });
  }
  
  
  updateTrajets(intervention) {
    if (!Array.isArray(intervention.trajets)) return;
  
    const interDebut = new Date(intervention.dateDebut);
    const interFin   = new Date(intervention.dateFin);
  
    intervention.trajets = intervention.trajets.map(t => {
      const duration = t.dureeTrajet || 60*60*1000;
      let dateDebut, dateFin;
  
      if (t.direction === "left") {
        dateDebut = new Date(interDebut.getTime() - duration);
        dateFin   = new Date(interDebut);
      } else {
        dateDebut = new Date(interFin);
        dateFin   = new Date(interFin.getTime() + duration);
      }
  
      return { ...t, dateDebut, dateFin, dureeTrajet: duration };
    });
  }
   
  updateTrajetsDOM(intervention) {
    const interBlock = document.querySelector(`.intervention[data-id="${intervention._id}"]`);
    if (!interBlock) return;
    const interLeft  = parseFloat(interBlock.style.left);
    const interWidth = parseFloat(interBlock.style.width);
    const msPerHour  = 3600000;

    intervention.trajets.forEach(t => {
      // calcul pur à partir de dureeTrajet
      const width = (t.dureeTrajet / msPerHour) * pixelsPerHourDay;
      let left;
      if (t.direction === 'left') {
        left = interLeft - width;
      } else {
        left = interLeft + interWidth;
      }

      document
        .querySelectorAll(`.trajet-block.trajet-${t.direction}[data-id="${intervention._id}"]`)
        .forEach(b => {
          b.style.left  = `${left}px`;
          b.style.width = `${width}px`;
        });
    });
  }
  
  renderAllInterventions() {
    document.querySelectorAll("#calendar .timeline-content .intervention, #calendar .timeline-content .trajet-block")
      .forEach(el => el.remove());
  
    const interventions = window.dataManager.interventions;
    if (!interventions || interventions.length === 0) return;
  
    interventions.forEach(inter => {
      //this.updateTrajets(inter);
      const offsetStart = computeOffsetFromDateTime(new Date(inter.dateDebut));
      const offsetEnd = computeOffsetFromDateTime(new Date(inter.dateFin));
      const width = offsetEnd - offsetStart;
  
      inter.technicianRows.forEach(rowId => {
        const rowEl = document.querySelector(`#calendar .technician-row:nth-child(${rowId}) .timeline-content`);
        if (!rowEl) return;
  
        const interDiv = document.createElement("div");
        interDiv.className = "intervention";
        interDiv.dataset.id = inter._id;
        interDiv.style.position = "absolute";
        interDiv.style.left = `${offsetStart}px`;
        interDiv.style.width = `${width}px`;
        interDiv.innerHTML = `
          <div class="inst-line">${inter.ticketName || "Intervention"}</div>
          <div class="client-line">${inter.clientName || ""}</div>
          <div class="ville-line">${inter.ville || ""}</div>
        `;
        rowEl.appendChild(interDiv);
        this.setupDragResize(interDiv, inter);
  
        if (Array.isArray(inter.trajets)) {
          inter.trajets.forEach(t => {
            const trajetDiv = document.createElement("div");
            trajetDiv.className = `trajet-block trajet-${t.direction}`;
            trajetDiv.dataset.id = inter._id;
            trajetDiv.style.position = "absolute";

            const msPerHour = 3600000;
            const w = (t.dureeTrajet / msPerHour) * pixelsPerHourDay;
            let left;
            if (t.direction === 'left') {
              left = offsetStart - w;
            } else {
              left = offsetStart + width;
            }
            trajetDiv.style.left = `${left}px`;
            trajetDiv.style.width = `${w}px`;
            trajetDiv.textContent = "🚘";
            rowEl.appendChild(trajetDiv);
            this.setupDragResizeTrajet(trajetDiv, inter, t);
          });
        }
      });
    });
  }

}





/**************************************************************************
  MENU CONTEXTUEL + FORMULAIRE MODAL
**************************************************************************/
let lastContextOffsetX = 0;   // on stockera la coordonnée X en pixel
let lastTimelineContent = null; // on stockera l'élément .timeline-content

document.addEventListener("contextmenu", (e) => {
  e.preventDefault();

  const menu = document.getElementById("context-menu");
  if (!menu) return; // si pas trouvé

  // On masque le menu s'il était visible
  menu.style.display = "none";

  // Détecte si on a cliqué sur un bloc .intervention
  const interEl = e.target.closest(".intervention");
  lastTimelineContent = e.target.closest(".timeline-content");

  if (lastTimelineContent) {
    // On calcule l'offset X local
    const rect = lastTimelineContent.getBoundingClientRect();
    lastContextOffsetX = e.clientX - rect.left + lastTimelineContent.scrollLeft;
  } else {
    lastContextOffsetX = 0;
  }

  const menuAdd = document.getElementById("menu-add");
  const menuShow = document.getElementById("menu-show");
  const menuDelete = document.getElementById("menu-delete");
  const menuDivider      = document.getElementById("menu-divider");
  const menuToggleAller  = document.getElementById("menu-toggle-aller");
  const menuToggleRetour = document.getElementById("menu-toggle-retour");

  // Utilitaire pour savoir si l'intervention a déjà ce trajet
  function hasTrajet(interv, dir) {
    return Array.isArray(interv.trajets) && interv.trajets.some(t => t.direction === dir);
  }

  if (interEl) {
    // Clique droit sur une intervention
    menuAdd.style.display  = "none";menuAdd.style.textAlign = "center";
    menuShow.style.display = "block";menuShow.style.textAlign = "center";
    menuDelete.style.display = "block";menuDelete.style.textAlign = "center";
    const interv = window.dataManager.interventions
                      .find(i => i._id === interEl.dataset.id);

    // Ajustement du texte selon l'existence du trajet
    menuToggleAller.textContent  = hasTrajet(interv, "left")
      ? "Retirer Trajet Aller"
      : "⬅ Ajout Trajet Aller";
    menuToggleRetour.textContent = hasTrajet(interv, "right")
      ? "Retirer Trajet Retour"
      : "Ajout Trajet Retour ➡";

    // Affichage du séparateur et des toggles
    menuDivider.style.display      = "block";menuDivider.style.textAlign = "center"; 
    menuToggleAller.style.display  = "block";menuToggleAller.style.textAlign = "center";
    menuToggleRetour.style.display = "block";menuToggleRetour.style.textAlign = "center";
    menu.dataset.interventionId = interEl.dataset.id;
  } else {
    // Clique droit sur zone vide
    menuAdd.style.display  = "block";
    menuShow.style.display = "none";
    menuDelete.style.display = "none";
    menuDivider.style.display      = "none";
    menuToggleAller.style.display  = "none";
    menuToggleRetour.style.display = "none";
    menu.dataset.interventionId = "";
  }

  // Position du menu
  menu.style.left = e.pageX + "px";
  menu.style.top  = e.pageY + "px";
  menu.style.display = "block";
});

// Quand on clique ailleurs, on masque le menu
document.addEventListener("click", () => {
  const menu = document.getElementById("context-menu");
  if (menu) menu.style.display = "none";
});

// Écouteurs sur le menu
const menuAdd  = document.getElementById("menu-add");
const menuShow = document.getElementById("menu-show");
const menuDelete = document.getElementById("menu-delete");
const menuToggleAller = document.getElementById("menu-toggle-aller");
const menuToggleRetour = document.getElementById("menu-toggle-retour");
if (menuAdd) {
  menuAdd.addEventListener("click", () => {
    const menu = document.getElementById("context-menu");
    menu.style.display = "none";

    // On ouvre le formulaire en mode "nouvelle intervention"
    showInterventionForm(null);
  });
}
if (menuShow) {
  menuShow.addEventListener("click", () => {
    const menu = document.getElementById("context-menu");
    menu.style.display = "none";

    const intervId = menu.dataset.interventionId;
    if (!intervId) return;

    // Récupère l'intervention depuis dataManager
    const found = window.dataManager.interventions.find(i => i._id === intervId);
    if (!found) return;

    // Ouvre le formulaire en mode "affichage / modification"
    showInterventionForm(found);
  });
}
if (menuDelete) {
    menuDelete.addEventListener("click", () => {
      const menu = document.getElementById("context-menu");
      menu.style.display = "none";
  
      const intervId = menu.dataset.interventionId;
        if (!intervId) return;

        const found = window.dataManager.interventions.find(i => i._id === intervId);
        if (!found) {
        console.warn("Intervention non trouvée dans la liste.");
        return;
        }

        window.dataManager.deleteIntervention(found)
        .then(() => {
            window.timeline.renderAllInterventions();
        })
        .catch(err => {
            console.error("Erreur lors de la suppression :", err);
        });
    });
}
if (menuToggleAller) {
menuToggleAller.addEventListener("click", async () => {
  const menu = document.getElementById("context-menu");
  menu.style.display = "none";

  const id    = menu.dataset.interventionId;
  const interv = window.dataManager.interventions.find(i => i._id === id);
  if (!interv) return;

  const hasLeft = interv.trajets.some(t => t.direction === "left");
  if (hasLeft) {
    // on retire
    interv.trajets = interv.trajets.filter(t => t.direction !== "left");
  } else {
    // on ajoute 1h avant dateDebut
    const durMs = 3600_000;
    interv.trajets.push({
      direction:   "left",
      dateDebut:   new Date(new Date(interv.dateDebut).getTime() - durMs),
      dateFin:     new Date(interv.dateDebut),
      type:        "voiture",
      dureeTrajet: durMs
    });
  }

  await window.dataManager.saveIntervention(interv);
  window.timeline.renderAllInterventions();
});
}
if (menuToggleRetour) {
menuToggleRetour.addEventListener("click", async () => {
  const menu = document.getElementById("context-menu");
  menu.style.display = "none";

  const id     = menu.dataset.interventionId;
  const interv = window.dataManager.interventions.find(i => i._id === id);
  if (!interv) return;

  const hasRight = interv.trajets.some(t => t.direction === "right");
  if (hasRight) {
    // on retire
    interv.trajets = interv.trajets.filter(t => t.direction !== "right");
  } else {
    // on ajoute 1h après dateFin
    const durMs = 3600_000;
    interv.trajets.push({
      direction:   "right",
      dateDebut:   new Date(interv.dateFin),
      dateFin:     new Date(new Date(interv.dateFin).getTime() + durMs),
      type:        "voiture",
      dureeTrajet: durMs
    });
  }

  await window.dataManager.saveIntervention(interv);
  window.timeline.renderAllInterventions();
});
}

  

/**************************************************************************
  showInterventionForm(intervention)
  - Si intervention == null => on crée une intervention
  - Sinon => on modifie / affiche
**************************************************************************/
function showInterventionForm(intervention) {
  const modal = document.getElementById("form-modal");
  if (!modal) return;

  // Récup les champs
  const titleEl        = document.getElementById("form-title");
  const ticketEl       = document.getElementById("form-ticketName");
  const clientEl       = document.getElementById("form-clientName");
  const villeEl        = document.getElementById("form-ville");
  const leftChk        = document.getElementById("form-leftTrajet");
  const rightChk       = document.getElementById("form-rightTrajet");
  const techChecks     = document.querySelectorAll("input[name='tech']");

  // Reset
  ticketEl.value  = "";
  clientEl.value  = "";
  villeEl.value   = "";
  leftChk.checked  = false;
  rightChk.checked = false;
  techChecks.forEach(chk => chk.checked = false);

  // IntervID stocké dans modal.dataset
  if (!intervention) {
    titleEl.textContent = "Nouvelle intervention";
    modal.dataset.interventionId = "";
  } else {
    titleEl.textContent = "Afficher / Modifier intervention";
    modal.dataset.interventionId = intervention._id || "";

    // Remplir
    ticketEl.value = intervention.ticketName || "";
    clientEl.value = intervention.clientName || "";
    villeEl.value  = intervention.ville      || "";

    // Trajets
    const hasLeft  = !!intervention.trajets.find(t => t.direction === "left");
    const hasRight = !!intervention.trajets.find(t => t.direction === "right");
    leftChk.checked  = hasLeft;
    rightChk.checked = hasRight;

    // Technicians
    if (Array.isArray(intervention.technicianRows)) {
      intervention.technicianRows.forEach(num => {
        const chk = [...techChecks].find(c => parseInt(c.value,10)===num);
        if (chk) chk.checked = true;
      });
    }
  }

  // Affiche la modale
  modal.style.display = "flex";
}

/**************************************************************************
  Boutons "Enregistrer" / "Annuler" dans la modale
**************************************************************************/

function addHoursToDate(baseDate, hours) {
    const copy = new Date(baseDate);
    copy.setHours(copy.getHours() + hours);
    return copy;
  }
  

const saveBtn   = document.getElementById("form-save-btn");
const cancelBtn = document.getElementById("form-cancel-btn");

if (saveBtn) {
  saveBtn.addEventListener("click", async () => {
    const modal = document.getElementById("form-modal");
    if (!modal) return;
    const intervId = modal.dataset.interventionId;

    // Champs
    const ticketEl       = document.getElementById("form-ticketName");
    const clientEl       = document.getElementById("form-clientName");
    const villeEl        = document.getElementById("form-ville");
    const leftChk        = document.getElementById("form-leftTrajet");
    const rightChk       = document.getElementById("form-rightTrajet");
    const techChecks     = document.querySelectorAll("input[name='tech']:checked");

    // Trouve intervention existante si l'ID n'est pas vide
    let existing = null;
    if (intervId) {
      existing = window.dataManager.interventions.find(i => i._id === intervId);
    }

    // Si c'est une nouvelle intervention => on calcule dateDebut / dateFin
    let dateDebut, dateFin;
    if (!existing) {
      // dateDebut et dateFin (ex. 1h de large) via lastContextOffsetX
      const { computeDateTimeFromOffset, pixelsPerHourDay } = await import("./dateHelpers.js");
      dateDebut = computeDateTimeFromOffset(lastContextOffsetX);
      dateFin   = computeDateTimeFromOffset(lastContextOffsetX + pixelsPerHourDay);
    } else {
      // On reprend l'existant
      dateDebut = existing.dateDebut;
      dateFin   = existing.dateFin;
    }

    // Techniciens
    const techArray = [...techChecks].map(chk => parseInt(chk.value,10));

    // Trajets
    let trajets = [];
    if (leftChk.checked) {
      const startLeft = addHoursToDate(dateDebut, -1);
      const endLeft   = new Date(dateDebut);
      const durationLeft = endLeft.getTime() - startLeft.getTime();
      trajets.push({
        direction: "left",
        dateDebut: startLeft,
        dateFin:   endLeft,
        type:      "voiture",
        dureeTrajet: durationLeft
      });
    }
    
    if (rightChk.checked) {
      const startRight = new Date(dateFin);
      const endRight   = addHoursToDate(dateFin, 1);
      const durationRight = endRight.getTime() - startRight.getTime();
      trajets.push({
        direction: "right",
        dateDebut: startRight,
        dateFin:   endRight,
        type:      "voiture",
        dureeTrajet: durationRight
      });
    }
    

    const newInter = {
      _id: intervId || undefined,
      dateDebut,
      dateFin,
      ticketName: ticketEl.value || "",
      clientName: clientEl.value || "",
      ville: villeEl.value || "",
      technicianRows: techArray,
      technician: techArray.length>1 
        ? `Techniciens ${techArray.join(",")}`
        : `Technicien ${techArray[0] || 1}`,
      trajets
    };

    // On sauvegarde
    await window.dataManager.saveIntervention(newInter);
    // On ré-affiche
    window.timeline.renderAllInterventions();

    // Fermer la modale
    modal.style.display = "none";
  });
}

if (cancelBtn) {
  cancelBtn.addEventListener("click", () => {
    const modal = document.getElementById("form-modal");
    if (modal) modal.style.display = "none";
  });
}
