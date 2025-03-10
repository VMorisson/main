// db.js
const mongoose = require('mongoose');

// Connexion à MongoDB en local
//mongoose.connect('mongodb://localhost:27017/laurea-integration')
//  .then(() => console.log("Connecté à MongoDB !"))
//  .catch(err => console.error("Erreur lors de la connexion à MongoDB :", err));

// Connexion à MongoDB via la variable d'environnement définie par Railway  
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("MongoDB connecté via Railway !"))
.catch((err) => console.error("Erreur lors de la connexion à MongoDB via Railway :", err));  

// Schéma du Parc
const parcSchema = new mongoose.Schema({
  name: { type: String, required: true },
  integrateur: { type: String, required: true }, // 👈 Ajouter ce champ
  // Ajoutez d'autres champs si nécessaire (localisation, description, etc.)
});

// Schéma du Client (appartenant à un parc)
const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parc: { type: mongoose.Schema.Types.ObjectId, ref: 'Parc', required: true },
  // Autres informations relatives au client...
});

// Schéma du Site (appartenant à un client)
const siteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
  // Autres champs possibles...
});

// Schéma de l'Espace (appartenant à un site)
const espaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
  // D'autres propriétés si besoin...
});

// Création des modèles
const Parc = mongoose.model('Parc', parcSchema);
const Client = mongoose.model('Client', clientSchema);
const Site = mongoose.model('Site', siteSchema);
const Espace = mongoose.model('Espace', espaceSchema);

module.exports = { Parc, Client, Site, Espace };
