// db.js


const mongoose = require('mongoose');
// Connexion à MongoDB en local
//mongoose.connect('mongodb://localhost:27017/laurea-integration')
//  .then(() => console.log("Connecté à MongoDB !"))
//  .catch(err => console.error("Erreur lors de la connexion à MongoDB :", err));

// Connexion à MongoDB via la variable d'environnement définie par Railway 
const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://morissonvic:LV1fHOxE3CdUF1PI@laureaintegration.wcvsdov.mongodb.net/?retryWrites=true&w=majority&appName=LaureaIntegration";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);
//mongoose.connect(process.env.MONGODB_URI, {
//  useNewUrlParser: true,
  //useUnifiedTopology: true,
//})
//.then(() => console.log("MongoDB connecté via Railway !"))
//.catch((err) => console.error("Erreur lors de la connexion à MongoDB via Railway :", err));  

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


const interventionSchema = new mongoose.Schema({
  technician: { type: String, required: true },
  dateDebut: { type: Date, required: true },
  dateFin: { type: Date, required: true },
  ticketName: { type: String },
  clientName: { type: String },
  ville: { type: String },
  technicianRow: { type: String, required: true },

  // Trajets pixelisés, liés aux interventions
  trajets: [{
    direction: { type: String, enum: ['left', 'right'] },
    dureeTrajet: { type: Number } // durée en millisecondes (ex: 3600000 = 1h)
  }]
});









// Création des modèles
const Parc = mongoose.model('Parc', parcSchema);
const Client = mongoose.model('Client', clientSchema);
const Site = mongoose.model('Site', siteSchema);
const Espace = mongoose.model('Espace', espaceSchema);
const Intervention = mongoose.model('Intervention', interventionSchema);

module.exports = { Parc, Client, Site, Espace, Intervention };
