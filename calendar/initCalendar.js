// initCalendar.js

import { DataManager } from './dataManager.js';
import { TimelineRenderer} from './timelineRenderer.js';
import { computeOffsetFromDateTime, computeDateTimeFromOffset } from "./dateHelpers.js";
import { waitForCalendar, setupContextMenuActions, setupFormModalActions, setupDoubleClickOnIntervention } from './interventionForm.js';

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
  const end   = new Date(now.getFullYear(), now.getMonth()+ 3, 0);
  displayStart = new Date(start);
  displayEnd = new Date(end);
  
  await timeline.initCalendarWithAuth(displayStart, displayEnd);
  await waitForLayoutReady(); // 💡 Ajouté : on attend que les lignes soient bien là
  await dataManager.loadInterventions(displayStart, displayEnd);
  timeline.renderAllInterventions();


  await waitForCalendar();
  setupContextMenuActions();
  setupFormModalActions();
  setupDoubleClickOnIntervention();	
  
  if (typeof timeline.startPollingUpdates === "function") {
    timeline.startPollingUpdates();
  }
  
  enableHorizontalDragScroll(".timeline-scroll");
  scrollToDate(new Date());
  // 7) Bouton “Aujourd’hui”
  const scrollTodayBtn = document.getElementById("scroll-today-btn");
  if (scrollTodayBtn) {
    scrollTodayBtn.addEventListener("click", () => {
      scrollToDate(new Date());
    });
  }

  const gotoDateInput = document.getElementById("goto-date");
if (gotoDateInput) {
  gotoDateInput.addEventListener("input", async () => {
    const val = gotoDateInput.value;
    if (/^\d{2}\/\d{2}$/.test(val)) {
      const targetDate = parseGotoDate(val);
      if (!targetDate) return;

      // Expand si besoin
      let expanded = false;

      while (targetDate < window.calendarStart) {
        displayStart.setMonth(displayStart.getMonth() - 1);
        window.calendarStart = new Date(displayStart);
        window.calendarEnd = new Date(displayEnd);
        expanded = true;
        await timeline.initCalendar(displayStart, displayEnd);
        await dataManager.loadInterventions(displayStart, displayEnd);
        timeline.renderAllInterventions();
      }

      while (targetDate > window.calendarEnd) {
        displayEnd.setMonth(displayEnd.getMonth() + 1);
        window.calendarStart = new Date(displayStart);
        window.calendarEnd = new Date(displayEnd);
        expanded = true;
        await timeline.initCalendar(displayStart, displayEnd);
        await dataManager.loadInterventions(displayStart, displayEnd);
        timeline.renderAllInterventions();
      }

      if (expanded) {
        console.log("📈 Timeline étendue pour inclure", targetDate);
      }

      scrollToDate(targetDate);
    }
  });
}

// Petit helper pour convertir le texte "jj/mm" en vraie Date
function parseGotoDate(val) {
  const now = new Date();
  const [day, month] = val.split("/").map(Number);

  if (!day || !month) return null;

  const currentYear = now.getFullYear();
  const candidates = [
    new Date(currentYear - 1, month - 1, day),
    new Date(currentYear, month - 1, day),
    new Date(currentYear + 1, month - 1, day)
  ];

  // Trouver la date la plus proche de maintenant
  let closest = candidates[0];
  let minDiff = Math.abs(now - closest);
  for (let i = 1; i < candidates.length; i++) {
    const diff = Math.abs(now - candidates[i]);
    if (diff < minDiff) {
      minDiff = diff;
      closest = candidates[i];
    }
  }

  return closest;
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
    const previousScroll = scrollContainer.scrollLeft;

    displayEnd.setMonth(displayEnd.getMonth() + 1);
    window.calendarStart = new Date(displayStart);
    window.calendarEnd = new Date(displayEnd);

    await timeline.initCalendar(displayStart, displayEnd);
    await dataManager.loadInterventions(displayStart, displayEnd);
    timeline.renderAllInterventions();

    // Scroll un peu plus loin après expansion
    scrollContainer.scrollLeft = previousScroll + scrollContainer.clientWidth / 2;
  });
}



  
  
  // ---------- Fonctions internes ----------
  function scrollToDate(date) {
    const timelineScroll = document.querySelector(".timeline-scroll");
    if (!timelineScroll) return;
  
    if (typeof timeline.getOffsetForDate === 'function') {
      // 🔁 Crée une nouvelle date avec la même année/mois/jour, mais à 8h00
      const eightAM = new Date(date);
      eightAM.setHours(8, 0, 0, 0);
  
      const offset = timeline.getOffsetForDate(eightAM);
      const viewportWidth = timelineScroll.clientWidth;
      const dynamicPadding = 150;
  
      const targetScroll = Math.max(0, offset - dynamicPadding);
  
      console.log(`📦 scrollToDate(${date.toLocaleDateString()} @ 08:00)`);
      console.log(`↳ Offset à 8h: ${offset}px, Viewport: ${viewportWidth}px, Padding: ${dynamicPadding}px`);
      console.log(`🎯 Final scrollLeft: ${targetScroll}px`);
  
      timelineScroll.scrollLeft = targetScroll;
    } else {
      console.warn("❌ timeline.getOffsetForDate non défini");
    }
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

function waitForLayoutReady(maxWait = 500) {
  return new Promise(resolve => {
    const deadline = Date.now() + maxWait;
    function check() {
      const rowsReady = document.querySelectorAll(".technician-row .timeline-content").length > 0;
      if (rowsReady || Date.now() > deadline) {
        resolve();
      } else {
        requestAnimationFrame(check);
      }
    }
    check();
  });
}


