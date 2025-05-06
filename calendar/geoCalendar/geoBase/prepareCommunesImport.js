const fs = require("fs");

const rawData = fs.readFileSync("communes-france.json", "utf8");
const communes = JSON.parse(rawData);

const updated = communes.map(c => ({
  ...c,
  codePostal: c.codePostal.toString().padStart(5, "0")
}));

fs.writeFileSync("communes-france-stringCP.json", JSON.stringify(updated, null, 2), "utf8");

console.log(`✅ Fichier exporté avec ${updated.length} communes (codePostal en string)`);
