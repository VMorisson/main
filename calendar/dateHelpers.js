// dateHelpers.js

// --------------------------------------
// CONSTANTES DE BASE (modifiables)
export const dayStart = 8;           // Heure de début du jour (8h)
export const dayEnd = 18;           // Heure de fin du jour (20h)
export const pixelsPerHourDay = 30;  // Nombre de pixels pour 1h de journée
export const nightWidth = 60;        // Largeur fixe pour la nuit (22h–8h)
export const weekendWidth = 60;      // Largeur fixe pour un weekend
export const workingDayTotalWidth = (dayEnd - dayStart) * pixelsPerHourDay + nightWidth;

// --------------------------------------
// FONCTIONS UTILITAIRES

/**
 * Teste si une date est un weekend (samedi ou dimanche).
 * @param {Date} date - La date à tester.
 * @returns {boolean} true si weekend, false sinon.
 */
export function isWeekend(date) {
  const day = date.getDay(); 
  // 0 = dimanche, 6 = samedi
  return day === 0 || day === 6;
}

/**
 * Calcule l'offset en pixels pour la partie "journée" (entre dayStart et dayEnd).
 * @param {number} hour 
 * @param {number} minute 
 * @returns {number} offset en pixels
 */
function computeDayOffset(hour, minute) {
  // 1h = pixelsPerHourDay
  // 30min = pixelsPerHourDay / 2
  const halfSlot = Math.floor(minute / 30); 
  const demiHeures = (hour - dayStart) * 2 + halfSlot; 
  return demiHeures * (pixelsPerHourDay / 2);
}

/**
 * Calcule l'offset en pixels pour la partie "nuit" (entre dayEnd et dayStart).
 * @param {number} hour 
 * @param {number} minute 
 * @returns {number} offset en pixels
 */
function computeNightOffset(hour, minute) {
  const halfSlot = Math.floor(minute / 30);
  let delta;
  
  // ex. si hour >= 20 => on est entre 20h et minuit
  // sinon => on est entre minuit et 8h
  if (hour >= dayEnd) {
    delta = (hour - dayEnd) * 2 + halfSlot;
  } else {
    // hour (0..7) + (24 - 20) = +4 => on retombe sur un delta cohérent
    delta = (hour + (24 - dayEnd)) * 2 + halfSlot;
  }
  
  // la nuit est nightWidth pixels pour 12h => 12h = 24 demi-heures
  // => 1 demi-heure = nightWidth/24
  // On peut (selon ton choix) diviser par 20 ou 24, selon comment tu veux
  // répartir la nuit. Dans ton code existant, tu utilisais 20, d'autres mettent 24.
  // Ici, je reprends "nightWidth / 20" comme dans ton code initial.
  return delta * (nightWidth / 20);
}

/**
 * Retourne l'offset total en pixels à partir d'une date.
 * @param {Date} date 
 * @returns {number} offset en pixels
 */
export function getOffsetFromDate(date) {
  // On suppose que window.calendarStart est définie ailleurs (point de départ)
  // Mais si tu veux tout mettre ici, tu peux passer calendarStart en paramètre.
  if (!window.calendarStart) {
    console.warn("calendarStart non défini dans window !", date);
    return 0;
  }
  
  const calendarStart = new Date(
    window.calendarStart.getFullYear(),
    window.calendarStart.getMonth(),
    window.calendarStart.getDate()
  );
  const interventionDay = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  
  let cumulativeOffset = 0;
  let current = new Date(calendarStart);
  
  while (current < interventionDay) {
    if (isWeekend(current)) {
      cumulativeOffset += weekendWidth;
    } else {
      cumulativeOffset += workingDayTotalWidth;
    }
    // Passe au jour suivant
    current.setDate(current.getDate() + 1);
  }
  
  // Si c'est weekend => offset = cumulativeOffset (pas de jour/nuit)
  if (isWeekend(interventionDay)) {
    return cumulativeOffset;
  } else {
    const h = date.getHours();
    const m = date.getMinutes();
    if (h >= dayStart && h < dayEnd) {
      // en journée
      return cumulativeOffset + computeDayOffset(h, m);
    } else {
      // en nuit
      return cumulativeOffset + ( (dayEnd - dayStart) * pixelsPerHourDay ) + computeNightOffset(h, m);
    }
  }
}

/**
 * Fait l'inverse : convertit un offset en pixels en un objet Date.
 * @param {number} x - L'offset en pixels.
 * @returns {Date} la date calculée.
 */
export function computeDateTimeFromOffset(x) {
  if (!window.calendarStart) {
    console.warn("calendarStart non défini dans window !");
    return new Date();
  }
  const calendarStart = new Date(
    window.calendarStart.getFullYear(),
    window.calendarStart.getMonth(),
    window.calendarStart.getDate()
  );
  let dayOffset = x;
  let current = new Date(calendarStart);
  
  while (true) {
    const width = isWeekend(current) ? weekendWidth : workingDayTotalWidth;
    if (dayOffset < width) break;
    
    dayOffset -= width;
    current.setDate(current.getDate() + 1);
  }
  
  // Si weekend => renvoyer la date du matin du weekend
  if (isWeekend(current)) {
    return current;
  } else {
    // On distingue la partie "jour" (dayWidth) et la partie "nuit" (nightWidth)
    const dayWidth = (dayEnd - dayStart) * pixelsPerHourDay;
    if (dayOffset < dayWidth) {
      // Cas journée
      const demiHeureSlots = Math.round(dayOffset / (pixelsPerHourDay / 2));
      const hoursOffset = Math.floor(demiHeureSlots / 2);
      const minutes = (demiHeureSlots % 2) * 30;
      let d = new Date(current);
      d.setHours(dayStart + hoursOffset, minutes, 0, 0);
      return d;
    } else {
      // Cas nuit
      const offsetNight = dayOffset - dayWidth;
      const demiHeureSlots = Math.round(offsetNight / (nightWidth / 20));
      let totalNightHours = demiHeureSlots / 2; // 1 slot = 30 min
      
      let d = new Date(current);
      let hour = dayEnd + totalNightHours; 
      if (hour >= 24) {
        hour -= 24; // on repasse en 0..7
      }
      d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
      return d;
    }
  }
}

// Convertit une date en offset en pixels depuis le début du calendrier
export function computeOffsetFromDateTime(dateTime) {
  if (!window.heuresMap || window.heuresMap.length === 0) return 0;

  const found = window.heuresMap.find(h => {
    const hDateStr = h.date?.toDateString?.() || "(invalid)";
    const dDateStr = dateTime?.toDateString?.() || "(invalid)";
    const isSameDay = hDateStr === dDateStr;
    const match = isSameDay && (h.type === "hour" || h.type === "weekend");  
    return match;
  });
  
  

  if (!found) {
    console.warn("❌ Aucun segment trouvé pour:", dateTime.toString());
    return 0;
  }
  
  //if (found.type === "weekend") {
  // Offset au début du bloc weekend
  //  return found.start;
  //}
  //enlevé pour cause problème offset au début jour suivant quand offset dans nuit/weekend

  const daySegments = window.heuresMap.filter(h => h.date.toDateString() === found.date.toDateString());

  let offset = 0;
  for (let seg of daySegments) {
    if (seg.type === "hour") {
      const hourStart = new Date(seg.date);
      hourStart.setHours(seg.heure, 0, 0, 0);
      const hourEnd = new Date(hourStart);
      hourEnd.setHours(seg.heure + 1);

      if (dateTime >= hourStart && dateTime <= hourEnd){
        const elapsed = (dateTime - hourStart) / 3600000; // en heures
        offset += elapsed * pixelsPerHourDay;
        return seg.start + (elapsed * pixelsPerHourDay);
      }
    }
    offset = seg.end;
  }
  // 🛟 Fallback si aucun segment n’a capté la date
  console.warn("⛔ Aucun bloc 'hour' n’a capturé", dateTime, "→ fallback getOffsetFromDate()");
  return getOffsetFromDate(dateTime);
}

  
export function convertDurationToPixels(durationMs, startDate) {
    const hours = durationMs / (60 * 60 * 1000);
    const hour = startDate.getHours();
    if (hour >= dayStart && hour < dayEnd) {
      return hours * pixelsPerHourDay;
    } else {
      return hours * (nightWidth / 10);
    }
  }
  