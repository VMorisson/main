import { exec } from "child_process";
import mongoose from "mongoose";

const MONGO_URI = "mongodb://127.0.0.1:27017/laurea-integration"; // Mets le bon nom de ta base
const CHECK_INTERVAL = 10000; // Vérifie toutes les 10 secondes (10 000 ms)
const MAX_ATTEMPTS = 5; // Nombre max de tentatives avant d'abandonner
let attempt = 0;

function checkMongoDB() {
  mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
      console.log("✅ MongoDB est bien en ligne !");
      mongoose.disconnect();
      attempt = 0; // Réinitialise le compteur si tout va bien
    })
    .catch((err) => {
      if (err.message.includes("ECONNREFUSED")) {
        console.error(`❌ MongoDB inaccessible. Tentative ${attempt + 1}/${MAX_ATTEMPTS}`);

        if (attempt < MAX_ATTEMPTS) {
          attempt++;
          restartMongoDB();
        } else {
          console.error("⛔ Impossible de démarrer MongoDB après plusieurs tentatives.");
        }
      } else {
        console.error("⚠️ Autre erreur MongoDB :", err);
      }
    });
}

function restartMongoDB() {
  console.log("🔄 Tentative de redémarrage de MongoDB...");

  let command;
  if (process.platform === "win32") {
    command = "net start MongoDB";
  } else {
    command = "sudo systemctl start mongod";
  }

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`❌ Échec du redémarrage de MongoDB : ${stderr}`);
    } else {
      console.log(`✅ MongoDB redémarré avec succès : ${stdout}`);
      setTimeout(checkMongoDB, 5000); // Vérifie après 5 secondes si ça fonctionne
    }
  });
}

// Vérification automatique toutes les 10 secondes
setInterval(checkMongoDB, CHECK_INTERVAL);

// Lancer la première vérification immédiatement
checkMongoDB();
