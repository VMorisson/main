// initCalendar.js

import { DataManager } from './dataManager.js';
import { TimelineRenderer} from './timelineRenderer.js';
import { computeOffsetFromDateTime, computeDateTimeFromOffset } from "./dateHelpers.js";


export async function initCalendar() {
  const dataManager = new DataManager();
  const timeline = new TimelineRenderer(dataManager);
  let displayStart = null;
  let displayEnd = null;

  window.computeOffsetFromDateTime = computeOffsetFromDateTime;
  window.computeDateTimeFromOffset = computeDateTimeFromOffset;
  window.dataManager = dataManager;
  window.timeline = timeline;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end   = new Date(now.getFullYear(), now.getMonth()+1, 0);
  displayStart = new Date(start);
  displayEnd = new Date(end);
  
  await timeline.initCalendarWithAuth(displayStart, displayEnd);
  await dataManager.loadInterventions(displayStart, displayEnd);
  timeline.renderAllInterventions();
  
  if (typeof timeline.startPollingUpdates === "function") {
    timeline.startPollingUpdates();
  }
  scrollToDate(new Date());
  enableHorizontalDragScroll(".timeline-scroll");

  // 7) Bouton “Aujourd’hui”
  const scrollTodayBtn = document.getElementById("scroll-today-btn");
  if (scrollTodayBtn) {
    scrollTodayBtn.addEventListener("click", () => {
      scrollToDate(new Date());
    });
  }

  // 8) Champ “goto-date”
  const gotoDateInput = document.getElementById("goto-date");
  if (gotoDateInput) {
    gotoDateInput.addEventListener("input", () => {
      const val = gotoDateInput.value;
      if (/^\d{2}\/\d{2}$/.test(val)) {
        handleGotoDate(val);
      }
    });
  }

  const btnExpandLeft = document.getElementById("expand-left-btn");
if (btnExpandLeft) {
  btnExpandLeft.addEventListener("click", async () => {
    const scrollContainer = document.querySelector(".timeline-scroll");
    const visibleDateBefore = computeDateTimeFromOffset(scrollContainer.scrollLeft);
  
    displayStart.setMonth(displayStart.getMonth() - 1);
    window.calendarStart = new Date(displayStart);
    window.calendarEnd = new Date(displayEnd);
  
    await timeline.initCalendar(displayStart, displayEnd);
    await dataManager.loadInterventions(displayStart, displayEnd);
    timeline.renderAllInterventions();
  
    const newOffset = computeOffsetFromDateTime(visibleDateBefore);
    scrollContainer.scrollLeft = newOffset - scrollContainer.clientWidth / 2;
  }); 
}

const btnExpandRight = document.getElementById("expand-right-btn");
if (btnExpandRight) {
  btnExpandRight.addEventListener("click", async () => {
    const scrollContainer = document.querySelector(".timeline-scroll");
    const visibleDateBefore = computeDateTimeFromOffset(scrollContainer.scrollLeft);
  
    displayEnd.setMonth(displayEnd.getMonth() + 1);
    window.calendarStart = new Date(displayStart);
    window.calendarEnd = new Date(displayEnd);
  
    await timeline.initCalendar(displayStart, displayEnd);
    await dataManager.loadInterventions(displayStart, displayEnd);
    timeline.renderAllInterventions();
  
    const newOffset = computeOffsetFromDateTime(visibleDateBefore);
    scrollContainer.scrollLeft = newOffset - scrollContainer.clientWidth / 2;
  });
}


  
  
  // ---------- Fonctions internes ----------
  function scrollToDate(date) {
    const timelineScroll = document.querySelector(".timeline-scroll");
    if (!timelineScroll) return;

    // Si timeline.getOffsetForDate(...) n’existe pas, importe getOffsetFromDate
    // depuis dateHelpers.js et l’utilise. Ex:
    // const offset = getOffsetFromDate(date);
    // timelineScroll.scrollLeft = offset - 100;
    if (typeof timeline.getOffsetForDate === 'function') {
      const offset = timeline.getOffsetForDate(date);
      timelineScroll.scrollLeft = offset - 100;
    }
  }

  function handleGotoDate(value) {
    const now = new Date();
    const currentYear = now.getFullYear();
  
    const parts = value.split("/");
    if (parts.length !== 2) {
      console.warn("Format attendu: jj/mm");
      return;
    }
  
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // JS month = 0-indexed
  
    // Crée les trois variantes autour de l’année actuelle
    const dates = [
      new Date(currentYear - 1, month, day),
      new Date(currentYear,     month, day),
      new Date(currentYear + 1, month, day)
    ];
  
    // Choisit la date la plus proche de maintenant
    let closest = dates[0];
    let minDiff = Math.abs(now - dates[0]);
  
    for (let i = 1; i < dates.length; i++) {
      const diff = Math.abs(now - dates[i]);
      if (diff < minDiff) {
        minDiff = diff;
        closest = dates[i];
      }
    }
  
    scrollToDate(closest);
  }
  
  function enableHorizontalDragScroll(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;
  
    let isDown = false;
    let startX;
    let scrollLeft;
  
    container.addEventListener("mousedown", (e) => {
      // Si la cible ou un de ses parents est en train d'être géré par interact.js => NE PAS scroller
      const isInteractTarget = e.target.closest(".intervention, .trajet-block");
      if (isInteractTarget) {
        // On laisse InteractJS faire son job (drag/resize)
        return;
      }
  
      // Sinon, drag scroll activé
      isDown = true;
      container.classList.add("dragging");
      startX = e.pageX - container.offsetLeft;
      scrollLeft = container.scrollLeft;
    });
  
    container.addEventListener("mouseleave", () => {
      isDown = false;
      container.classList.remove("dragging");
    });
  
    container.addEventListener("mouseup", () => {
      isDown = false;
      container.classList.remove("dragging");
    });
  
    container.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = (x - startX) * 1.5;
      container.scrollLeft = scrollLeft - walk;
    });
  }
  
  
}


