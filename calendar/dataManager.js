// dataManager.js

/**
 * Cette classe DataManager gère:
 *  - Le chargement des interventions depuis l'API (ton serveur Node/Express/Mongo)
 *  - La création / mise à jour / suppression via fetch()
 *  - La conversion "technicianRow" string -> tableau [1,2,3]
 *  - L'ajout d'un champ "trajets" sous forme de tableau d'objets { direction, dateDebut, dateFin, type }
 * 
 * En front-end (avec Vite), tu peux faire :
 *   import { DataManager } from './dataManager.js';
 *   const dataManager = new DataManager();
 *   dataManager.loadInterventions(...)...
 * 
 * Attention : 
 *  - `fetch('http://localhost:3000/api/...')` suppose que ton serveur Express tourne en local sur ce port.
 *    Si tu déploies ailleurs, change l'URL par la bonne.
 */

export class DataManager {
    constructor() {
      /**
       * Tableau local d'interventions.
       * Format interne (pour chaque intervention):
       * {
       *   _id: string | undefined,
       *   dateDebut: Date,
       *   dateFin: Date,
       *   technicianRows: number[], // ex. [1, 2]
       *   ticketName: string,
       *   clientName: string,
       *   ville: string,
       *   trajets: [
       *     { direction: 'left'|'right', dateDebut: Date, dateFin: Date, type: string },
       *     ...
       *   ],
       *   technician: string // champ requis par ton schéma
       * }
       */
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
    async loadInterventions(start, end) { //LV1fHOxE3CdUF1PI morissonvic
      const url = `/api/interventions?start=${start.toISOString()}&end=${end.toISOString()}`;
      //http://localhost:3000
      try {
        const response = await fetch(url);
        if (!response.ok) return [];
        const rawData = await response.json();
        this.interventions = rawData
          .map(obj => this.buildInterventionFromAPI(obj))
          .filter(i => i.dateDebut instanceof Date && !isNaN(i.dateDebut) && i.dateDebut >= start && i.dateFin <= end);
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
    buildInterventionFromAPI(raw) {
        // Conversion de technicianRow
        const techRowsArray = (raw.technicianRow || "1")
          .split(",")
          .map(x => x.trim())
          .filter(x => x !== "")
          .map(x => parseInt(x, 10));
      
        // Construction du tableau de trajets en utilisant la nouvelle structure
        // === Construction du tableau de trajets à partir de dureeTrajet ===
        let trajets = [];
        if (Array.isArray(raw.trajets)) {
          // On a besoin des dates de l’intervention pour le calcul
          const interDebut = new Date(raw.dateDebut);
          const interFin   = new Date(raw.dateFin);

          trajets = raw.trajets.map(item => {
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
        // === On retourne enfin l'intervention “locale” ===
       return {
           _id:             raw._id,
           dateDebut:       new Date(raw.dateDebut),
           dateFin:         new Date(raw.dateFin),
           technicianRows:  techRowsArray,
           ticketName:      raw.ticketName || "",
           clientName:      raw.clientName || "",
           ville:           raw.ville || "",
           trajets:         trajets,
           technician:      raw.technician || ""
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
      const techRowStr = intervention.technicianRows.join(",");
      const body = {
        dateDebut: intervention.dateDebut?.toISOString?.() || null,
        dateFin: intervention.dateFin?.toISOString?.() || null,
        technicianRow: techRowStr,
        ticketName: intervention.ticketName || "",
        clientName: intervention.clientName || "",
        ville: intervention.ville || "",
        technician: intervention.technician || ""
      };
    
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
      const bodyToSend = this.buildAPIBodyFromIntervention(intervention);
  
      if (intervention._id) {
        // PUT (mise à jour)
        const url = `/api/interventions/${intervention._id}`;
        try {
          const resp = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyToSend)
          });
          const updated = await resp.json();
  
          if (resp.ok) {
            console.log("Intervention mise à jour =>", updated);
            // On met à jour l'intervention locale
            this.updateLocalIntervention(updated);
            return updated;
          } else {
            console.error("Erreur PUT:", updated);
            return undefined;
          }
        } catch(err) {
          console.error("Erreur fetch PUT:", err);
          return undefined;
        }
      } else {
        // POST (création)
        const url = `/api/interventions`;
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyToSend)
          });
          const created = await resp.json();
  
          if (resp.ok) {
            console.log("Intervention créée =>", created);
            // On l'ajoute dans this.interventions
            const newInterv = this.buildInterventionFromAPI(created);
            this.interventions.push(newInterv);
            return created;
          } else {
            console.error("Erreur POST:", created);
            return undefined;
          }
        } catch(err) {
          console.error("Erreur fetch POST:", err);
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
    updateLocalIntervention(updatedRaw) {
      // Convertir en format local
      const updatedInterv = this.buildInterventionFromAPI(updatedRaw);
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
      const url = `/api/interventions/${intervention._id}`;
  
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
  