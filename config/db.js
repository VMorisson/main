// db.js


//const mongoose = require('mongoose');
// Connexion à MongoDB en local
//mongoose.connect('mongodb://localhost:27017/laurea-integration')
//  .then(() => console.log("Connecté à MongoDB !"))
//  .catch(err => console.error("Erreur lors de la connexion à MongoDB :", err));

// URI de connexion (MongoDB Atlas ou local en fallback)
//const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/laurea-integration';
//const uri = "mongodb+srv://morissonvic:KwAMK9x7OOzJiqQN@laureaintegration.wcvsdov.mongodb.net/?retryWrites=true&w=majority&appName=LaureaIntegration";
// config/db.js
console.log('[DB] Chargement fichier :', __filename);
console.log('[DB] Build timestamp   :', new Date().toISOString());
require('dotenv').config();

require('dotenv').config();           // ← charge .env quand tu es en local
const mongoose = require('mongoose');

// URI lue uniquement depuis les variables d’environnement
const uri = process.env.MONGODB_URI;
console.log('[DB] MONGODB_URI =', process.env.MONGODB_URI ? 'définie ✅' : 'indéfinie ❌');

// Connexion MongoDB (plus besoin des options dépréciées)
mongoose.connect(uri)
  .then(() => console.log('✅ MongoDB connecté via Mongoose'))
  .catch(err => console.error('❌ Erreur connexion MongoDB via Mongoose :', err));

// Définition des schémas
const parcSchema = new mongoose.Schema({
  name: { type: String, required: true },
  integrateur: { type: String, required: true },
});

const clientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  parc: { type: mongoose.Schema.Types.ObjectId, ref: 'Parc', required: true },
});

const siteSchema = new mongoose.Schema({
  name: { type: String, required: true },
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
});

const espaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  site: { type: mongoose.Schema.Types.ObjectId, ref: 'Site', required: true },
});

const interventionSchema = new mongoose.Schema({
  technician:    { type: String, required: true },
  dateDebut:     { type: Date,   required: true },
  dateFin:       { type: Date,   required: true },
  ticketName:    { type: String },
  clientName:    { type: String },
  ville:         { type: String },
  technicianRow: { type: String, required: true },
  trajets: [{
    direction:   { type: String, enum: ['left','right'] },
    dureeTrajet: { type: Number } // en millisecondes
  }]
});

// Création des modèles
const Parc         = mongoose.model('Parc', parcSchema);
const Client       = mongoose.model('Client', clientSchema);
const Site         = mongoose.model('Site', siteSchema);
const Espace       = mongoose.model('Espace', espaceSchema);
const Intervention = mongoose.model('Intervention', interventionSchema);

module.exports = { Parc, Client, Site, Espace, Intervention };