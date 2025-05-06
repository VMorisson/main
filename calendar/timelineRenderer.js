// timelineRenderer.js

// 1) On importe isWeekend (si nécessaire) depuis dateHelpers.js
import { computeOffsetFromDateTime, computeDateTimeFromOffset,isWeekend, dayStart, dayEnd, pixelsPerHourDay, nightWidth, weekendWidth } from './dateHelpers.js';
import interact from "https://cdn.interactjs.io/v1.9.20/interactjs/index.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { auth, db } from "../config/firebaseConfig.js"; // ajustez selon votre config
import { showInterventionForm } from './interventionForm.js';
import { rowIdToName } from './configCalendar.js';


/* =========================================================
   REPRISE EXACTE DES TROIS FONCTIONS D'ORIGINE
   (on ne les modifie pas)
========================================================= */

function generateHeader(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth) {
  const hourContainer = document.getElementById("header-timeline");
  const dayContainer = document.getElementById("day-labels");
  hourContainer.innerHTML = "";
  dayContainer.innerHTML = "";
  window.heuresMap = [];
  window.tempsMap = [];
  window.tempsMap = new Map();

  let totalWidth = 0;
  const today = new Date();
  const todayDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  let date = new Date(window.calendarStart);
  
  while (date <= window.calendarEnd) {
    const jourDate = new Date(date);
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
        window.heuresMap.push({ type: "hour", heure: h, start: blockStart, end: blockStart + pixelsPerHourDay, date: new Date(jourDate) });
        totalWidth += pixelsPerHourDay;
      }
      hourContainer.insertAdjacentHTML("beforeend",
        `<div class='hour-block night-block' style='left:${totalWidth}px; width:${nightWidth}px; text-align:center;'>
            Nuit
         </div>`
      );
      const nightDate = new Date(jourDate);
      nightDate.setDate(nightDate.getDate() + 1); // ✅ assigner la nuit au jour SUIVANT
      window.heuresMap.push({
        type: "night",
        start: totalWidth,
        end: totalWidth + nightWidth,
        date: nightDate
      });
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

function generateTechnicianLines(totalWidth) {
  document.querySelectorAll("#calendar .technician-row").forEach(row => {
    const timeline = row.querySelector(".timeline-content");
    if (!timeline) return;

    timeline.innerHTML = "";
    timeline.style.position = "relative";
    timeline.style.width = totalWidth + "px";
    timeline.style.overflow = "hidden";

    const rowNumber = parseInt(row.dataset.row, 10);

    // ➔ Crée le background
    const bg = document.createElement("div");
    bg.className = "timeline-background";

    if (rowNumber >= 1 && rowNumber <= 8) {
      bg.classList.add("zone-tech");
      timeline.classList.add("zone-tech"); // 👈 ajoute ceci
    } else if (rowNumber >= 9 && rowNumber <= 10) {
      bg.classList.add("zone-laurea");
      timeline.classList.add("zone-laurea");
    } else if (rowNumber >= 11) {
      bg.classList.add("zone-presta");
      timeline.classList.add("zone-presta");
    }
    

    bg.style.width = totalWidth + "px";
    bg.style.height = "100%";
    bg.style.position = "absolute";
    bg.style.top = "0";
    bg.style.left = "0";

    timeline.appendChild(bg);

    // ➔ Ajoute tes overlays weekend, nuit et lignes d'heures
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
  updateLabelColumn();
}
function updateLabelColumn() {
  const labelsCol = document.getElementById("labels-column");
  if (!labelsCol) return;

  labelsCol.innerHTML = "";

  const maxRow = 20; // Tu peux l'adapter
  let lastNameUsed = "";

  for (let rowId = 1; rowId <= maxRow; rowId++) {
    const rowElement = document.querySelector(`.technician-row[data-row="${rowId}"]`);
    if (!rowElement) continue;

    const label = document.createElement("div");
    label.className = "label-row";

    // Nom affiché = celui du mapping ou dernier utilisé
    const currentName = rowIdToName[rowId];
    if (currentName) {
      lastNameUsed = currentName;
    }
    label.textContent = lastNameUsed;

    // Appliquer les mêmes classes de zone que timeline-content
    const timeline = rowElement.querySelector(".timeline-content");
    if (timeline) {
      if (timeline.classList.contains("zone-tech")) {
        label.classList.add("zone-tech");
      } else if (timeline.classList.contains("zone-laurea")) {
        label.classList.add("zone-laurea");
      } else if (timeline.classList.contains("zone-presta")) {
        label.classList.add("zone-presta");
      }
    }

    labelsCol.appendChild(label);
  }
}




function adjustFontSizeToFit(element, maxFontSize = 14, minFontSize = 10) {
  if (!element) return;
  
  element.style.fontSize = maxFontSize + "px";
  element.style.whiteSpace = "nowrap";
  element.style.overflow = "hidden";

  const availableWidth = element.getBoundingClientRect().width;
  let fontSize = maxFontSize;

  // console.log(`🧪 [FontFit] ${element.className} — dispo: ${availableWidth}px, scroll: ${element.scrollWidth}px`);

  while (element.scrollWidth > availableWidth && fontSize > minFontSize) {
    fontSize -= 0.5;
    element.style.fontSize = fontSize + "px";
    // console.log(`↘ ${element.className} réduit à ${fontSize}px (scroll: ${element.scrollWidth}, client: ${element.clientWidth})`);
  }

  if (element.scrollWidth > availableWidth) {
    element.style.whiteSpace = "normal";
    element.style.fontSize = minFontSize + "px";
    element.style.overflowWrap = "break-word";
    element.style.wordBreak = "break-word";
    console.warn(`💥 ${element.className} toujours trop large — wrap forcé à ${minFontSize}px`);
  } else {
    // console.log(`✅ ${element.className} ajustée à ${fontSize}px`);
  }
}
function freezeCalendarOverlays() {
  console.log("🧊 Lancement de freezeCalendarOverlays");

  if (typeof html2canvas === "undefined") {
    console.warn("⚠️ html2canvas pas encore chargé. Retente dans 100ms...");
    setTimeout(freezeCalendarOverlays, 100);
    return;
  }

  // Utilise directement les bons éléments .timeline-content avec les classes de zone
  const getImageForZone = (zoneClass) => {
    const timeline = document.querySelector(`.timeline-content.${zoneClass}`);
    if (!timeline) {
      console.warn(`❌ Pas de .timeline-content trouvé pour .${zoneClass}`);
      return Promise.resolve(null);
    }

    console.log(`📸 Capture demandée pour .timeline-content.${zoneClass}`);

    return html2canvas(timeline, {
      backgroundColor: null,
      useCORS: true,
      scale: 1
    }).then(canvas => {
      const img = canvas.toDataURL("image/png");
      console.log(`✅ Capture OK .${zoneClass}, taille: ${img.length}`);
      return img;
    }).catch(err => {
      console.error(`🔥 Erreur capture .${zoneClass}`, err);
      return null;
    });
  };

  Promise.all([
    getImageForZone("zone-tech"),
    getImageForZone("zone-laurea"),
    getImageForZone("zone-presta")
  ]).then(([techImg, laureaImg, prestaImg]) => {
    console.log("🎨 Application des fonds capturés…");

    document.querySelectorAll(".timeline-content").forEach(timeline => {
      const classList = timeline.classList;
      console.log("🔍 Inspecte :", [...classList]);

      timeline.querySelectorAll(".hour-line, .weekend-overlay, .night-overlay, .start-of-day").forEach(el => el.remove());

      if (classList.contains("zone-tech") && techImg) {
        console.log("🖼️ Applique fond TECH");
        timeline.style.backgroundImage = `url(${techImg})`;
      } else if (classList.contains("zone-laurea") && laureaImg) {
        console.log("🖼️ Applique fond LAUREA");
        timeline.style.backgroundImage = `url(${laureaImg})`;
      } else if (classList.contains("zone-presta") && prestaImg) {
        console.log("🖼️ Applique fond PRESTA");
        timeline.style.backgroundImage = `url(${prestaImg})`;
      } else {
        console.warn("🚫 Aucun fond applicable à cette ligne");
      }

      timeline.style.backgroundSize = "cover";
      timeline.style.backgroundRepeat = "no-repeat";
      timeline.style.backgroundPosition = "top left";
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
    freezeCalendarOverlays();
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
  
  setLabel(interDiv, inter) {
    // 🔥 Supprime toutes les anciennes lignes
    interDiv.querySelectorAll(".inst-line, .client-line, .ville-line").forEach(el => el.remove());
  
    const linesToResize = [];
  
    // ✅ Ajouter inst-line SEULEMENT si largeur du bloc >= 45px
    const blocWidth = interDiv.getBoundingClientRect().width;
    const tailleMinPx = 45;
  
    if (blocWidth > tailleMinPx) {
      const inst = document.createElement("div");
      inst.className = "fit-line inst-line";
      inst.textContent = inter.ticketName || "Intervention";
      interDiv.appendChild(inst);
      linesToResize.push(inst);
      // console.log(`📏 .inst-line RENDUE (largeur: ${Math.round(blocWidth)}px)`);
    } else {
      // console.log(`❌ .inst-line NON rendue (largeur: ${Math.round(blocWidth)}px) — Texte pivoté`);
    }

    const client = document.createElement("div");
    client.className = "fit-line client-line";
    client.textContent = inter.clientName || "";
    interDiv.appendChild(client);
    linesToResize.push(client);
  
    const ville = document.createElement("div");
    ville.className = "fit-line ville-line";
    ville.textContent = inter.ville || "";
    interDiv.appendChild(ville);
    linesToResize.push(ville);
    
    // ⚙️ Resize après affichage
    requestAnimationFrame(() => {
      linesToResize.forEach(line => adjustFontSizeToFit(line));
    });
  }

  setupDragResize(block, intervention) {
    const self = this;

    block.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      self.createTimeLabels(intervention);
      self.updateTimeLabels(intervention);
    });

    block.addEventListener("mouseup", (e) => {
      document.querySelectorAll(`.intervention[data-id="${intervention._id}"]`).forEach(b => {
        const leftLabel = b.querySelector(".inter-time-label.left");
        const rightLabel = b.querySelector(".inter-time-label.right");
      
        if (leftLabel) leftLabel.remove();
        if (rightLabel) rightLabel.remove();
      });      
    });
    

    interact(block).draggable({
      listeners: {
        start(event) {
          console.log("🔧 [Drag] Initialisation déplacement");
          block.dataset.initialLeft = parseFloat(block.style.left || "0") || 0;
          block.dataset.totalDx = 0;
        },
        move(event) {
          const totalDx = parseFloat(block.dataset.totalDx || "0") + event.dx;
          block.dataset.totalDx = totalDx;

          const initialLeft = parseFloat(block.dataset.initialLeft) || 0;
          const newLeft = Math.round((initialLeft + totalDx) / 15) * 15;
          const width = parseFloat(block.style.width || "0");
          if (newLeft < 0) return;

          const newStart = computeDateTimeFromOffset(newLeft);
          const newEnd = computeDateTimeFromOffset(newLeft + width);

          // 🌐 Étape 1 : Analyse ligne par ligne
          let updatedRows = [];
          let conflictDetected = false;

          for (const rowId of intervention.technicianRows) {
            const isFlexible = rowId >= 9; // tout ce qui est >= 9 peut bouger

            const temp = { ...intervention, technicianRows: [rowId] };
            const result = self.checkForOverlap(newStart, newEnd, temp);

            if (result.status === "conflict") {
              if (isFlexible && result.row !== null) {
                updatedRows.push(result.row); // tentative de fallback
              } else {
                conflictDetected = true;
                break;
              }
            } else if (result.status === "fallback" && isFlexible) {
              updatedRows.push(result.row);

              // 💥 DOM live update pour le bloc concerné
              const thisBlock = [...document.querySelectorAll(`.intervention[data-id="${intervention._id}"]`)].find(b => {
                const r = b.closest(".technician-row");
                return r && parseInt(r.dataset.row, 10) === rowId;
              });
              const newRowEl = document.querySelector(`.technician-row[data-row="${result.row}"] .timeline-content`);
              if (thisBlock && newRowEl && thisBlock.parentElement !== newRowEl) {
                newRowEl.appendChild(thisBlock);
              }
            } else {
              updatedRows.push(rowId); // tout va bien
            }
          }

          // 🧱 Étape 2 : Conflit = on bloque tout
          if (conflictDetected) {
            block.style.outline = '2px solid red';
            return;
          }

          block.style.outline = '';

          // ✅ Étape 3 : Appliquer nouvelle position
          intervention.technicianRows = updatedRows;

          // ➕ Déplacer visuellement tous les blocs frères
          document.querySelectorAll(`.intervention[data-id="${intervention._id}"]`).forEach(b => {
            b.style.left = `${newLeft}px`;
            b.style.width = `${width}px`;

            const oldRowEl = b.closest(".technician-row");
            const oldRowId = oldRowEl ? parseInt(oldRowEl.dataset.row, 10) : null;
            const newRowId = updatedRows.includes(oldRowId) ? oldRowId : updatedRows.find(r => !intervention.technicianRows.includes(r));

            if (newRowId !== undefined && newRowId !== null && newRowId !== oldRowId) {
              const newRowEl = document.querySelector(`.technician-row[data-row="${newRowId}"] .timeline-content`);
              if (newRowEl && newRowEl !== b.parentElement) {
                newRowEl.appendChild(b);
              }
            }
            
          });

          intervention.dateDebut = newStart;
          intervention.dateFin = newEnd;

          self.updateTimeLabels(intervention);
          self.updateTrajets(intervention);
          self.updateTrajetsDOM(intervention);
        },        
        end: async () => {
          if (!intervention.dateDebut || !intervention.dateFin) return;
          // self.removeTimeLabels(intervention);
          block.style.outline = "none";
  
          try {
            const saved = await window.dataManager.saveIntervention(intervention);
            if (saved) {
              window.dataManager.updateLocalIntervention(saved);
              window.timeline.updateSingleIntervention(saved);
            }
          } catch (err) {
            console.error("❌ Erreur durant le drag :", err);
          }
        }
      }
    });
  
    interact(block).resizable({
      edges: {
        left: block.querySelector(".resize-handle.left"),
        right: block.querySelector(".resize-handle.right")
      },
      modifiers: [
        interact.modifiers.restrictSize({ min: { width: 30 } }),
      ],
      listeners: {
        start(event) {
          const block = event.target;
        
          block.dataset.initialLeft = block.style.left?.replace('px', '') || "0";
          block.dataset.initialWidth = block.style.width?.replace('px', '') || "100";
          block.dataset.totalDx = "0";
        
          console.log("🟢 [RESIZE START]");
          console.log("➡️ initialLeft:", block.dataset.initialLeft);
          console.log("➡️ initialWidth:", block.dataset.initialWidth);
        },        
        move(event) {
          const block = event.target;
          const isLeft = event.edges?.left === true;
        
          const delta = isLeft ? event.deltaRect?.left || 0 : event.deltaRect?.width || 0;
          const totalDx = parseFloat(block.dataset.totalDx || "0") + delta;
          block.dataset.totalDx = totalDx;
        
          const initialLeft = parseFloat(block.dataset.initialLeft || "0");
          const initialWidth = parseFloat(block.dataset.initialWidth || block.style.width || "0");
        
          let newLeft = initialLeft;
          let newWidth = initialWidth;
        
          if (isLeft) {
            // Bord gauche : déplacement vers la gauche = left ↓, width ↑
            newLeft = Math.max(0, Math.round((initialLeft + totalDx) / 15) * 15);
            newWidth = Math.round((initialWidth - totalDx) / 15) * 15;
          } else {
            // Bord droit : left fixe, width ↑
            newWidth = Math.round((initialWidth + totalDx) / 15) * 15;
          }
        
          if (newWidth < 15) return;
        
          const newStart = computeDateTimeFromOffset(newLeft);
          const newEnd = computeDateTimeFromOffset(newLeft + newWidth);
          // Étape 1 : calcul overlap par ligne
          let updatedRows = [];
          let conflictDetected = false;

          for (const rowId of intervention.technicianRows) {
            const isFlexible = rowId >= 9;
            const temp = { ...intervention, technicianRows: [rowId] };
            const result = self.checkForOverlap(newStart, newEnd, temp);
            console.log("[Resize] Overlap result for row", rowId, result);

            if (result.status === "conflict") {
              if (isFlexible && result.row !== null) {
                updatedRows.push(result.row);
              } else {
                conflictDetected = true;
                break;
              }
            } else if (result.status === "fallback" && isFlexible) {
              updatedRows.push(result.row);

              const thisBlock = [...document.querySelectorAll(`.intervention[data-id="${intervention._id}"]`)].find(b => {
                const r = b.closest(".technician-row");
                return r && parseInt(r.dataset.row, 10) === rowId;
              });

              const newRowEl = document.querySelector(`.technician-row[data-row="${result.row}"] .timeline-content`);
              if (thisBlock && newRowEl && thisBlock.parentElement !== newRowEl) {
                newRowEl.appendChild(thisBlock);
              }

            } else {
              updatedRows.push(rowId);
            }
          }

          // Étape 2 : gestion conflit
          if (conflictDetected) {
            block.style.outline = '2px solid red';
            return;
          }

          block.style.outline = '';

          // Étape 3 : mise à jour de l’intervention
          intervention.technicianRows = updatedRows;

          // Déplacement du bloc si nécessaire
          const newRowId = updatedRows[0];
          const newRowEl = document.querySelector(`.technician-row[data-row="${newRowId}"] .timeline-content`);
          if (newRowEl && block.parentElement !== newRowEl) {
            newRowEl.appendChild(block);
          }

          // Même traitement pour les trajets s’ils sont autorisés
          if (newRowId < 9) {
            document.querySelectorAll(`.trajet-block[data-id="${intervention._id}"]`).forEach(trajetBlock => {
              const parent = trajetBlock.closest(".timeline-content");
              if (newRowEl && parent !== newRowEl) {
                newRowEl.appendChild(trajetBlock);
              }
            });
          }
          
        
          // Mise à jour visuelle
          block.style.left = `${newLeft}px`;
          block.style.width = `${newWidth}px`;
        
          document.querySelectorAll(`.intervention[data-id="${intervention._id}"]`).forEach(b => {
            if (b !== block) {
              b.style.left = `${newLeft}px`;
              b.style.width = `${newWidth}px`;
            }
          });
        
          // MàJ logique
          intervention.dateDebut = newStart;
          intervention.dateFin = newEnd;
        
          self.updateTimeLabels(intervention);
          self.updateTrajets(intervention);
          self.updateTrajetsDOM(intervention);
        },                                                 
        end: async () => {
          if (!intervention.dateDebut || !intervention.dateFin) return;
          // self.removeTimeLabels(intervention);
          block.style.outline = "none";
  
          try {
            const saved = await window.dataManager.saveIntervention(intervention);
            if (saved) {
              window.dataManager.updateLocalIntervention(saved);
              window.timeline.updateSingleIntervention(saved);
            }
          } catch (err) {
            console.error("❌ Erreur durant le redimensionnement :", err);
          }
        }
      }
    });
  }
  setupDragResizeTrajet(trajetBlock, intervention, trajet) {
    const gridStep = 15;
    const tailleMinPx = 15;
  
    interact(trajetBlock).resizable({
      edges: trajet.direction === 'left' ? { left: true } : { right: true },
      modifiers: [
        interact.modifiers.restrictSize({
          min: { width: tailleMinPx }
        })
      ],
      listeners: {
        start: (event) => {
          trajetBlock._initialLeft = parseFloat(trajetBlock.style.left) || 0;
          trajetBlock._initialWidth = parseFloat(trajetBlock.style.width) || 0;
          trajetBlock._deltaLeft = 0;
          trajetBlock._deltaWidth = 0;
  
          this.createTrajetDurationLabel(trajetBlock);
          console.log("🚦 [ResizeTrajet] Début de resize");
        },
  
        move: (event) => {
          trajetBlock._deltaLeft += event.deltaRect.left || 0;
          trajetBlock._deltaWidth += event.deltaRect.width || 0;
  
          let displayLeft = trajetBlock._initialLeft;
          let displayWidth = trajetBlock._initialWidth;
  
          if (trajet.direction === 'left') {
            displayLeft = Math.round((trajetBlock._initialLeft + trajetBlock._deltaLeft) / gridStep) * gridStep;
            displayWidth = Math.round((trajetBlock._initialWidth - trajetBlock._deltaLeft) / gridStep) * gridStep;
          } else {
            displayWidth = Math.round((trajetBlock._initialWidth + trajetBlock._deltaWidth) / gridStep) * gridStep;
          }
  
          if (displayLeft < 0) {
            displayWidth += displayLeft;
            displayLeft = 0;
          }
  
          // Applique les nouvelles dimensions
          document.querySelectorAll(`.trajet-block.trajet-${trajet.direction}[data-id="${intervention._id}"]`).forEach(block => {
            block.style.left = `${displayLeft}px`;
            block.style.width = `${displayWidth}px`;
            this.updateTrajetDurationLabel(block, trajet);
          });
  
          trajet.dureeTrajet = Math.max(displayWidth * 120000, tailleMinPx * 120000);
          console.log(`📏 [ResizeTrajet] Width=${displayWidth}px, Durée=${trajet.dureeTrajet}ms`);
        },
  
        end: async () => {
          try {
            const saved = await window.dataManager.saveIntervention(intervention);
            if (saved) {
              window.dataManager.updateLocalIntervention(saved);
              window.timeline.updateSingleIntervention(saved);
              this.removeTrajetDurationLabels(intervention, trajet.direction);
              console.log("✅ [ResizeTrajet] Enregistré et label retiré");
            }
          } catch (err) {
            console.error("❌ Erreur durant le redimensionnement du trajet :", err);
          }
        }
      }
    });
  }
  
  formatTrajetDuration(ms) {
  const minutes = Math.round(ms / 60000);
  const decimal = Math.round((minutes / 60) * 2) / 2; // arrondi à 0.5
  return {
    decimal: `${decimal.toFixed(1)}h`
  };
  }
  formatLabelTime(date) {
    const jour = date.getDay();
    const heure = date.getHours();
  
    if (jour === 0 || jour === 6) return "week-end";
    if (heure < dayStart || heure > dayEnd) return "nuit";
  
    const h = String(date.getHours()).padStart(2, "0");
    const m = String(date.getMinutes()).padStart(2, "0");
    return `${h}h${m}`;
  }
  
  createTimeLabels(intervention) {
    const blocks = document.querySelectorAll(`.intervention[data-id="${intervention._id}"]`);
    blocks.forEach(block => {
      const leftLabel = document.createElement("div");
      leftLabel.className = "inter-time-label left";
      block.appendChild(leftLabel);
    
      const rightLabel = document.createElement("div");
      rightLabel.className = "inter-time-label right";
      block.appendChild(rightLabel);
  
      // Stocker les références
      this.timeLabelLeft = leftLabel;
      this.timeLabelRight = rightLabel;
    });
  }  
  updateTimeLabels(intervention) {
    const blocks = document.querySelectorAll(`.intervention[data-id="${intervention._id}"]`);
    blocks.forEach(block => {
      const leftLabel = block.querySelector(".inter-time-label.left");
      const rightLabel = block.querySelector(".inter-time-label.right");
      if (!leftLabel || !rightLabel) return;
  
      const start = new Date(intervention.dateDebut);
      const end = new Date(intervention.dateFin);
  
      leftLabel.textContent = this.formatLabelTime(start);
      rightLabel.textContent = this.formatLabelTime(end);
    });
  }
  removeTimeLabels() {
    if (this.timeLabelLeft?.remove) this.timeLabelLeft.remove();
    if (this.timeLabelRight?.remove) this.timeLabelRight.remove();
    this.timeLabelLeft = null;
    this.timeLabelRight = null;
  }
  setupInterventionLabelEvents() {
    const calendar = document.getElementById("calendar");
    if (!calendar) {
      console.warn("[setupInterventionLabelEvents] Aucun calendrier trouvé !");
      return;
    }
  
    calendar.addEventListener("mousedown", (e) => {
      const interEl = e.target.closest(".intervention");
      if (!interEl) return;
  
      const intervention = window.dataManager.interventions.find(i => i._id === interEl.dataset.id);
      if (!intervention) return;
  
      console.log("[mousedown] Création des time labels pour :", intervention._id);
  
      this.createTimeLabels(intervention);
      this.updateTimeLabels(intervention);
    });
  
    calendar.addEventListener("mouseup", (e) => {
      if (e.target.closest(".intervention")) {
        console.log("[mouseup] Suppression des time labels.");
        this.removeTimeLabels();
      }
    });
  
    calendar.addEventListener("dragstart", (e) => {
      if (e.target.closest(".intervention")) {
        console.log("[dragstart] Suppression des time labels (drag commencé).");
        this.removeTimeLabels();
      }
    });
  }  
  createTrajetDurationLabel(trajetBlock) {
    let label = trajetBlock.querySelector(".trajet-duration-label");
    if (!label) {
      label = document.createElement("div");
      label.className = "trajet-duration-label";
      trajetBlock.appendChild(label);
      console.log("🆕 [TrajetLabel] Créé");
    }
    return label;
  }
  updateTrajetDurationLabel(trajetBlock, trajet) {
    const label = this.createTrajetDurationLabel(trajetBlock);
    const duration = this.formatTrajetDuration(trajet.dureeTrajet);
    label.textContent = duration.decimal;
    // label.style.left = "50%";
    // label.style.transform = "translateX(-50%)";
    console.log("🔁 [TrajetLabel] Mis à jour :", duration.decimal);
  }
  removeTrajetDurationLabels(intervention, direction) {
    const blocks = document.querySelectorAll(`.trajet-block.trajet-${direction}[data-id="${intervention._id}"]`);
    blocks.forEach(block => {
      const label = block.querySelector(".trajet-duration-label");
      if (label) {
        label.remove();
        console.log("🗑️ [TrajetLabel] Supprimé");
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
  
  
  checkForOverlap(dateDebut, dateFin, currentIntervention) {
    if (!currentIntervention || !Array.isArray(currentIntervention.technicianRows)) {
      return { status: 'conflict', row: null };
    }
  
    const currentRow = currentIntervention.technicianRows[0];
    const newLeft = computeOffsetFromDateTime(dateDebut);
    const newRight = computeOffsetFromDateTime(dateFin);
  
    // Cherche une ligne dispo d'abord, même sans conflit
    let fallbackRow = null;
    if (currentRow === 9 || currentRow === 10) {
      fallbackRow = this.findFirstAvailableRow(currentIntervention, dateDebut, dateFin, 9, 10);
    } else if (currentRow >= 11) {
      fallbackRow = this.findFirstAvailableRow(currentIntervention, dateDebut, dateFin, 11, 20);
    }
  
    const hasConflict = window.dataManager.interventions.some(other => {
      if (!other || !Array.isArray(other.technicianRows)) return false;
      if (other._id && currentIntervention._id && other._id === currentIntervention._id) return false;
      if (!other.technicianRows.includes(currentRow)) return false;
  
      const otherLeft = computeOffsetFromDateTime(new Date(other.dateDebut));
      const otherRight = computeOffsetFromDateTime(new Date(other.dateFin));
  
      return newLeft < otherRight && newRight > otherLeft;
    });
  
    if (hasConflict) {
      if (fallbackRow !== null) return { status: 'fallback', row: fallbackRow };
      return { status: 'conflict', row: null };
    }
  
    // Pas de conflit, mais une ligne meilleure dispo ?
    if (fallbackRow !== null && fallbackRow < currentRow) {
      return { status: 'fallback', row: fallbackRow };
    }
  
    // Tout est ok, reste là
    return { status: 'ok', row: currentRow };
  }
  
  
  
  
  
  renderAllInterventions() {
    // 🔥 Supprime tout le planning actuel (interventions + trajets)
    document.querySelectorAll("#calendar .timeline-content .intervention, #calendar .timeline-content .trajet-block")
      .forEach(el => el.remove());
  
    const interventions = window.dataManager.interventions;
    // console.log("🧪 Interventions à afficher :", interventions);
    if (!interventions || interventions.length === 0) {
      console.warn("[TimelineRenderer] Aucune intervention à afficher.");
      return;
    }
  
    interventions.forEach(inter => {
      // 🧱 Rendu principal de l'intervention
      // console.log("🧪 Rendu intervention :", inter);
      this.renderIntervention(inter);
  
      // 🚌 Ajout des trajets associés à cette intervention
      if (Array.isArray(inter.trajets)) {
        inter.trajets.forEach(trajet => {
          this.renderTrajetBlock(inter, trajet);
        });
      }
    });
  }  
  renderIntervention(intervention) {
    if (!intervention || !Array.isArray(intervention.technicianRows)) return;
  
    const dateDebut = new Date(intervention.dateDebut);
    const dateFin = new Date(intervention.dateFin);
    const left = computeOffsetFromDateTime(dateDebut);
    const width = computeOffsetFromDateTime(dateFin) - left;

    const rowIds = Array.isArray(intervention.technicianRows) ? intervention.technicianRows : [];

    if (rowIds.length === 0) {
      console.warn(`❌ Intervention ${intervention._id} sans technicianRows`);
      return;
    }

    let atLeastOnePlaced = false;

    rowIds.forEach(rowId => {
      const fakeIntervention = { ...intervention, technicianRows: [rowId] };
      const overlap = this.checkForOverlap(dateDebut, dateFin, fakeIntervention);

      if (overlap.status === "conflict") {
        console.warn(`❌ Conflit sur la ligne ${rowId} pour ${intervention._id}`);
        return;
      }

      const rowEl = document.querySelector(`.technician-row[data-row="${rowId}"] .timeline-content`);
      if (!rowEl) {
        console.warn(`⚠️ DOM introuvable pour rowId ${rowId}`);
        return;
      }

      this.placeInterventionBlock(rowEl, intervention, left, width);
      atLeastOnePlaced = true;
    });

    if (!atLeastOnePlaced) {
      console.warn(`❌ Aucun bloc placé pour ${intervention._id}`);
    }

  
    if (Array.isArray(intervention.trajets)) {
      intervention.trajets.forEach(trajet => {
        this.renderTrajetBlock(intervention, trajet);
      });
    }
  }
  placeInterventionBlock(row, intervention, left, width) {
    const interDiv = document.createElement("div");
    interDiv.className = "intervention";
    interDiv.dataset.id = intervention._id;
    interDiv.style.left = `${left}px`;
    interDiv.style.width = `${width}px`;
  
    const leftHandle = document.createElement("div");
    leftHandle.className = "resize-handle left";
    const rightHandle = document.createElement("div");
    rightHandle.className = "resize-handle right";
    interDiv.appendChild(leftHandle);
    interDiv.appendChild(rightHandle);
  
    row.appendChild(interDiv);
  
    this.setupDragResize(interDiv, intervention);
    this.setLabel(interDiv, intervention);
  }  
  findFirstAvailableRow(intervention, dateDebut, dateFin, startRow, endRow) {
    const newLeft = computeOffsetFromDateTime(dateDebut);
    const newRight = computeOffsetFromDateTime(dateFin);
  
    for (let rowId = startRow; rowId <= endRow; rowId++) {
      // Clone propre pour éviter les collisions internes
      const testIntervention = JSON.parse(JSON.stringify(intervention));
      testIntervention.technicianRows = [rowId];
  
      const hasConflict = window.dataManager.interventions.some(other => {
        if (!other || !Array.isArray(other.technicianRows)) return false;
      
        // Protection renforcée contre la self-collision
        if (other._id && testIntervention._id && other._id === testIntervention._id) return false;
      
        if (!other.technicianRows.includes(rowId)) return false;
      
        const otherLeft = computeOffsetFromDateTime(new Date(other.dateDebut));
        const otherRight = computeOffsetFromDateTime(new Date(other.dateFin));
      
        return newLeft < otherRight && newRight > otherLeft;
      });
      
  
      // console.log(`[RowFinder] ${hasConflict ? '❌ Occupée' : '✅ Libre'} → Ligne ${rowId}`);
  
      if (!hasConflict) {
        // console.log(`[RowFinder] ✅ Retourne ${rowId} — DOM =`, document.querySelector(`[data-row="${rowId}"]`));

        return rowId;
      }
    }
  
    console.warn(`[RowFinder] ❌ Aucune ligne libre trouvée pour intervention ${intervention._id}`);
    return null;
  }
  renderTrajetBlock(intervention, trajet) {
    if (!trajet || !trajet.direction || !intervention.technicianRows || intervention.technicianRows.length === 0) {
      console.warn("❌ [renderTrajetBlock] Trajet invalide ou intervention sans techniciens :", trajet);
      return;
    }
  
    const interBlock = document.querySelector(`.intervention[data-id="${intervention._id}"]`);
    if (!interBlock) {
      console.warn("❌ [renderTrajetBlock] Bloc intervention introuvable :", intervention._id);
      return;
    }
  
    const interLeft  = parseFloat(interBlock.style.left);
    const interWidth = parseFloat(interBlock.style.width);
    const width      = (trajet.dureeTrajet / 3600000) * pixelsPerHourDay;
  
    let left;
    if (trajet.direction === "left") {
      left = interLeft - width;
    } else {
      left = interLeft + interWidth;
    }
  
    const trajetBlock = document.createElement("div");
    trajetBlock.className = `trajet-block trajet-${trajet.direction}`;
    trajetBlock.dataset.id = intervention._id;
    trajetBlock.style.left = `${left}px`;
    trajetBlock.style.width = `${width}px`;
    this.renderTypeTrajet(intervention, trajetBlock);
  
    intervention.technicianRows.forEach(rowId => {
      // ❌ Ignorer les lignes malléables
      if (rowId >= 9) return;
    
      const row = document.querySelector(`#calendar .technician-row[data-row="${rowId}"] .timeline-content`);
      if (row) {
        const clone = trajetBlock.cloneNode(true);
        row.appendChild(clone);
        this.setupDragResizeTrajet(clone, intervention, trajet);
      }
    });
  }
  renderTypeTrajet(intervention, trajetBlock) {
    const validTypes = ['voiture', 'train', 'avion'];
    const type = validTypes.includes(intervention.typeTrajet) ? intervention.typeTrajet : 'voiture';
  
    trajetBlock.dataset.typeTrajet = type;
  
    // Nettoie les anciennes classes
    trajetBlock.classList.remove('trajet-voiture', 'trajet-train', 'trajet-avion', 'tiny-trajet');
    trajetBlock.classList.add(`trajet-${type}`);
  
    // Vérifie la taille pour ajuster la police
    const width = parseFloat(trajetBlock.style.width);
    if (width === 15) {
      trajetBlock.classList.add('tiny-trajet');
      console.log(`🔍 Trajet étroit détecté (15px), réduction de la taille de police appliquée`);
    }
  
    console.log(`🚗 [renderTypeTrajet] ID ${intervention._id} → type: ${type}, width: ${width}px`);
  }
  
  
  
  updateSingleIntervention(intervention) {
    if (!intervention || !intervention._id) {
      console.warn("❌ Intervention invalide ou sans ID :", intervention);
      return;
    }

    // Supprimer les anciens blocs (intervention + trajets)
    document.querySelectorAll(`.intervention[data-id="${intervention._id}"],
                              .trajet-block[data-id="${intervention._id}"]`)
      .forEach(el => el.remove());

    // Ré-affiche l'intervention
    this.renderIntervention(intervention);
  }
  //modifier renderAll et updateSingle de la même manière
  


  startPollingUpdates() {
    let lastUpdate = new Date();
    let secondsSince = 0;
  
    const pollingTimerEl = document.getElementById("polling-timer");
  
    // Chrono visuel
    setInterval(() => {
      secondsSince++;
      if (pollingTimerEl) {
        pollingTimerEl.textContent = `Dernier polling : ${secondsSince}s`;
      }
  
      if (secondsSince > 60) {
        console.warn("🚨 Aucune mise à jour depuis 60s. Le polling semble inactif.");
      }
    }, 1000);
  
    // Polling lui-même
    setInterval(async () => {
      if (document.visibilityState !== "visible") {
        // console.log("[POLL] Onglet inactif — polling suspendu temporairement");
        return;
      }
    
      const scrollContainer = document.querySelector(".timeline-scroll");
      const currentScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
    
      // console.log(`[POLL] Envoi de requête à ${new Date().toLocaleTimeString()}`);
      const updated = await window.dataManager.pollNewInterventions(lastUpdate);
    
      if (updated.length > 0) {
        updated.forEach(inter => window.timeline.updateSingleIntervention(inter));
        if (scrollContainer) scrollContainer.scrollLeft = currentScrollLeft;
    
        lastUpdate = new Date();
        secondsSince = 0;
    
        // console.log(`[POLL] 🔁 Planning mis à jour à ${lastUpdate.toISOString()}`);
      } else {
        // console.log("[POLL] 💤 Aucun changement détecté.");
      }
    }, 5000);
  }
  
  
}




