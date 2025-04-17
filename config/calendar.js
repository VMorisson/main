import interact from 'interactjs';

/* ------------------------------
   CONSTANTES & PARAMÈTRES DE BASE
------------------------------ */
const dayStart = 8;              // Début de la journée
const dayEnd = 20;               // Fin de la journée affichée
const pixelsPerHourDay = 30;     // Exemple : 20px par heure en journée
const nightWidth = 60;           // Largeur fixe pour la nuit (22h–8h)
const weekendWidth = 60;        // Largeur fixe pour un weekend (multiple de 60)

// Calculs dérivés pour la période de jour
const dayHoursCount = dayEnd - dayStart;               
const dayWidth = dayHoursCount * pixelsPerHourDay;       
const nightDuration = 12;                              
const workingDayTotalWidth = dayWidth + nightWidth;      

/* ------------------------------
   FONCTIONS UTILITAIRES
------------------------------ */
// Test si une date tombe un weekend
function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}
// Pour la période de jour (8h–22h) : calcule l'offset en demi-heures
function computeDayOffset(hour, minute) {
  const halfSlot = Math.floor(minute / 30);
  const demiHeures = (hour - dayStart) * 2 + halfSlot;
  return demiHeures * (pixelsPerHourDay / 2);
}
// Pour la période de nuit (22h–8h) : calcule l'offset en fonction des demi-heures
function computeNightOffset(hour, minute) {
  const halfSlot = Math.floor(minute / 30);
  let delta;
  if (hour >= dayEnd) {
    delta = (hour - dayEnd) * 2 + halfSlot;
  } else {
    delta = (hour + (24 - dayEnd)) * 2 + halfSlot;
  }
  return delta * (nightWidth / 20);
}
// Retourne l'offset total en pixels à partir d'une date
function getOffsetFromDate(date) {
  const calendarStart = new Date(window.calendarStart.getFullYear(), window.calendarStart.getMonth(), window.calendarStart.getDate());
  const interventionDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  let cumulativeOffset = 0;
  let current = new Date(calendarStart);
  while (current < interventionDay) {
    cumulativeOffset += isWeekend(current) ? weekendWidth : workingDayTotalWidth;
    current.setDate(current.getDate() + 1);
  }
  
  if (isWeekend(interventionDay)) {
    return cumulativeOffset;
  } else {
    const h = date.getHours();
    const m = date.getMinutes();
    if (h >= dayStart && h < dayEnd) {
      return cumulativeOffset + computeDayOffset(h, m);
    } else {
      return cumulativeOffset + dayWidth + computeNightOffset(h, m);
    }
  }
}
// Conversion inverse d'un offset vers une date
function computeDateTimeFromOffset(x) {
  const calendarStart = new Date(window.calendarStart.getFullYear(), window.calendarStart.getMonth(), window.calendarStart.getDate());
  let dayOffset = x;
  let current = new Date(calendarStart);
  while (true) {
    const width = isWeekend(current) ? weekendWidth : workingDayTotalWidth;
    if (dayOffset < width) break;
    dayOffset -= width;
    current.setDate(current.getDate() + 1);
  }
  
  if (isWeekend(current)) {
    return current;
  } else {
    if (dayOffset < dayWidth) {
      const demiHeureSlots = Math.round(dayOffset / (pixelsPerHourDay / 2));
      const hoursOffset = Math.floor(demiHeureSlots / 2);
      const minutes = (demiHeureSlots % 2) * 30;
      let d = new Date(current);
      d.setHours(dayStart + hoursOffset, minutes, 0, 0);
      return d;
    } else {
      const offsetNight = dayOffset - dayWidth;
      const demiHeureSlots = Math.round(offsetNight / (nightWidth / 20));
      let totalNightHours = demiHeureSlots / 2;
      let d = new Date(current);
      let hour = dayEnd + totalNightHours;
      if (hour >= 24) {
        hour -= 24;
      }
      d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
      return d;
    }
  }
}
// Retourne le libellé d'une intervention en fonction de l'heure
function getInterventionLabel(date) {
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isWeekend(date)) {
    return `Intervention<br>${timeStr} (Weekend)`;
  }
  const h = date.getHours();
  return h >= dayStart && h < dayEnd ? `Intervention<br>${timeStr}` : `Intervention<br>${timeStr} (Nuit)`;
}

/* ------------------------------
   REDIMENSIONNEMENT DES INTERVENTIONS
------------------------------ */
function setupResizable(element) {
  interact(element).resizable({
    edges: { left: true, right: true },
    modifiers: [
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: pixelsPerHourDay / 2, y: 1 })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }]
      })
    ],
    inertia: false
  })
  .on('resizemove', function(event) {
    const target = event.target;
    
    let currentLeft = parseFloat(target.style.left) || 0;
    let currentWidth = parseFloat(target.style.width) || 0;
  
    let newLeft = currentLeft + (event.deltaRect.left || 0);
    let newWidth = currentWidth + event.deltaRect.width;
  
    const gridStep = pixelsPerHourDay / 2;
    newLeft = Math.round(newLeft / gridStep) * gridStep;
    newWidth = Math.round(newWidth / gridStep) * gridStep;
  
    target.style.left = `${newLeft}px`;
    target.style.width = `${newWidth}px`;
  
    const newStartDate = computeDateTimeFromOffset(newLeft);
    const newEndDate = computeDateTimeFromOffset(newLeft + newWidth);

    target.dataset.timestamp = newStartDate.toISOString();
    target.dataset.endtimestamp = newEndDate.toISOString();

    updateInterventionLabel(target);
    updateTrajetBlocks(target);
  }).on('resizeend', function(event) {
    // Lorsque le redimensionnement est terminé, mettre à jour la BDD
    updateInterventionDB(event.target);
  });
}
function updateInterventionLabel(interventionElement) {
  const currentId = interventionElement.dataset.id;
  // Utiliser la valeur globale stockée dans dataset.technicianRow
  const techGlobal = interventionElement.dataset.technicianRow;
  const clientName = interventionElement.dataset.clientName || "";
  const ville = interventionElement.dataset.ville || "";

  // On affiche "INST (1,2)" par exemple
  const instLine = document.createElement("div");
  instLine.className = "inst-line";
  instLine.innerText = "INST";

  const clientLine = document.createElement("div");
  clientLine.className = "client-line";
  clientLine.innerText = clientName;

  const villeLine = document.createElement("div");
  villeLine.className = "ville-line";
  villeLine.innerText = ville;

  interventionElement.innerHTML = "";
  interventionElement.appendChild(instLine);
  interventionElement.appendChild(clientLine);
  interventionElement.appendChild(villeLine);

  if (currentId) {
    interventionElement.dataset.id = currentId;
  }
  // On conserve dataset.technicianRow pour l'affichage global

  // On peut ajouter une classe CSS si plusieurs techniciens sont affectés
  if (techGlobal && techGlobal.indexOf(",") !== -1) {
    interventionElement.classList.add("multiple-tech");
  } else {
    interventionElement.classList.remove("multiple-tech");
  }

  requestAnimationFrame(() => {
    adjustFontSizeToFit(instLine, 12, 8);
    adjustFontSizeToFit(clientLine, 12, 8);
    adjustFontSizeToFit(villeLine, 12, 8);
  });
}
function adjustFontSizeToFit(element, maxFontSize, minFontSize) {
  // D'abord, essayer de forcer le texte sur une seule ligne
  element.style.whiteSpace = "nowrap";
  let fontSize = maxFontSize;
  element.style.fontSize = fontSize + "px";
  
  // Boucle de réduction de la police tant que le texte déborde et qu'on est au-dessus du minimum
  while (element.scrollWidth > element.clientWidth && fontSize > minFontSize) {
    fontSize = Math.max(fontSize - 0.5, minFontSize);
    element.style.fontSize = fontSize + "px";
  }
  
  // Si, même avec le minimum, le texte déborde, alors autoriser le wrapping
  if (element.scrollWidth > element.clientWidth) {
    element.style.whiteSpace = "normal";
  }
}
  

function setupResizableTrajetLeft(trajetBlock) {
  // Détruire l'instance existante pour éviter les superpositions d'écouteurs
  interact(trajetBlock).unset();

  // On conserve la grille d'un pas fixe (ici 15px) qui convient à votre échelle,
  // 15px correspondant à 0.5h si 30px = 1h.
  const gridStep = 15;
  console.log("setupResizableTrajetLeft - Initialisation du bloc:", {
    id: trajetBlock.id,
    initialLeft: trajetBlock.style.left,
    initialWidth: trajetBlock.style.width
  });
  
  interact(trajetBlock).resizable({
    edges: { left: true, right: false, top: false, bottom: false },
    modifiers: [
      // Le snap sur la grille garantit que le déplacement se fait par pas
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: gridStep, y: 1 })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }]
      }),
      // On force une taille minimum de 30px (correspondant à 1h)
      interact.modifiers.restrictSize({
        min: { width: 30, height: 0 }
      })
    ],
    inertia: false
  }).on('resizemove', function (event) {
    const target = event.target;
    let currentLeft = parseFloat(target.style.left) || 0;
    let currentWidth = parseFloat(target.style.width) || 0;
    const rightEdge = currentLeft + currentWidth;
    
    // Calcul du nouveau left en tenant compte du delta sur le côté gauche
    let newLeft = currentLeft + event.deltaRect.left;
    newLeft = Math.round(newLeft / gridStep) * gridStep;
    
    // Calcul de la nouvelle largeur en gardant le côté droit fixe
    let newWidth = rightEdge - newLeft;
    newWidth = Math.max(newWidth, 30); // respect du minimum (1h)
    
    target.style.left = newLeft + "px";
    target.style.width = newWidth + "px";
    
    // Vous pouvez ajouter ici d'autres logs ou traiter le scroll du fond si nécessaire
    console.log("Trajet-left resizemove:", {
      currentLeft: currentLeft,
      currentWidth: currentWidth,
      newLeft: newLeft,
      newWidth: newWidth
    });
  });
}
function setupResizableTrajetRight(trajetBlock) {
  // On détruit l'instance précédente pour éviter tout conflit
  interact(trajetBlock).unset();

  const gridStep = 15;
  interact(trajetBlock).resizable({
    edges: { left: false, right: true, top: false, bottom: false },
    modifiers: [
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: gridStep, y: 1 })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }]
      }),
      interact.modifiers.restrictSize({
        min: { width: 30, height: 0 }
      })
    ],
    inertia: false
  }).on('resizemove', function (event) {
    const target = event.target;
    let currentWidth = parseFloat(target.style.width) || 0;
    // Calcul de la nouvelle largeur avec delta sur le côté droit
    let newWidth = currentWidth + event.deltaRect.width;
    newWidth = Math.round(newWidth / gridStep) * gridStep;
    newWidth = Math.max(newWidth, 30); // minimum de 1h
      
    target.style.width = newWidth + "px";
      
    console.log("Trajet-right resizemove:", {
      currentWidth: currentWidth,
      newWidth: newWidth,
      eventDeltaWidth: event.deltaRect.width
    });
  });
}

async function loadInterventions() {
    // Définir la plage du planning à partir de window.calendarStart et window.calendarEnd
    const start = window.calendarStart; 
    const end = window.calendarEnd;
  
    // Construire l'URL avec les dates de début et de fin en ISO
    const url = `http://localhost:3000/api/interventions?start=${start.toISOString()}&end=${end.toISOString()}`;
  
    try {
      const response = await fetch(url);
      const interventions = await response.json();
      console.log("Interventions chargées:", interventions.length);
  
      // Pour chaque intervention récupérée, vérifier si les dates se trouvent dans la plage du calendrier
      interventions.forEach(interventionData => {
        const interventionStart = new Date(interventionData.dateDebut);
        const interventionEnd = new Date(interventionData.dateFin);
  
        // Si l'intervention est hors de la plage affichée, on l'ignore
        if (interventionStart < window.calendarStart || interventionEnd > window.calendarEnd) {
          console.warn(`Intervention ignorée (hors plage): ${interventionData._id}`);
          return;
        }
  
        // Utiliser la fonction modifiée addInterventionFromDB qui gère maintenant plusieurs technicianRow.
        // Cette fonction va créer pour chaque valeur présente dans interventionData.technicianRow (séparée par des virgules)
        // un élément d'intervention dans la timeline correspondante.
        addInterventionFromDB(interventionData);
  
        // Vérifier et recharger les blocs de trajet associés, s'ils sont définis dans l'intervention
        if (interventionData.trajetLeftDateDebut && interventionData.trajetLeftDateFin) {
          addTrajetFromDB(interventionData, "left");
        }
        if (interventionData.trajetRightDateDebut && interventionData.trajetRightDateFin) {
          addTrajetFromDB(interventionData, "right");
        }
      });
    } catch (err) {
      console.error("Erreur lors du chargement des interventions :", err);
    }
}
function addInterventionFromDB(interventionData) {
  // Supprime les clones existants pour repartir d'une base propre
  const existingClones = document.querySelectorAll(`.intervention[data-id="${interventionData._id}"]`);
  existingClones.forEach(clone => {
    if (clone.parentElement) {
      clone.parentElement.removeChild(clone);
    }
  });

  // Récupération de la chaîne globale des techniciens
  const techGlobal = (interventionData.technicianRow || "1").trim();
  const techArray = techGlobal.split(",").map(t => t.trim()).filter(t => t !== "");

  techArray.forEach(function(localTech) {
    const div = document.createElement("div");
    div.className = "intervention";

    // Copier les informations principales
    div.dataset.id = interventionData._id;
    div.dataset.timestamp = interventionData.dateDebut;
    div.dataset.endtimestamp = interventionData.dateFin;
    div.dataset.ticketName = interventionData.ticketName || "";
    div.dataset.clientName = interventionData.clientName || "";
    div.dataset.ville = interventionData.ville || "";
    div.dataset.technicianRow = techGlobal; // valeur globale

    // Copier aussi les informations de trajet si elles existent
    if (interventionData.trajetLeftDateDebut) {
      div.dataset.trajetLeftDateDebut = interventionData.trajetLeftDateDebut;
    }
    if (interventionData.trajetLeftDateFin) {
      div.dataset.trajetLeftDateFin = interventionData.trajetLeftDateFin;
    }
    if (interventionData.trajetRightDateDebut) {
      div.dataset.trajetRightDateDebut = interventionData.trajetRightDateDebut;
    }
    if (interventionData.trajetRightDateFin) {
      div.dataset.trajetRightDateFin = interventionData.trajetRightDateFin;
    }

    // Enregistrer la valeur locale (pour le placement dans la ligne)
    div.dataset.localTech = localTech;

    // Calcul de la position et de la largeur à partir des dates
    const startDate = new Date(interventionData.dateDebut);
    const x = getOffsetFromDate(startDate);
    div.style.left = x + "px";
    const endDate = new Date(interventionData.dateFin);
    const x2 = getOffsetFromDate(endDate);
    div.style.width = (x2 - x) + "px";
    div.style.position = "absolute";

    updateInterventionLabel(div);
    // updateTrajetBlocks(div);

    // Insérer le clone dans le conteneur correspondant à la ligne technicien
    const targetTimeline = document.querySelector(`#calendar .technician-row[data-row="${localTech}"] .timeline-content`);
    if (targetTimeline) {
      targetTimeline.appendChild(div);
    } else {
      console.error("Conteneur de timeline non trouvé pour la ligne :", localTech);
    }

    // Configure le déplacement et le redimensionnement pour synchroniser les clones
    interact(div).draggable({
      modifiers: [
        interact.modifiers.snap({
          targets: [interact.snappers.grid({ x: pixelsPerHourDay / 2, y: 1 })],
          range: Infinity,
          relativePoints: [{ x: 0, y: 0 }]
        })
      ],
      listeners: {
        move(event) {
          const target = event.target;
          let currentLeft = parseFloat(target.style.left) || 0;
          let newLeft = currentLeft + event.dx;
          const gridStep = pixelsPerHourDay / 2;
          newLeft = Math.round(newLeft / gridStep) * gridStep;
          const clones = document.querySelectorAll(`.intervention[data-id="${target.dataset.id}"]`);
          clones.forEach(clone => {
            clone.style.left = `${newLeft}px`;
            const newDate = computeDateTimeFromOffset(newLeft);
            clone.dataset.timestamp = newDate.toISOString();
            const cloneWidth = parseFloat(clone.style.width) || 0;
            const newEndDate = computeDateTimeFromOffset(newLeft + cloneWidth);
            clone.dataset.endtimestamp = newEndDate.toISOString();
            updateInterventionLabel(clone);
            updateTrajetBlocks(clone);
          });
        },
        end(event) {
          updateInterventionDB(event.target);
        }
      }
    });
    
    setupResizable(div);
    console.log("Intervention ajoutée pour localTech:", {
      id: div.dataset.id,
      localTech: div.dataset.localTech,
      technicianRow: div.dataset.technicianRow,
      left: div.style.left,
      width: div.style.width
    });
  });
}
function addTrajetFromDB(interventionData, direction) {
  console.log("[addTrajetFromDB] Début pour l'intervention _id =", interventionData._id, "avec direction =", direction);
  if (direction !== "left" && direction !== "right") {
    console.error("[addTrajetFromDB] La direction doit être 'left' ou 'right'. Reçu :", direction);
    return;
  }

  // Sélection de tous les clones pour cette intervention
  const clones = document.querySelectorAll(`.intervention[data-id="${interventionData._id}"]`);
  console.log("[addTrajetFromDB] Nombre de clones trouvés :", clones.length);
  if (!clones.length) {
    console.error("[addTrajetFromDB] Aucune intervention trouvée pour l'id", interventionData._id);
    return;
  }

  // Reconstruction du tableau de trajets à partir des données de l'intervention
  let trajetArray = [];
  if (direction === "left") {
    if (interventionData.trajetLeft && Array.isArray(interventionData.trajetLeft) && interventionData.trajetLeft.length > 0) {
      trajetArray = interventionData.trajetLeft;
      console.log("[addTrajetFromDB] Utilisation du tableau trajetLeft existant :", trajetArray);
    } else if (interventionData.trajetLeftDateDebut && interventionData.trajetLeftDateFin) {
      trajetArray.push({
        dateDebut: interventionData.trajetLeftDateDebut,
        dateFin: interventionData.trajetLeftDateFin
      });
      console.log("[addTrajetFromDB] Création d'un tableau avec un trajet pour gauche :", trajetArray);
    } else {
      console.warn("[addTrajetFromDB] Pas de données de trajet gauche trouvées.");
    }
  } else { // direction === "right"
    if (interventionData.trajetRight && Array.isArray(interventionData.trajetRight) && interventionData.trajetRight.length > 0) {
      trajetArray = interventionData.trajetRight;
      console.log("[addTrajetFromDB] Utilisation du tableau trajetRight existant :", trajetArray);
    } else if (interventionData.trajetRightDateDebut && interventionData.trajetRightDateFin) {
      trajetArray.push({
        dateDebut: interventionData.trajetRightDateDebut,
        dateFin: interventionData.trajetRightDateFin
      });
      console.log("[addTrajetFromDB] Création d'un tableau avec un trajet pour droite :", trajetArray);
    } else {
      console.warn("[addTrajetFromDB] Pas de données de trajet droite trouvées.");
    }
  }

  // Pour chaque clone, créer le bloc trajet si nécessaire
  clones.forEach(clone => {
    let trajetIdsKey = (direction === "left") ? "trajetLeftIds" : "trajetRightIds";
    let currentIds = [];
    try {
      currentIds = JSON.parse(clone.dataset[trajetIdsKey] || "[]");
    } catch(e) {
      console.error("[addTrajetFromDB] Erreur de parsing pour", trajetIdsKey, "dans le clone _id =", clone.dataset.id, e);
      currentIds = [];
    }
    console.log("[addTrajetFromDB] Clone _id =", clone.dataset.id, "données actuelles", trajetIdsKey, "=", currentIds);

    trajetArray.forEach((trajet, index) => {
      if (!currentIds[index]) {
        console.log(`[addTrajetFromDB] Création du bloc trajet pour le clone _id = ${clone.dataset.id}, index = ${index}`);
        createTrajetBlockForClone(clone, trajet, direction, index);
      } else {
        console.log(`[addTrajetFromDB] Bloc trajet déjà existant pour le clone _id = ${clone.dataset.id}, index = ${index}`);
      }
    });
  });

  console.log("[addTrajetFromDB] Fin de la fonction pour l'intervention _id =", interventionData._id);
}
function updateInterventionDB(interventionElement) {
  console.log("[updateInterventionDB] Début pour intervention _id =", interventionElement.dataset.id);
  
  // Récupération de l'ID
  let id = interventionElement.dataset.id;
  // On récupère tous les clones existants (même si seul un clone est affiché)
  let clones = document.querySelectorAll(`.intervention[data-id="${id || ''}"]`);
  console.log("[updateInterventionDB] Nombre de clones trouvés :", clones.length);

  // Fusion des valeurs de trajet pour ne pas écraser les données existantes (cf. version précédente)
  const mergedValues = Array.from(clones).reduce((acc, clone) => {
    if (!acc.trajetLeftDateDebut && clone.dataset.trajetLeftDateDebut && clone.dataset.trajetLeftDateDebut.trim() !== "") {
      acc.trajetLeftDateDebut = clone.dataset.trajetLeftDateDebut;
      console.log("[updateInterventionDB] trajetLeftDateDebut trouvé dans clone _id =", clone.dataset.id, ":", acc.trajetLeftDateDebut);
    }
    if (!acc.trajetLeftDateFin && clone.dataset.trajetLeftDateFin && clone.dataset.trajetLeftDateFin.trim() !== "") {
      acc.trajetLeftDateFin = clone.dataset.trajetLeftDateFin;
      console.log("[updateInterventionDB] trajetLeftDateFin trouvé dans clone _id =", clone.dataset.id, ":", acc.trajetLeftDateFin);
    }
    if (!acc.trajetRightDateDebut && clone.dataset.trajetRightDateDebut && clone.dataset.trajetRightDateDebut.trim() !== "") {
      acc.trajetRightDateDebut = clone.dataset.trajetRightDateDebut;
      console.log("[updateInterventionDB] trajetRightDateDebut trouvé dans clone _id =", clone.dataset.id, ":", acc.trajetRightDateDebut);
    }
    if (!acc.trajetRightDateFin && clone.dataset.trajetRightDateFin && clone.dataset.trajetRightDateFin.trim() !== "") {
      acc.trajetRightDateFin = clone.dataset.trajetRightDateFin;
      console.log("[updateInterventionDB] trajetRightDateFin trouvé dans clone _id =", clone.dataset.id, ":", acc.trajetRightDateFin);
    }
    return acc;
  }, {
    trajetLeftDateDebut: null,
    trajetLeftDateFin: null,
    trajetRightDateDebut: null,
    trajetRightDateFin: null
  });
  console.log("[updateInterventionDB] Valeurs fusionnées :", mergedValues);

  const technicianValue = "Technician " + (interventionElement.dataset.technicianRow || "1");
  const interventionData = {
    dateDebut: new Date(interventionElement.dataset.timestamp),
    dateFin: new Date(interventionElement.dataset.endtimestamp),
    ticketName: interventionElement.dataset.ticketName || "",
    clientName: interventionElement.dataset.clientName || "",
    ville: interventionElement.dataset.ville || "",
    technicianRow: interventionElement.dataset.technicianRow || "",
    technician: technicianValue,
    trajetLeftDateDebut: mergedValues.trajetLeftDateDebut,
    trajetLeftDateFin: mergedValues.trajetLeftDateFin,
    trajetRightDateDebut: mergedValues.trajetRightDateDebut,
    trajetRightDateFin: mergedValues.trajetRightDateFin
  };

  console.log("[updateInterventionDB] Données préparées pour update :", interventionData);

  // Vérification des dates
  if (isNaN(interventionData.dateDebut.getTime()) || isNaN(interventionData.dateFin.getTime())) {
    console.error("[updateInterventionDB] Dates invalides :", interventionData.dateDebut, interventionData.dateFin);
    return;
  }

  // Si l'ID est défini, on fait un update via PUT
  if (id && id.trim() !== "" && id !== "undefined") {
    console.log("[updateInterventionDB] Mise à jour via PUT pour _id =", id);
    fetch(`http://localhost:3000/api/interventions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interventionData)
    })
    .then(response => response.json())
    .then(data => {
      console.log("[updateInterventionDB] Intervention mise à jour dans la BD :", data);

      // Vérifier si l'intervention concerne plusieurs techniciens
      if (data.technicianRow && data.technicianRow.indexOf(",") !== -1) {
        // On recrée tous les clones visuellement via addInterventionFromDB
        addInterventionFromDB(data);
      } else {
        // Sinon, mise à jour des clones existants
        clones.forEach(clone => {
          clone.dataset.ticketName = data.ticketName || interventionData.ticketName;
          clone.dataset.clientName = data.clientName || interventionData.clientName;
          clone.dataset.ville = data.ville || interventionData.ville;
          clone.dataset.technicianRow = data.technicianRow || interventionData.technicianRow;
          if (mergedValues.trajetLeftDateDebut) {
            clone.dataset.trajetLeftDateDebut = mergedValues.trajetLeftDateDebut;
          }
          if (mergedValues.trajetLeftDateFin) {
            clone.dataset.trajetLeftDateFin = mergedValues.trajetLeftDateFin;
          }
          if (mergedValues.trajetRightDateDebut) {
            clone.dataset.trajetRightDateDebut = mergedValues.trajetRightDateDebut;
          }
          if (mergedValues.trajetRightDateFin) {
            clone.dataset.trajetRightDateFin = mergedValues.trajetRightDateFin;
          }
          const dDebut = new Date(data.dateDebut);
          const dFin = new Date(data.dateFin);
          clone.dataset.timestamp = !isNaN(dDebut.getTime()) ? dDebut.toISOString() : clone.dataset.timestamp;
          clone.dataset.endtimestamp = !isNaN(dFin.getTime()) ? dFin.toISOString() : clone.dataset.endtimestamp;
          updateInterventionLabel(clone);
          updateTrajetBlocks(clone);
          console.log("[updateInterventionDB] Clone mis à jour:", clone);
        });
      }
    })
    .catch(err => console.error("[updateInterventionDB] Erreur lors de la mise à jour:", err));
  } else {
    // Sinon, création via POST
    console.log("[updateInterventionDB] Pas d'ID trouvé, création via POST");
    fetch('http://localhost:3000/api/interventions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interventionData)
    })
    .then(response => response.json())
    .then(data => {
      console.log("[updateInterventionDB] Nouvelle intervention créée dans la BD :", data);
      // On recrée tous les clones pour être sûr d'avoir tous les blocs visuels
      addInterventionFromDB(data);
    })
    .catch(err => console.error("[updateInterventionDB] Erreur lors de la création:", err));
  }
}
function updateTrajetBlocks(intervention, propagate = true) {
  // Calculer la position de l'intervention
  const left = parseFloat(intervention.style.left) || 0;
  const width = parseFloat(intervention.style.width) || 0;
  const right = left + width;
  
  // Gestion du trajet gauche
  try {
    let leftIds = JSON.parse(intervention.dataset.trajetLeftIds || "[]");
    // Si aucune instance de bloc trajet gauche n'est présente et que les données existent...
    if ((!leftIds || leftIds.length === 0) && 
        intervention.dataset.trajetLeftDateDebut && 
        intervention.dataset.trajetLeftDateFin) {
      // Créer le bloc trajet gauche pour ce clone avec l'index 0
      createTrajetBlockForClone(intervention, {
        dateDebut: intervention.dataset.trajetLeftDateDebut,
        dateFin: intervention.dataset.trajetLeftDateFin
      }, "left", 0);
      // Récupération du tableau mis à jour
      leftIds = JSON.parse(intervention.dataset.trajetLeftIds || "[]");
    } else if (leftIds && leftIds.length > 0) {
      // Sinon, réajuster la position des blocs existants
      leftIds.forEach(id => {
        const trajetEl = document.getElementById(id);
        if (trajetEl) {
          const trajWidth = parseFloat(trajetEl.style.width) || 30;
          trajetEl.style.left = (left - trajWidth) + "px";
        }
      });
    }
  } catch (err) {
    console.error("Erreur lors du traitement du trajet gauche :", err);
  }
  
  // Gestion du trajet droit
  try {
    let rightIds = JSON.parse(intervention.dataset.trajetRightIds || "[]");
    if ((!rightIds || rightIds.length === 0) && 
        intervention.dataset.trajetRightDateDebut && 
        intervention.dataset.trajetRightDateFin) {
      // Créer le bloc trajet droit pour ce clone (index 0)
      createTrajetBlockForClone(intervention, {
        dateDebut: intervention.dataset.trajetRightDateDebut,
        dateFin: intervention.dataset.trajetRightDateFin
      }, "right", 0);
      rightIds = JSON.parse(intervention.dataset.trajetRightIds || "[]");
    } else if (rightIds && rightIds.length > 0) {
      rightIds.forEach(id => {
        const trajetEl = document.getElementById(id);
        if (trajetEl) {
          trajetEl.style.left = right + "px";
        }
      });
    }
  } catch (err) {
    console.error("Erreur lors du traitement du trajet droit :", err);
  }
  
  // Propagation aux clones pour garantir la cohérence du DOM
  if (propagate && intervention.dataset.id) {
    const clones = document.querySelectorAll(`.intervention[data-id="${intervention.dataset.id}"]`);
    clones.forEach(clone => {
      if (clone !== intervention) {
        updateTrajetBlocks(clone, false);
      }
    });
  }
}
async function deleteInterventionFromDB(interventionElement) {
  // Vérifier que l'intervention a un ID (lié à la BDD)
  if (!interventionElement.dataset.id) {
    console.error("ID intervention non défini, impossible de supprimer de la BD");
    return;
  }
  
  try {
    // Envoyer la requête DELETE vers l'API
    const response = await fetch(`http://localhost:3000/api/interventions/${interventionElement.dataset.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log("Intervention supprimée de la BD");
      
      // Supprimer les blocs trajet associés (gauche et droite)
      if (interventionElement.dataset.trajetLeftId) {
        const trajetLeft = document.getElementById(interventionElement.dataset.trajetLeftId);
        if (trajetLeft && trajetLeft.parentElement) {
          trajetLeft.parentElement.removeChild(trajetLeft);
        }
      }
      if (interventionElement.dataset.trajetRightId) {
        const trajetRight = document.getElementById(interventionElement.dataset.trajetRightId);
        if (trajetRight && trajetRight.parentElement) {
          trajetRight.parentElement.removeChild(trajetRight);
        }
      }
      
      // Supprimer l'élément intervention lui-même du DOM
      if (interventionElement.parentElement) {
        interventionElement.parentElement.removeChild(interventionElement);
      }
    } else {
      console.error("Erreur lors de la suppression:", response.statusText);
    }
  } catch (err) {
    console.error("Erreur lors de la suppression dans la BD:", err);
  }
}  
async function addIntervention(contextClickData) {
  if (!contextClickData) return;
  const { offsetX, timeline } = contextClickData;
  
  // Déduire la ligne technicien à partir du conteneur timeline
  let technicianRow = "1"; // valeur par défaut
  const rowContainer = timeline.closest(".technician-row");
  if (rowContainer && rowContainer.dataset.row) {
    technicianRow = rowContainer.dataset.row;
  }
  
  // Calculer la position de départ (snappedX) en fonction de la grille (pixelsPerHourDay/2)
  const snappedX = Math.round(offsetX / (pixelsPerHourDay / 2)) * (pixelsPerHourDay / 2);
  const startDate = computeDateTimeFromOffset(snappedX);
  
  let defaultWidth;
  // Définir une largeur par défaut qui dépend si c'est en journée ou la nuit
  if (isWeekend(startDate) || (startDate.getHours() >= dayStart && startDate.getHours() < dayEnd)) {
    defaultWidth = 2 * pixelsPerHourDay;
  } else {
    defaultWidth = 4 * (nightWidth / 20);
  }
  
  const endDate = computeDateTimeFromOffset(snappedX + defaultWidth);
  
  console.log("Création intervention:", {
    offsetInitial: offsetX,
    snappedX: snappedX,
    startDate: startDate.toISOString(),
    defaultWidth: defaultWidth,
    endDate: endDate.toISOString(),
    technicianRow: technicianRow
  });
  
  // Création de l'élément intervention (le bloc qui sera placé sur la timeline)
  const div = document.createElement("div");
  div.className = "intervention";
  
  // Stocker les informations essentielles dans le dataset
  div.dataset.timestamp = startDate.toISOString();
  div.dataset.endtimestamp = endDate.toISOString();
  div.dataset.ticketName = "";
  div.dataset.clientName = "";
  div.dataset.ville = "";
  // Pour un nouvel élément, la propriété technicianRow contient la ligne du technicien sur laquelle il est créé
  div.dataset.technicianRow = technicianRow;
  
  div.style.position = "absolute";
  div.style.left = `${snappedX}px`;
  div.style.width = `${defaultWidth}px`;
  
  // Configurer les interactions (déplacement, redimensionnement) pour que l'élément reste synchronisé avec les dates
  interact(div).draggable({
    modifiers: [
      interact.modifiers.snap({
        targets: [interact.snappers.grid({ x: pixelsPerHourDay / 2, y: 1 })],
        range: Infinity,
        relativePoints: [{ x: 0, y: 0 }]
      })
    ],
    listeners: {
      move(event) {
        const target = event.target;
        // Calculer la nouvelle position
        let currentLeft = parseFloat(target.style.left) || 0;
        let newLeft = currentLeft + event.dx;
        const gridStep = pixelsPerHourDay / 2;
        newLeft = Math.round(newLeft / gridStep) * gridStep;
        
        // Récupérer tous les clones de cette intervention (ayant le même data-id)
        const clones = document.querySelectorAll(`.intervention[data-id="${target.dataset.id}"]`);
        clones.forEach(clone => {
          // Mettre à jour la position horizontale de chaque clone
          clone.style.left = `${newLeft}px`;
          // Calculer la nouvelle date de début
          const newDate = computeDateTimeFromOffset(newLeft);
          clone.dataset.timestamp = newDate.toISOString();
          // Conserver la largeur actuelle pour recalculer la date de fin
          const cloneWidth = parseFloat(clone.style.width) || 0;
          const newEndDate = computeDateTimeFromOffset(newLeft + cloneWidth);
          clone.dataset.endtimestamp = newEndDate.toISOString();
          // Mettre à jour l'affichage (label et blocs trajets)
          updateInterventionLabel(clone);
          updateTrajetBlocks(clone);
        });
      },
      end(event) {
        // Lors de la fin du déplacement, on met à jour la BDD
        // Ici, on peut appeler updateInterventionDB sur l'élément déclencheur (tous les clones ont le même id)
        updateInterventionDB(event.target);
      }
    }
  });
  
  setupResizable(div);
  
  // Insérer l'élément dans la timeline correspondant à la ligne technicien
  let targetTimeline = document.querySelector(
    `#calendar .technician-row[data-row="${technicianRow}"] .timeline-content`
  );
  if (!targetTimeline) {
    console.warn(`Conteneur pour la ligne ${technicianRow} non trouvé, utilisation du conteneur par défaut`);
    targetTimeline = timeline;
  }
  targetTimeline.appendChild(div);
  
  // Ouvrir immédiatement le formulaire pour saisir les infos complémentaires
  afficherFormulaireIntervention(div);
  
  // Une fois créé, on actualise le label après un court délai pour s'assurer que le reflow s'est bien fait
  setTimeout(() => {
    updateInterventionLabel(div);
  }, 50);
  
  console.log("Intervention ajoutée (création):", {
    technicianRow: div.dataset.technicianRow,
    left: div.style.left,
    width: div.style.width
  });
}
function addTrajetBlock(intervention, direction) {
  // Récupérer la position de l'intervention depuis le style (en pixels)
  const interventionLeft = parseFloat(intervention.style.left) || 0;
  const interventionWidth = parseFloat(intervention.style.width) || 0;

  // Création du bloc trajet dans le DOM (la partie visuelle)
  const trajetBlock = document.createElement("div");
  trajetBlock.className = "trajet-block " + (direction === "left" ? "trajet-left" : "trajet-right");
  console.log("Classe assignée (creation) :", trajetBlock.className);
  trajetBlock.style.width = "30px";
  trajetBlock.innerHTML = "🚘";
  
  // Générer un ID unique pour ce bloc trajet
  const trajetId = "trajet_" + Math.random().toString(36).substr(2, 9);
  trajetBlock.id = trajetId;
  
  // ASSIGNATION : stocker l'id de l'intervention dans le dataset du trajet
  trajetBlock.dataset.interventionId = intervention.dataset.id;

  // Positionner le bloc trajet en fonction de la direction
  const interventionLeftPos = parseFloat(intervention.style.left) || 0;
  const interventionWidthVal = parseFloat(intervention.style.width) || 0;
  if (direction === "left") {
    // Place le bloc à gauche de l'intervention
    trajetBlock.style.left = (interventionLeftPos - 30) + "px";
    intervention.dataset.trajetLeftId = trajetId;
    console.log("addTrajetBlock - trajetLeftId défini:", trajetId);
    
    // Calculer et enregistrer les dates du trajet (exemple par défaut : 1h avant l'intervention)
    const interventionStart = new Date(intervention.dataset.timestamp);
    const trajetLeftDateFin = interventionStart;
    const trajetLeftDateDebut = new Date(interventionStart.getTime() - 60 * 60 * 1000);
    intervention.dataset.trajetLeftDateDebut = trajetLeftDateDebut.toISOString();
    intervention.dataset.trajetLeftDateFin = trajetLeftDateFin.toISOString();
  } else if (direction === "right") {
    const interventionRight = interventionLeftPos + interventionWidthVal;
    trajetBlock.style.left = interventionRight + "px";
    intervention.dataset.trajetRightId = trajetId;
    console.log("addTrajetBlock - trajetRightId défini:", trajetId);
    
    // Pour le trajet droit, définir par défaut un trajet de 1h après l'intervention
    const interventionEnd = new Date(intervention.dataset.endtimestamp);
    const trajetRightDateDebut = interventionEnd;
    const trajetRightDateFin = new Date(interventionEnd.getTime() + 60 * 60 * 1000);
    intervention.dataset.trajetRightDateDebut = trajetRightDateDebut.toISOString();
    intervention.dataset.trajetRightDateFin = trajetRightDateFin.toISOString();
  }
  
  // Empêcher la propagation du clic sur le bloc trajet
  trajetBlock.addEventListener("mousedown", (e) => { e.stopPropagation(); });
  
  // Ajouter le bloc trajet dans le conteneur parent de l'intervention
  const timelineContainer = intervention.parentElement;
  if (timelineContainer) {
    timelineContainer.appendChild(trajetBlock);
  } else {
    console.error("Impossible de trouver le conteneur pour le trajet.");
  }
  
  console.log("Bloc trajet ajouté:", {
    direction: direction,
    interventionLeft: interventionLeft,
    interventionWidth: interventionWidth,
    trajetBlockLeft: trajetBlock.style.left,
    trajetBlockWidth: trajetBlock.style.width,
    trajetId: trajetId,
    interventionIdFromTrajet: trajetBlock.dataset.interventionId
  });
  
  updateInterventionDB(intervention);
}
function createTrajetBlockForClone(clone, trajet, direction, index) {
  console.log(`[createTrajetBlockForClone] Début pour clone _id = ${clone.dataset.id}, direction = ${direction}, index = ${index}`);
  
  const trajetBlock = document.createElement("div");
  trajetBlock.className = "trajet-block " + (direction === "left" ? "trajet-left" : "trajet-right");
  trajetBlock.style.position = "absolute";
  trajetBlock.style.width = "30px";
  trajetBlock.innerHTML = "🚘";  // Vous pouvez adapter l'icône selon le type de trajet
  trajetBlock.style.pointerEvents = "auto";
  trajetBlock.style.zIndex = "1000";

  trajetBlock.addEventListener("mousedown", (e) => { 
    e.stopPropagation(); 
    console.log("[createTrajetBlockForClone] mousedown sur trajetBlock _id =", trajetBlock.id);
  });

  // Générer un ID unique pour ce bloc trajet
  const trajetId = "trajet_" + clone.dataset.id + "_" + direction + "_" + index + "_" + Math.random().toString(36).substr(2, 4);
  trajetBlock.id = trajetId;
  trajetBlock.dataset.interventionId = clone.dataset.id;
  console.log("[createTrajetBlockForClone] ID généré pour trajetBlock :", trajetId);

  // Positionner le bloc trajet en fonction du clone et de la direction
  const cloneLeft = parseFloat(clone.style.left) || 0;
  const cloneWidth = parseFloat(clone.style.width) || 0;
  const cloneRight = cloneLeft + cloneWidth;
  let newLeft = (direction === "left") ? (cloneLeft - 30) : cloneRight;
  trajetBlock.style.left = newLeft + "px";
  console.log(`[createTrajetBlockForClone] Position calculée pour trajetBlock : left = ${trajetBlock.style.left} (cloneLeft=${cloneLeft}, cloneWidth=${cloneWidth})`);

  // Enregistrer les dates issues de l'objet trajet dans le dataset (format ISO)
  if (trajet.dateDebut) {
    trajetBlock.dataset.trajetDateDebut = new Date(trajet.dateDebut).toISOString();
  } else {
    console.warn("[createTrajetBlockForClone] Pas de dateDebut dans l'objet trajet pour clone _id =", clone.dataset.id);
  }
  if (trajet.dateFin) {
    trajetBlock.dataset.trajetDateFin = new Date(trajet.dateFin).toISOString();
  } else {
    console.warn("[createTrajetBlockForClone] Pas de dateFin dans l'objet trajet pour clone _id =", clone.dataset.id);
  }

  // Insertion dans le conteneur de la timeline
  const localTech = clone.dataset.localTech || clone.dataset.technicianRow;
  let targetTimeline = document.querySelector(
    `#calendar .technician-row[data-row="${localTech}"] .timeline-content`
  );
  if (!targetTimeline) {
    console.warn("[createTrajetBlockForClone] Conteneur timeline non trouvé pour localTech =", localTech, "Utilisation du parent du clone.");
    targetTimeline = clone.parentElement;
  }
  targetTimeline.appendChild(trajetBlock);
  console.log("[createTrajetBlockForClone] Bloc trajet ajouté au conteneur.", "targetTimeline =", targetTimeline);

  // Sauvegarder cet ID dans le dataset du clone
  let trajetIdsKey = (direction === "left") ? "trajetLeftIds" : "trajetRightIds";
  let currentIds = [];
  try {
    currentIds = JSON.parse(clone.dataset[trajetIdsKey] || "[]");
  } catch (e) {
    console.error("[createTrajetBlockForClone] Erreur de parsing pour", trajetIdsKey, "dans le clone _id =", clone.dataset.id, e);
    currentIds = [];
  }
  currentIds[index] = trajetId;
  clone.dataset[trajetIdsKey] = JSON.stringify(currentIds);
  console.log(`[createTrajetBlockForClone] Mise à jour du dataset du clone avec ${trajetIdsKey} =`, currentIds);

  // Configurer le redimensionnement du bloc trajet en fonction de la direction
  if (direction === "left") {
    setupResizableTrajetLeft(trajetBlock);
    console.log("[createTrajetBlockForClone] setupResizableTrajetLeft appliqué");
  } else {
    setupResizableTrajetRight(trajetBlock);
    console.log("[createTrajetBlockForClone] setupResizableTrajetRight appliqué");
  }
  
  console.log("[createTrajetBlockForClone] Fin pour clone _id =", clone.dataset.id, "avec trajetBlockID =", trajetBlock.id);
}
function changeTrajetType(trajet, type) {
  let icon = "";
  switch (type) {
    case "voiture":
      icon = "🚘";
      break;
    case "train":
      icon = "🚆";
      break;
    case "avion":
      icon = "✈️";
      break;
    default:
      console.error("Type inconnu:", type);
      return;
  }

  // Met à jour l'affichage du trajet et son dataset
  trajet.innerHTML = icon;
  trajet.dataset.trajetType = type;

  // Retrouver l'intervention associée grâce à dataset.interventionId
  const interventionId = trajet.dataset.interventionId;
  if (!interventionId) {
    console.warn("Aucune interventionId associé au trajet", trajet.id);
    return;
  }
  const intervention = document.querySelector(`.intervention[data-id="${interventionId}"]`);
  if (intervention) {
    if (trajet.classList.contains("trajet-left")) {
      intervention.dataset.trajetLeftType = type;
    } else if (trajet.classList.contains("trajet-right")) {
      intervention.dataset.trajetRightType = type;
    }
    console.log("Avant updateInterventionDB dans changeTrajetType, intervention.dataset :", intervention.dataset);
    updateInterventionDB(intervention);
  } else {
    console.warn("Aucune intervention trouvée pour le trajet modifié", trajet.id);
  }
  console.log(`Trajet mis à jour en type ${type}`);

  // Réinitialiser la fonctionnalité "resizable" sur le trajet pour reprendre le comportement
  if (trajet.classList.contains("trajet-left")) {
    setupResizableTrajetLeft(trajet);
  } else if (trajet.classList.contains("trajet-right")) {
    setupResizableTrajetRight(trajet);
  }
}
function deleteTrajet(direction, intervention) {
  let trajetId;
  if (direction === "left") {
    trajetId = intervention.dataset.trajetLeftId;
  } else if (direction === "right") {
    trajetId = intervention.dataset.trajetRightId;
  } else {
    console.error("La direction doit être 'left' ou 'right'.");
    return;
  }
  
  if (!trajetId) {
    console.warn("Aucun trajet trouvé pour la direction", direction);
    return;
  }
  
  // Pour tous les clones, supprimer le bloc trajet concerné s'il correspond au trajetId
  const clones = document.querySelectorAll(`.intervention[data-id="${intervention.dataset.id}"]`);
  clones.forEach(clone => {
    if ((direction === "left" && clone.dataset.trajetLeftId === trajetId) ||
        (direction === "right" && clone.dataset.trajetRightId === trajetId)) {
      const trajetBlock = document.getElementById(trajetId);
      if (trajetBlock && trajetBlock.parentElement) {
        trajetBlock.parentElement.removeChild(trajetBlock);
      }
      if (direction === "left") {
        delete clone.dataset.trajetLeftId;
        delete clone.dataset.trajetLeftDateDebut;
        delete clone.dataset.trajetLeftDateFin;
      } else {
        delete clone.dataset.trajetRightId;
        delete clone.dataset.trajetRightDateDebut;
        delete clone.dataset.trajetRightDateFin;
      }
    }
  });
  
  // Mettre à jour la BDD après la suppression
  updateInterventionDB(intervention);
  console.log(`Trajet ${direction} supprimé pour l'intervention ${intervention.dataset.id}`);
}
function deleteTrajetBlock(trajet) {
  // Retirer le bloc trajet du DOM
  if (trajet.parentElement) {
    trajet.parentElement.removeChild(trajet);
  }

  // Utiliser l'attribut dataset.interventionId pour retrouver l'intervention associée
  const interventionId = trajet.dataset.interventionId;
  if (!interventionId) {
    console.warn("Aucune interventionId associé au trajet", trajet.id);
    return;
  }
  const intervention = document.querySelector(`.intervention[data-id="${interventionId}"]`);

  if (intervention) {
    // Réinitialiser les champs du trajet en fonction de la direction
    if (trajet.classList.contains("trajet-left")) {
      intervention.dataset.trajetLeftId = "";
      intervention.dataset.trajetLeftDateDebut = "";
      intervention.dataset.trajetLeftDateFin = "";
      intervention.dataset.trajetLeftType = "";
    } else if (trajet.classList.contains("trajet-right")) {
      intervention.dataset.trajetRightId = "";
      intervention.dataset.trajetRightDateDebut = "";
      intervention.dataset.trajetRightDateFin = "";
      intervention.dataset.trajetRightType = "";
    }
    console.log("Avant updateInterventionDB dans deleteTrajetBlock, intervention.dataset :", intervention.dataset);
    updateInterventionDB(intervention);
  } else {
    console.warn("Aucune intervention trouvée pour le trajet supprimé", trajet.id);
  }
  console.log("Trajet supprimé");
}

/* ------------------------------
   GÉNÉRATION DU CALENDRIER & POSITIONNEMENT
------------------------------ */
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
function restoreInterventionPositions(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth, nightDuration) {
  document.querySelectorAll(".intervention").forEach(intervention => {
    const startTs = intervention.dataset.timestamp;
    const endTs = intervention.dataset.endtimestamp;
    if (!startTs || !endTs) return;
    const startDate = new Date(startTs);
    const endDate = new Date(endTs);
    
    // Vérifier si l'intervention est en dehors de la plage du calendrier
    if (startDate < window.calendarStart || endDate > window.calendarEnd) {
      // Retirer l'intervention du DOM
      if (intervention.parentElement) {
        intervention.parentElement.removeChild(intervention);
      }
      return;
    }
    
    const x = getOffsetFromDate(startDate);
    intervention.style.left = `${x}px`;
    intervention.innerHTML = getInterventionLabel(startDate);
  });
}

/* ------------------------------
   CONFIGURATION DU MENU CONTEXTUEL
------------------------------ */
function setupContextMenu(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth, nightDuration) {
  const contextMenu = document.getElementById("context-menu");
  let contextClickData = null;

  document.addEventListener("contextmenu", (e) => {
    // Masquer tout menu contextuel affiché
    contextMenu.style.display = "none";

    // Si le clic droit se fait sur un trajet
    const trajet = e.target.closest(".trajet-block");
    if (trajet) {
      e.preventDefault();
      contextMenu.innerHTML = `
        <ul>
          <li id="supprimer-trajet">Supprimer intervention</li>
          <li id="changer-type">Changer type</li>
        </ul>
      `;
      contextMenu.style.top = e.pageY + "px";
      contextMenu.style.left = e.pageX + "px";
      contextMenu.style.display = "block";

      // Événement pour supprimer le trajet
      document.getElementById("supprimer-trajet").addEventListener("click", () => {
        deleteTrajetBlock(trajet);
        contextMenu.style.display = "none";
      });

      // Événement pour changer le type
      const changerTypeOption = document.getElementById("changer-type");
      if (changerTypeOption) {
        changerTypeOption.addEventListener("click", (evt) => {
          evt.stopPropagation(); // Empêche la propagation immédiate
          console.log("Option 'changer type' cliquée pour le trajet", trajet.id);
          // Remplacer le menu par le sous-menu avec choix et icônes
          contextMenu.innerHTML = `
            <ul>
              <li id="changer-type-voiture">Voiture 🚘</li>
              <li id="changer-type-train">Train 🚆</li>
              <li id="changer-type-avion">Avion ✈️</li>
            </ul>
          `;
          // Attacher les événements pour chaque option du sous-menu
          document.getElementById("changer-type-voiture").addEventListener("click", () => {
            changeTrajetType(trajet, "voiture");
            contextMenu.style.display = "none";
          });
          document.getElementById("changer-type-train").addEventListener("click", () => {
            changeTrajetType(trajet, "train");
            contextMenu.style.display = "none";
          });
          document.getElementById("changer-type-avion").addEventListener("click", () => {
            changeTrajetType(trajet, "avion");
            contextMenu.style.display = "none";
          });
        });
      } else {
        console.warn("L'élément 'changer-type' n'a pas été trouvé");
      }
      return;
    }

    // Si le clic droit se fait sur une intervention
    const intervention = e.target.closest(".intervention");
    if (intervention && intervention.offsetWidth > 0 && intervention.offsetHeight > 0) {
      e.preventDefault();
      const trajetGaucheLabel = intervention.dataset.trajetLeftId ? "Supprimer trajet (gauche)" : "Ajouter trajet (gauche)";
      const trajetDroiteLabel = intervention.dataset.trajetRightId ? "Supprimer trajet (droite)" : "Ajouter trajet (droite)";

      contextMenu.innerHTML = `
        <ul>
          <li id="modifier-intervention">Modifier intervention</li>
          <li id="supprimer-intervention">Supprimer intervention</li>
          <li id="trajet-gauche">${trajetGaucheLabel}</li>
          <li id="trajet-droite">${trajetDroiteLabel}</li>
        </ul>
      `;
      contextMenu.style.top = e.pageY + "px";
      contextMenu.style.left = e.pageX + "px";
      contextMenu.style.display = "block";

      document.getElementById("modifier-intervention").addEventListener("click", () => {
        afficherFormulaireIntervention(intervention);
        contextMenu.style.display = "none";
      });

      document.getElementById("supprimer-intervention").addEventListener("click", () => {
        deleteInterventionFromDB(intervention);
        contextMenu.style.display = "none";
      });

      document.getElementById("trajet-gauche").addEventListener("click", () => {
        if (intervention.dataset.trajetLeftId) {
          deleteTrajet("left", intervention);
        } else {
          addTrajetBlock(intervention, "left");
        }
        contextMenu.style.display = "none";
      });

      document.getElementById("trajet-droite").addEventListener("click", () => {
        if (intervention.dataset.trajetRightId) {
          deleteTrajet("right", intervention);
        } else {
          addTrajetBlock(intervention, "right");
        }
        contextMenu.style.display = "none";
      });
      return;
    }

    // Si le clic droit se fait sur la zone timeline
    const timeline = e.target.closest(".timeline-content");
    if (timeline) {
      e.preventDefault();
      const parentOffset = timeline.getBoundingClientRect().left + window.scrollX;
      const offsetX = e.pageX - parentOffset;
      contextClickData = { offsetX, timeline };

      contextMenu.innerHTML = `
        <ul>
          <li id="add-intervention">Ajouter intervention</li>
        </ul>
      `;
      contextMenu.style.top = e.pageY + "px";
      contextMenu.style.left = e.pageX + "px";
      contextMenu.style.display = "block";

      document.getElementById("add-intervention").addEventListener("click", () => {
        addIntervention(contextClickData);
        contextMenu.style.display = "none";
      });
    }
  });

  // Écouteur global de clic : ne masque le menu que si le clic se fait en dehors du menu contextuel
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#context-menu")) {
      contextMenu.style.display = "none";
      contextClickData = null;
    }
  });

  // Double clic sur une intervention lance le formulaire de modification
  document.addEventListener("dblclick", (e) => {
    const intervention = e.target.closest(".intervention");
    if (intervention) {
      afficherFormulaireIntervention(intervention);
    }
  });
}

async function afficherFormulaireIntervention(interventionElement) {
  const isModification = !!interventionElement;
  const ticketExist = isModification ? (interventionElement.dataset.ticketName || "") : "";
  const clientExist = isModification ? (interventionElement.dataset.clientName || "") : "";
  const villeExist = isModification ? (interventionElement.dataset.ville || "") : "";
  
  // Lire la chaîne complète depuis technicianRow (par exemple "1,2,3")
  const techRowsExist = isModification ? (interventionElement.dataset.technicianRow || "") : "";
  const techRowsArray = techRowsExist.split(",").map(t => t.trim()).filter(t => t !== "");
  console.log("Valeur de techRowsArray :", techRowsArray);
  
  const modalOverlay = document.createElement("div");
  modalOverlay.className = "modal-overlay";
  Object.assign(modalOverlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "2000"
  });

  const modalForm = document.createElement("div");
  modalForm.className = "modal-form";
  Object.assign(modalForm.style, {
    backgroundColor: "white",
    padding: "20px",
    borderRadius: "5px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
    maxWidth: "300px",
    width: "90%"
  });

  // Création du formulaire avec cases à cocher pour choisir plusieurs techniciens (Lucas = "1", Romain = "2", Rodrigue = "3")
  modalForm.innerHTML = `
    <div class="modal-field">
      <label for="ticket-name">Nom Ticket :</label>
      <input type="text" id="ticket-name" value="${ticketExist}" />
    </div>
    <div class="modal-field">
      <label for="client-name">Client :</label>
      <input type="text" id="client-name" value="${clientExist}" />
    </div>
    <div class="modal-field">
      <label for="ville">Ville :</label>
      <input type="text" id="ville" value="${villeExist}" />
    </div>
    <div class="modal-field">
      <label>Techniciens :</label>
      <div>
        <label>
          <input type="checkbox" name="technician" value="1" ${techRowsArray.includes("1") ? "checked" : ""}>
          Lucas
        </label>
        <br/>
        <label>
          <input type="checkbox" name="technician" value="2" ${techRowsArray.includes("2") ? "checked" : ""}>
          Romain
        </label>
        <br/>
        <label>
          <input type="checkbox" name="technician" value="3" ${techRowsArray.includes("3") ? "checked" : ""}>
          Rodrigue
        </label>
      </div>
    </div>
    <p>Cliquez en dehors pour valider.</p>
  `;

  modalOverlay.appendChild(modalForm);
  document.body.appendChild(modalOverlay);

  modalOverlay.addEventListener("click", async (e) => {
    if (e.target === modalOverlay) {
      const ticketName = modalForm.querySelector("#ticket-name").value;
      const clientName = modalForm.querySelector("#client-name").value;
      const ville = modalForm.querySelector("#ville").value;

      const checkboxes = modalForm.querySelectorAll("input[name='technician']:checked");
      const selectedTechs = Array.from(checkboxes).map(cb => cb.value);
      const technicianRow = selectedTechs.join(",");

      if (interventionElement) {
        interventionElement.dataset.ticketName = ticketName;
        interventionElement.dataset.clientName = clientName;
        interventionElement.dataset.ville = ville;
        interventionElement.dataset.technicianRow = technicianRow;
        updateInterventionLabel(interventionElement);
      }

      document.body.removeChild(modalOverlay);
      updateInterventionDB(interventionElement);
    }
  });

  return modalOverlay;
}


/* ------------------------------
   SCROLL & NAVIGATION
------------------------------ */
function setupScrollDrag() {
  let isScrolling = false;
  let scrollStartX = 0;
  let initialScroll = 0;
  const scrollElem = document.querySelector(".timeline-scroll");
  
  scrollElem.addEventListener("mousedown", (e) => {
    if (e.target.closest(".intervention")) return;
    isScrolling = true;
    scrollStartX = e.pageX;
    initialScroll = scrollElem.scrollLeft;
    scrollElem.style.cursor = "grabbing";
  });
  
  document.addEventListener("mouseup", () => {
    isScrolling = false;
    scrollElem.style.cursor = "grab";
  });
  
  document.addEventListener("mousemove", (e) => {
    if (!isScrolling) return;
    e.preventDefault();
    const dx = e.pageX - scrollStartX;
    scrollElem.scrollLeft = initialScroll - dx;
  });
}

/* ------------------------------
   INITIALISATION DU CALENDRIER
------------------------------ */
export function initCalendar() {
  const today = new Date();
  if (!window.calendarStart) {
    window.calendarStart = new Date(today.getFullYear(), today.getMonth(), 1);
    window.calendarEnd = new Date(today.getFullYear(), today.getMonth()+1, 0);
  }
  
  const totalWidth = generateHeader(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth);
  generateTechnicianLines(totalWidth);
  //restoreInterventionPositions(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth, nightDuration);
  setupContextMenu(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth, nightDuration);
  setupScrollDrag();
  addStartOfDayLines();
  loadInterventions();

  function scrollToToday() {
    const scrollElem = document.querySelector(".timeline-scroll");
    if (!scrollElem) return;
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), dayStart, 0, 0, 0);
    const targetScroll = getOffsetFromDate(targetDate);
    const currentScroll = scrollElem.scrollLeft;
    const twentyDaysWidth = 20 * workingDayTotalWidth;
    const behavior = Math.abs(targetScroll - currentScroll) > twentyDaysWidth ? 'auto' : 'smooth';
    scrollElem.scrollTo({ left: targetScroll, behavior });
  } 
  function navigateToDate() {
    const inputEl = document.getElementById('goto-date');
    if (!inputEl) return;
    const inputValue = inputEl.value.trim();
    if (!inputValue) return;
    const parts = inputValue.split('/');
    if (parts.length !== 2) {
      console.error("Format invalide, utilisez jj/mm");
      return;
    }
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    if (isNaN(day) || isNaN(month)) {
      console.error("Valeurs numériques invalides dans l'input");
      return;
    }
    const currentYear = (new Date()).getFullYear();
    const targetDate = new Date(currentYear, month, day, dayStart, 0, 0, 0);
    
    // Vérifier si targetDate est en dehors de l'affichage actuel du calendrier
    let calendarUpdated = false;
    if (targetDate < window.calendarStart) {
      // Extension vers la gauche
      const currentStart = window.calendarStart;
      // On recule d'un mois : on positionne calendarStart au 1er jour du mois précédent
      window.calendarStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
      updateCalendar();
      calendarUpdated = true;
    } else if (targetDate > window.calendarEnd) {
      // Extension vers la droite
      const currentEnd = window.calendarEnd;
      // On avance d'un mois : on positionne calendarEnd à la fin du mois suivant
      window.calendarEnd = new Date(currentEnd.getFullYear(), currentEnd.getMonth() + 2, 0);
      updateCalendar();
      calendarUpdated = true;
    }
    
    // Attendre un court délai si le calendrier a été mis à jour pour que le reflow se fasse,
    // puis effectuer le scroll vers la targetDate.
    const doScroll = () => {
      const scrollElem = document.querySelector(".timeline-scroll");
      if (!scrollElem) return;
      
      const targetScroll = getOffsetFromDate(targetDate);
      const currentScroll = scrollElem.scrollLeft;
      const twentyDaysWidth = 20 * workingDayTotalWidth;
      const behavior = Math.abs(targetScroll - currentScroll) > twentyDaysWidth ? 'auto' : 'smooth';
      scrollElem.scrollTo({ left: targetScroll, behavior });
    };
    
    if (calendarUpdated) {
      // Un délai pour laisser le temps à updateCalendar de redessiner l'affichage
      setTimeout(doScroll, 100);
    } else {
      doScroll();
    }
  }
  
  
  // Scroll vers aujourd'hui dès le chargement
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scrollToToday);
  } else {
    scrollToToday();
  }
  
  document.getElementById('scroll-today-btn').addEventListener('click', scrollToToday);
  document.getElementById('goto-date').addEventListener('input', (e) => {
    const inputValue = e.target.value.trim();
    if (/^\d{2}\/\d{2}$/.test(inputValue)) {
      navigateToDate();
    }
  });

  // Fonction pour re-créer l'affichage du calendrier à partir des bornes window.calendarStart et window.calendarEnd
function updateCalendar() {
    // Réinitialiser les en-têtes
    document.getElementById("header-timeline").innerHTML = "";
    document.getElementById("day-labels").innerHTML = "";
    
    // Regénérer l'en-tête et les lignes du calendrier
    const totalWidth = generateHeader(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth);
    generateTechnicianLines(totalWidth);
    restoreInterventionPositions(dayStart, dayEnd, pixelsPerHourDay, dayWidth, nightWidth, weekendWidth, nightDuration);
    addStartOfDayLines();
    loadInterventions();
    // On peut éventuellement repositionner le scroll (par exemple vers "aujourd’hui")
    // scrollToToday();
  }
  
  const scrollContainer = document.querySelector(".timeline-scroll");
  const gotoDateInput = document.getElementById('goto-date');

  document.getElementById('expand-right').addEventListener('click', function() {
    // Étendre la plage d'affichage d'un mois vers la droite
    const currentEnd = window.calendarEnd;
    window.calendarEnd = new Date(currentEnd.getFullYear(), currentEnd.getMonth() + 2, 0);
    updateCalendar();
    
    // Calculer le nouvel offset en ajoutant 40px et en déduire la date correspondante
    if (scrollContainer && gotoDateInput) {
      const currentScroll = scrollContainer.scrollLeft;
      const targetOffset = currentScroll + 280;
      const targetDate = computeDateTimeFromOffset(targetOffset);
      
      // Formater la date "jj/mm"
      const day = targetDate.getDate().toString().padStart(2, '0');
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      gotoDateInput.value = `${day}/${month}`;
      
      // Utiliser la fonction navigateToDate qui scrolle vers la date indiquée
      navigateToDate();
    }
  });
  document.getElementById('expand-left').addEventListener('click', function() {
    // Calculer la date correspondant à l'offset courant moins 40px,
    // afin de revenir presque à la même position en termes de calendrier
    if (scrollContainer && gotoDateInput) {
      const currentScroll = scrollContainer.scrollLeft;
      const targetOffset = currentScroll - 40;
      const targetDate = computeDateTimeFromOffset(targetOffset);
      
      const day = targetDate.getDate().toString().padStart(2, '0');
      const month = (targetDate.getMonth() + 1).toString().padStart(2, '0');
      gotoDateInput.value = `${day}/${month}`;
    }
    
    // Étendre la plage d'affichage d'un mois vers la gauche
    const currentStart = window.calendarStart;
    window.calendarStart = new Date(currentStart.getFullYear(), currentStart.getMonth() - 1, 1);
    updateCalendar();
    
    if (scrollContainer && gotoDateInput) {
      navigateToDate();
    }
  });
}
