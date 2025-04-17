$(document).ready(function() {
    const pixelsParHeureOuvree = 30; // Chaque bloc horaire (2h) = 60px
    const pixelsParHeureNuit = 5;
    let totalWidth = 0;
    const heuresMap = [];
  
    let start, end;
    let contextClickData = null;
  
    // Génération initiale
    generateHeader();
    generateTechnicianLines();
    scrollToToday();
  
    /* --- BOUTONS & INPUT DATE --- */
  
    $("#scroll-today-btn").click(function() {
      scrollToToday();
    });
  
    $("#goto-date").on("input", function () {
      const value = $(this).val().trim();
      const match = value.match(/^(\d{2})\/(\d{2})$/);
      if (!match) return;
      const [_, dayStr, monthStr] = match;
      const day = parseInt(dayStr, 10);
      const month = parseInt(monthStr, 10) - 1;
  
      const target = heuresMap.find(function(entry) {
        return entry.date.getDate() === day &&
               entry.date.getMonth() === month &&
               (entry.date.getDay() === 0 || entry.date.getDay() === 6 ? true : entry.heure === 8);
      });
      if (target) {
        scrollToTarget(target.start - 100);
      }
    });
  
    $("#expand-left").click(function() {
      const previousStart = new Date(start);
      start.setMonth(start.getMonth() - 1);
      refreshCalendar(function() {
        const target = heuresMap.find(function(entry) {
          return entry.date.toDateString() === previousStart.toDateString() &&
                 (entry.date.getDay() === 0 || entry.date.getDay() === 6 ? true : entry.heure === 8);
        });
        if (target) {
          scrollToTarget(target.start - 120);
        }
      });
    });
  
    $("#expand-right").click(function() {
      end.setMonth(end.getMonth() + 1);
      refreshCalendar();
    });
  
    /* --- FONCTIONS DE RÉGÉNÉRATION DU CALENDRIER --- */
  
    function refreshCalendar(callbackAfterScroll) {
      const currentScroll = $(".timeline-scroll").scrollLeft();
      $("#day-labels").empty();
      $("#header-timeline").empty();
      $("#calendar .timeline-content").empty();
  
      generateHeader();
      generateTechnicianLines();
  
      if (callbackAfterScroll) {
        callbackAfterScroll();
      } else {
        $(".timeline-scroll").scrollLeft(currentScroll);
      }
    }
  
    // Fonction de scroll vers "aujourd'hui" avec animation
    function scrollToToday(offset = 0) {
      const x = $("#calendar-container").data("scrollTodayX");
      scrollToTarget(x + offset);
    }
  
    /**
     * scrollToTarget(targetScroll)
     * - Si la distance à parcourir est supérieure à la largeur de 7 jours, le scroll est instantané.
     * - Sinon, il est animé sur 1000ms.
     */
    function scrollToTarget(targetScroll) {
      const currentScroll = $(".timeline-scroll").scrollLeft();
      const diff = Math.abs(targetScroll - currentScroll);
      let threshold = 0;
      $("#day-labels .day-block").each(function(index) {
        if(index < 7) {
          threshold += $(this).width();
        }
      });
      if(diff > threshold) {
        $(".timeline-scroll").scrollLeft(targetScroll);
      } else {
        $(".timeline-scroll").animate({ scrollLeft: targetScroll }, 1000);
      }
    }
  
    /* --- GÉNÉRATION DES EN-TÊTES (JOURS/HEURES) --- */
  
    function generateHeader() {
      const hourContainer = $("#header-timeline");
      const dayContainer = $("#day-labels");
      heuresMap.length = 0;
      totalWidth = 0;
  
      const today = new Date();
      if (!start || !end) {
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        end   = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      }
  
      let scrollTargetX = 0;
      const date = new Date(start);
  
      while (date <= end) {
        const jourStart = totalWidth;
        if (date.getDay() === 0 || date.getDay() === 6) {
          // Weekend : bloc unique de 100px
          hourContainer.append(
            "<div class='hour-block weekend-block' style='left:" + totalWidth + "px; width:100px;'>Weekend</div>"
          );
          heuresMap.push({
            heure: "weekend",
            start: totalWidth,
            end: totalWidth + 100,
            date: new Date(date)
          });
          totalWidth += 100;
          const jourWidth = totalWidth - jourStart;
          const labelJour = date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
          dayContainer.append(
            "<div class='day-block' style='left:" + jourStart + "px; width:" + jourWidth + "px;'>" + labelJour + "</div>"
          );
          dayContainer.append(
            "<div class='hour-line start-of-day' style='left:" + jourStart + "px; top: 0; height: 30px;'></div>"
          );
        } else {
          // Jour de semaine
          const heuresJour = [8, 10, 12, 14, 16, 18];
          heuresJour.forEach(function(heure) {
            const largeur = pixelsParHeureOuvree * 2; // 60px
            hourContainer.append(
              "<div class='hour-block' style='left:" + totalWidth + "px; width:" + largeur + "px;'>" + heure + "h</div>"
            );
            if (heure === 8) {
              hourContainer.append(
                "<div class='hour-line start-of-day' style='left:" + totalWidth + "px;'></div>"
              );
            }
            hourContainer.append(
              "<div class='hour-line' style='left:" + (totalWidth + largeur) + "px;'></div>"
            );
            heuresMap.push({
              heure: heure,
              start: totalWidth,
              end: totalWidth + largeur,
              date: new Date(date)
            });
            totalWidth += largeur;
          });
          // Bloc Nuit
          const largeurNuit = (pixelsParHeureNuit * 2) * 6;
          hourContainer.append(
            "<div class='hour-block night-block' style='left:" + totalWidth + "px; width:" + largeurNuit + "px;'>Nuit</div>"
          );
          // On enregistre le bloc nuit
          heuresMap.push({
            heure: "nuit",
            start: totalWidth,
            end: totalWidth + largeurNuit,
            date: new Date(date)
          });
          totalWidth += largeurNuit;
    
          const jourWidth = totalWidth - jourStart;
          const labelJour = date.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
          dayContainer.append(
            "<div class='day-block' style='left:" + jourStart + "px; width:" + jourWidth + "px;'>" + labelJour + "</div>"
          );
          dayContainer.append(
            "<div class='hour-line start-of-day' style='left:" + jourStart + "px; top: 0; height: 30px;'></div>"
          );
        }
        if (date.toDateString() === today.toDateString()){
          scrollTargetX = jourStart;
        }
        date.setDate(date.getDate() + 1);
      }
      hourContainer.css("width", totalWidth + "px");
      dayContainer.css("width", totalWidth + "px");
      $("#calendar-container").data("scrollTodayX", scrollTargetX);
    }
  
    /* --- GÉNÉRATION DES LIGNES TECHNICIENS --- */
  
    function generateTechnicianLines() {
      $("#calendar .technician-row .timeline-content").each(function() {
        const $timeline = $(this);
        $timeline.css({
          position: "relative",
          width: totalWidth + "px"
        });
        const $bg = $("<div class='timeline-background'></div>").css("width", totalWidth + "px");
        $timeline.append($bg);
    
        let addedStartLines = new Set();
        heuresMap.forEach(function(m) {
          if (m.date.getDay() === 0 || m.date.getDay() === 6) {
            if (!addedStartLines.has(m.start) && m.heure === "weekend") {
              $timeline.append(
                "<div class='weekend-overlay' style='left:" + m.start + "px; width:" + (m.end - m.start) + "px;'></div>"
              );
              $timeline.append(
                "<div class='hour-line start-of-day' style='left:" + m.start + "px;'></div>"
              );
              addedStartLines.add(m.start);
            }
          } else if (m.heure === "nuit") {
            $timeline.append(
              "<div class='night-overlay' style='left:" + m.start + "px; width:" + (m.end - m.start) + "px;'></div>"
            );
            $timeline.append(
              "<div class='hour-line' style='left:" + m.end + "px;'></div>"
            );
          } else {
            if (m.heure === 8 && !addedStartLines.has(m.start)) {
              $timeline.append(
                "<div class='hour-line start-of-day' style='left:" + m.start + "px;'></div>"
              );
              addedStartLines.add(m.start);
            }
            $timeline.append(
              "<div class='hour-line' style='left:" + m.end + "px;'></div>"
            );
          }
        });
      });
    }
  
    /* --- GESTION DU CLIC DROIT ET AJOUT D'INTERVENTION --- */
  
    $(document).on("contextmenu", ".timeline-grid", function(e) {
      e.preventDefault();
      let $timeline = $(e.target).closest(".timeline-content");
      if (!$timeline.length) {
        $timeline = $(e.target).closest(".row").find(".timeline-content");
      }
      if (!$timeline.length || !$timeline.closest("#calendar").length) {
        return;
      }
    
      const parentOffset = $timeline.offset().left;
      const offsetX = e.pageX - parentOffset;
      contextClickData = { offsetX, $timeline };
    
      $("#context-menu").css({
        top: e.pageY + "px",
        left: e.pageX + "px"
      }).fadeIn(100);
    });
    
    $(document).on("click", function(e) {
      if (!$(e.target).closest("#context-menu").length) {
        $("#context-menu").hide();
        contextClickData = null;
      }
    });
    
    $(document).on("click", "#add-intervention", function() {
      if (!contextClickData) return;
      const { offsetX, $timeline } = contextClickData;
      const snappedOffsetX = Math.round(offsetX / 15) * 15;
      const formattedTime = formatTimeFromOffset(snappedOffsetX);
    
      const $intervention = $("<div class='intervention'>Intervention<br>" + formattedTime + "</div>");
      $intervention.css({
        left: snappedOffsetX,
        zIndex: 1000
      });
      $timeline.append($intervention);
    
      $intervention.draggable({
        grid: [15, 0],
        scroll: false,
        containment: "parent",
        axis: "x",
        zIndex: 1000,
        drag: function(event, ui) {
          let newLeft = ui.position.left;
          let snappedLeft = Math.round(newLeft / 15) * 15;
          $(this).css({ left: snappedLeft });
          const newFormattedTime = formatTimeFromOffset(snappedLeft);
          $(this).html("Intervention<br>" + newFormattedTime);
        },
        stop: function(event, ui) {
          let newLeft = ui.position.left;
          let snappedLeft = Math.round(newLeft / 15) * 15;
          $(this).css({ left: snappedLeft });
          const newFormattedTime = formatTimeFromOffset(snappedLeft);
          $(this).html("Intervention<br>" + newFormattedTime);
        }
      });
    
      $("#context-menu").hide();
      contextClickData = null;
    });
    
    /* --- FONCTION DE CONVERSION DE POSITION EN DATE/HEURE FORMATÉE --- */
    function formatTimeFromOffset(x) {
      for (let { heure, start, end, date } of heuresMap) {
        if (x >= start && x < end) {
          const largeur = end - start;
          const ratio = (x - start) / largeur;
          if (heure === "weekend") {
            const dd = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
            const MM = (date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
            return dd + "/" + MM + " - Weekend";
          }
          if (heure === "nuit") {
            const dd = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
            const MM = (date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
            return dd + "/" + MM + " - Nuit";
          }
          const computedTime = heure + ratio * 2;
          const h = Math.floor(computedTime);
          const m = Math.round((computedTime - h) * 60);
          const hh = h < 10 ? "0" + h : h;
          const mm = m < 10 ? "0" + m : m;
          const dd = date.getDate() < 10 ? "0" + date.getDate() : date.getDate();
          const MM = (date.getMonth() + 1) < 10 ? "0" + (date.getMonth() + 1) : (date.getMonth() + 1);
          return dd + "/" + MM + " - " + hh + "H" + mm;
        }
      }
      return "";
    }
    
    /* --- DRAG TO SCROLL POUR LA ZONE PLANNING --- */
    let isScrolling = false;
    let scrollStartX;
    let initialScroll;
    
    $(".timeline-scroll").on("mousedown", function(e) {
      // Ne pas déclencher si on clique sur une intervention
      if ($(e.target).closest(".intervention").length) return;
      isScrolling = true;
      scrollStartX = e.pageX;
      initialScroll = $(this).scrollLeft();
      $(this).css("cursor", "grabbing");
    });
    
    $(document).on("mouseup", function() {
      isScrolling = false;
      $(".timeline-scroll").css("cursor", "grab");
    });
    
    $(document).on("mousemove", function(e) {
      if (!isScrolling) return;
      e.preventDefault();
      const diff = e.pageX - scrollStartX;
      $(".timeline-scroll").scrollLeft(initialScroll - diff);
    });
  });
  