

// server.js
const express = require('express');
const path = require('path');
const app = express();
const { ObjectId } = require('mongoose').Types; // Importer ObjectId

// Importation de la configuration MongoDB et des modèles
const { Parc, Client, Site, Espace, Intervention} = require('./config/db.js');

const cors = require('cors');
app.use(cors());

// Middleware pour parser le JSON
app.use(express.json());

// Servir l'ensemble du projet depuis la racine
app.use(express.static(path.join(__dirname)));

// Servir explicitement le dossier node_modules
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));

// Route pour récupérer les parcs
app.get('/api/parcs', async (req, res) => {
  try {
    const parcs = await Parc.find({});
    res.json(parcs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer les clients d'un parc
app.get('/api/parcs/:parcId/clients', async (req, res) => {
  try {
    const clients = await Client.find({ parc: req.params.parcId });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer les sites d'un client
app.get('/api/clients/:clientId/sites', async (req, res) => {
  try {
    const sites = await Site.find({ client: new ObjectId(req.params.clientId) });
    res.json(sites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer les espaces d'un site
app.get('/api/sites/:siteId/espaces', async (req, res) => {
  try {
    const espaces = await Espace.find({ site: new ObjectId(req.params.siteId) });
    res.json(espaces);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route pour récupérer toute la hiérarchie (parcs, clients, sites, espaces)
app.get('/api/hierarchy', async (req, res) => {
  try {
    console.log("Récupération des parcs...");
    const parcs = await Parc.find({}).lean();
    console.log("Parcs trouvés:", parcs.length);

    const hierarchy = await Promise.all(parcs.map(async (parc) => {
      console.log(`Récupération des clients pour le parc: ${parc._id}`);
      const clients = await Client.find({ parc: parc._id }).lean();
      console.log(`Clients trouvés pour parc ${parc._id}:`, clients.length);

      const clientsWithSites = await Promise.all(clients.map(async (client) => {
        console.log(`Récupération des sites pour le client: ${client._id}`);
        const sites = await Site.find({ client: new ObjectId(client._id) }).lean();
        console.log(`Sites trouvés pour client ${client._id}:`, sites.length);

        const sitesWithEspaces = await Promise.all(sites.map(async (site) => {
          console.log(`Récupération des espaces pour le site: ${site._id}`);
          const espaces = await Espace.find({ site: new ObjectId(site._id) }).lean();
          console.log(`Espaces trouvés pour site ${site._id}:`, espaces.length);
          return { ...site, espaces };
        }));

        return { ...client, sites: sitesWithEspaces };
      }));

      return { ...parc, clients: clientsWithSites };
    }));

    res.json(hierarchy);
  } catch (error) {
    console.error("Erreur lors de la récupération de la hiérarchie :", error);
    res.status(500).json({ error: error.message });
  }
});



// Route GET : Récupérer toutes les interventions
app.get('/api/interventions', async (req, res) => {
  try {
    const { since } = req.query;
    let filter = {};

    if (since) {
      const sinceDate = new Date(since);
      if (!isNaN(sinceDate)) {
        filter.dateModif = { $gt: sinceDate };
      }
    }

    const interventions = await Intervention.find(filter);

    // 🔥 Empêcher le cache HTTP
    res.set("Cache-Control", "no-store");

    res.json(interventions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Route GET : Récupérer une intervention par son ID
app.get('/api/interventions/:id', async (req, res) => {
  try {
    const intervention = await Intervention.findById(req.params.id);
    if (!intervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }
    res.json(intervention);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route POST : Créer une nouvelle intervention
app.post('/api/interventions', async (req, res) => {
  try {
    const data = req.body;
    data.dateModif = new Date(); // Ajoute la date de modification
    const newIntervention = new Intervention(data);
    const savedIntervention = await newIntervention.save();
    res.status(201).json(savedIntervention);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route PUT : Mettre à jour une intervention existante
app.put('/api/interventions/:id', async (req, res) => {
  try {
    const data = req.body;
    data.dateModif = new Date(); // Met à jour la date de modification

    const updatedIntervention = await Intervention.findByIdAndUpdate(
      req.params.id,
      data,
      { new: true, runValidators: true }
    );
    if (!updatedIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }
    res.json(updatedIntervention);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route DELETE : Supprimer une intervention
app.delete('/api/interventions/:id', async (req, res) => {
  try {
    const deletedIntervention = await Intervention.findByIdAndDelete(req.params.id);
    if (!deletedIntervention) {
      return res.status(404).json({ error: "Intervention non trouvée" });
    }
    res.json({ message: "Intervention supprimée" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3000;   // Render fournit PORT en prod
console.log('[APP] Mode        :', process.env.NODE_ENV || 'non défini');
console.log('[APP] Port rendu  :', process.env.PORT);
app.listen(PORT, () => {
  console.log(`Serveur API démarré sur le port ${PORT}`);
});


//setTimeout(() => {
//  console.log("Forçage d'un crash...");
//  process.exit(1); // Quitte avec une erreur
//}, 5000); // Crash après 5 secondes