// dataManager.js

import { API_BASE } from "./dateHelpers.js";

export class DataManager {
  constructor() {
    this.interventions = [];
  }
    
  
  
    /**
     * Charge toutes les interventions entre "start" et "end" (dates).
     * NOTE: Dans ton server.js actuel, la route GET /api/interventions
     * ne filtre pas vraiment. Tu récupères TOUTES les interventions.
     * 
     * Tu peux quand même utiliser start/end dans l'URL au cas où tu modifies le serveur
     * pour faire un vrai filtrage.
     * 
     * @param {Date} start - date de début
     * @param {Date} end   - date de fin
     * @returns {Promise<Array>} Renvoie this.interventions (tableau d'objets)
     */
    async loadInterventions(start, end) { 
      const url = `${API_BASE}/api/interventions?start=${start.toISOString()}&end=${end.toISOString()}`;
      //http://localhost:3000
      try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const rawData = await response.json();
        const adjustedEnd = new Date(end);
        adjustedEnd.setDate(adjustedEnd.getDate() + 1);
        this.interventions = rawData
          .map(obj => this.buildInterventionFromAPI(obj))
          .filter(i => i.dateDebut instanceof Date && !isNaN(i.dateDebut) && i.dateDebut >= start && i.dateFin <= adjustedEnd);
        return this.interventions;
      } catch (err) {
        console.error("Erreur de chargement:", err);
        return [];
      }
    }
  
    /**
     * Construit un objet "intervention local" (format interne) 
     * à partir d'un objet brut venant de l'API (format "raw").
     * 
     * @param {Object} raw - Contenu JSON renvoyé par le serveur
     * @returns {Object} intervention (format local)
     */
    buildInterventionFromAPI(intervention) {          
        // Construction du tableau de trajets en utilisant la nouvelle structure
        // === Construction du tableau de trajets à partir de dureeTrajet ===
        let trajets = [];
        if (Array.isArray(intervention.trajets)) {
          // On a besoin des dates de l’intervention pour le calcul
          const interDebut = new Date(intervention.dateDebut);
          const interFin   = new Date(intervention.dateFin);

          trajets = intervention.trajets.map(item => {
            // si BDD contient déjà dateDebut/dateFin, on les utilise,
            // sinon on reconstitue à partir de la durée (fallback 1 h)
            const duration = item.dureeTrajet || 3600000;
            let dateDebutTrajet, dateFinTrajet;

            if (item.dateDebut && item.dateFin) {
              dateDebutTrajet = new Date(item.dateDebut);
              dateFinTrajet   = new Date(item.dateFin);
            } else if (item.direction === "left") {
              dateDebutTrajet = new Date(interDebut.getTime() - duration);
              dateFinTrajet   = new Date(interDebut);
            } else {
              dateDebutTrajet = new Date(interFin);
              dateFinTrajet   = new Date(interFin.getTime() + duration);
            }

            return {
              direction:   item.direction,
              dateDebut:   dateDebutTrajet,
              dateFin:     dateFinTrajet,
              type:        item.type || "voiture",
              dureeTrajet: duration
            };
          });
        } else {
          // conservez ici votre fallback existant si besoin
        }

      const techRowsArray = Array.isArray(intervention.technicianRows)
          ? intervention.technicianRows.map(x => parseInt(x,10)) : [];
       return{
           _id:             intervention._id,
           dateDebut:       new Date(intervention.dateDebut),
           dateFin:         new Date(intervention.dateFin),
           technicianNames: Array.isArray(intervention.technicianNames) ? [...intervention.technicianNames] : [],
           technicianRows:   techRowsArray,
           ticketName:      intervention.ticketName || "",
           clientName:      intervention.clientName || "",
           ville:           intervention.ville || "",
           codePostal:     intervention.codePostal || "",
           trajets:         trajets,
           //dateModif: intervention.dateModif ? new Date(intervention.dateModif) : new Date(0)
         };
      }
      
  
    /**
     * Convertit un objet intervention (format local) 
     * en l'objet que l'API attend pour POST/PUT (format "raw").
     * 
     * @param {Object} intervention
     * @returns {Object} Le body JSON à envoyer via fetch()
     */
    buildAPIBodyFromIntervention(intervention) {
      const body = {
            technicianRows: intervention.technicianRows,  // array de nombres
            dateDebut:      intervention.dateDebut?.toISOString(),
            dateFin:        intervention.dateFin  ?.toISOString(),
            ticketName:     intervention.ticketName,
            clientName:     intervention.clientName,
            ville:          intervention.ville,
            codePostal:     intervention.codePostal,
          };
          if (Array.isArray(intervention.technicianNames)) {
            body.technicianNames = [...intervention.technicianNames];
          }
    
      // On utilise la nouvelle structure pour les trajets
      if (Array.isArray(intervention.trajets)) {
        body.trajets = intervention.trajets
          .filter(t => typeof t.dureeTrajet === 'number')
          .map(t => ({
            direction: t.direction,
            type:      t.type || "voiture",
            dureeTrajet: t.dureeTrajet
          }));
      }
      
    
      return body;
    }
      
      
  
    /**
     * Sauvegarde (POST ou PUT) une intervention.
     * - Si intervention._id n'existe pas => POST (création)
     * - Sinon => PUT (mise à jour)
     * 
     * @param {Object} intervention (format local)
     * @returns {Promise<Object|undefined>} L'objet renvoyé par l'API, ou undefined si erreur
     */
    async saveIntervention(intervention) {
      console.log("💾 [saveIntervention] Appel avec:", intervention);
    
      const bodyToSend = this.buildAPIBodyFromIntervention(intervention);
      console.log("📤 [saveIntervention] Payload à envoyer:", bodyToSend);
    
      if (intervention._id) {
        // PUT (mise à jour)
        const url = `${API_BASE}/api/interventions/${intervention._id}`;
        try {
          const resp = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyToSend)
          });
    
          const putResult = await resp.json();
          console.log("✅ [saveIntervention] Réponse PUT:", putResult);
    
          if (!resp.ok) {
            console.error("❌ [saveIntervention] PUT échoué avec:", putResult);
            return undefined;
          }
    
          const getUrl = `${API_BASE}/api/interventions/${intervention._id}`;
          console.log("🔄 [saveIntervention] Relecture GET vers:", getUrl);
          const getResp = await fetch(getUrl);
          const fresh = await getResp.json();
    
          console.log("📥 [saveIntervention] Réponse GET après PUT:", fresh);
    
          if (!getResp.ok || !fresh) {
            console.warn("⚠️ [saveIntervention] GET après PUT échoué");
            return undefined;
          }
    
          const clean = this.buildInterventionFromAPI(fresh);
          console.log("🧼 [saveIntervention] Intervention nettoyée:", clean);
          console.log("⚠️ PRE-SAVE technicianRows =", intervention.technicianRows);

          this.updateLocalIntervention(clean);
          return clean;
    
        } catch (err) {
          console.error("🔥 [saveIntervention] Erreur réseau PUT:", err);
          return undefined;
        }
    
      } else {
        // POST (création)
        const url = `${API_BASE}/api/interventions`;
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyToSend)
          });
    
          const created = await resp.json();
          console.log("🆕 [saveIntervention] Réponse POST:", created);
    
          if (!resp.ok) {
            console.error("❌ [saveIntervention] POST échoué:", created);
            return undefined;
          }
          
          const newInterv = this.buildInterventionFromAPI(created);
          console.log("🎁 [saveIntervention] Nouvelle intervention nettoyée:", newInterv);
    
          this.interventions.push(newInterv);
          return newInterv;
    
        } catch (err) {
          console.error("🔥 [saveIntervention] Erreur réseau POST:", err);
          return undefined;
        }
      }
    }
    
    
  
    /**
     * Met à jour l'intervention correspondante dans this.interventions 
     * à partir d'un objet "raw" renvoyé par l'API (PUT).
     * 
     * @param {Object} updatedRaw 
     */
    updateLocalIntervention(updatedIntervention) {
      // Convertir en format local
      const updatedInterv = this.buildInterventionFromAPI(updatedIntervention);
      // Chercher l'index dans this.interventions
      const idx = this.interventions.findIndex(i => i._id === updatedInterv._id);
      if (idx !== -1) {
        // On remplace l'ancienne par la version mise à jour
        this.interventions[idx] = updatedInterv;
      } else {
        // Si on ne la trouve pas, on l'ajoute
        this.interventions.push(updatedInterv);
      }
    }
    
    async pollNewInterventions(sinceDate) {
      const sinceIso = sinceDate.toISOString();
      const url = `${API_BASE}/api/interventions?since=${sinceIso}&ts=${Date.now()}`; // ts pour éviter le cache
    
      // console.log(`[POLL] Checking for updates since ${sinceIso}`);
    
      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            "Cache-Control": "no-cache",
            "Pragma": "no-cache"
          }
        });
    
        if (!response.ok) {
          console.warn(`[POLL] ❌ Failed with status ${response.status}`);
          return [];
        }
    
        const rawData = await response.json();
        // console.log("[POLL] Données brutes reçues :", rawData);

        const updated = rawData.map(obj => this.buildInterventionFromAPI(obj));
        // console.log(`[POLL] ✅ ${updated.length} updates received`);
    
        return updated;
      } catch (err) {
        console.error("[POLL] ❌ Error during fetch:", err);
        return [];
      }
    }
    
    


    /**
     * Supprime une intervention existante (DELETE).
     * Met à jour this.interventions localement.
     * 
     * @param {Object} intervention - l'objet local
     * @returns {Promise<boolean>} true si ok, false si erreur
     */
    async deleteIntervention(intervention) {
      if (!intervention._id) {
        console.warn("Impossible de supprimer, pas d'_id:", intervention);
        return false;
      }
      const url = `${API_BASE}/api/interventions/${intervention._id}`;
  
      try {
        const resp = await fetch(url, {
          method: 'DELETE'
        });
        if (!resp.ok) {
          console.error("Erreur DELETE:", resp.status, resp.statusText);
          return false;
        }
        // Succès => on retire l'élément du tableau local
        this.interventions = this.interventions.filter(i => i._id !== intervention._id);
        console.log("Intervention supprimée (local).");
        return true;
      } catch(err) {
        console.error("Erreur fetch DELETE:", err);
        return false;
      }
    }
  }
  