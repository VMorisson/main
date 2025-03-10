const mongoose = require("mongoose");
const xlsx = require("xlsx");
const { Parc, Client, Site, Espace } = require("./db");

const MODEL_MAP = {
    "Parcs": Parc,
    "Clients": Client,
    "Sites": Site,
    "Espaces": Espace
};

const COLUMN_MAPPING = {
    "Parcs": { name: "Parc", integrateur: "Integrateur" },
    "Clients": { name: "Client", parent: "Parc" },
    "Sites": { name: "Site", parent: "Client" },
    "Espaces": { name: "Espace", parent: "Site" }
};

async function importExcel(filePath) {
    try {
        const workbook = xlsx.readFile(filePath);
        const sheets = workbook.SheetNames;

        for (const sheetName of sheets) {
            if (!MODEL_MAP[sheetName]) {
                console.warn(`Feuille ignorée : ${sheetName} (nom non reconnu)`);
                continue;
            }

            const worksheet = workbook.Sheets[sheetName];
            let jsonData = xlsx.utils.sheet_to_json(worksheet);

            // Appliquer le mapping des colonnes
            const mapping = COLUMN_MAPPING[sheetName];

            jsonData = jsonData.map(row => {
                const mappedRow = { name: row[mapping.name] };

                if (mapping.parent) {
                    mappedRow.parent = row[mapping.parent];
                }

                if (mapping.integrateur) {
                    mappedRow.integrateur = row[mapping.integrateur];
                }

                return mappedRow;
            });

            for (const row of jsonData) {
                const { name, parent, integrateur, ...fields } = row;
                if (!name) continue;

                let parentDoc = null;
                if (parent) {
                    parentDoc = await findOrCreateParent(sheetName, parent);
                }

                await upsertOrInsertDocument(sheetName, name, parentDoc, integrateur, fields);
            }
        }

        console.log("Importation terminée avec succès.");
    } catch (error) {
        console.error("Erreur lors de l'importation :", error);
    }
}

async function findOrCreateParent(collection, parentName) {
    let model;
    switch (collection) {
        case "Clients": model = Parc; break;
        case "Sites": model = Client; break;
        case "Espaces": model = Site; break;
        default: return null;
    }

    let parentDoc = await model.findOne({ name: parentName });
    if (!parentDoc) {
        parentDoc = new model({ name: parentName });
        await parentDoc.save();
        console.log(`Parent créé : ${parentName} dans ${model.modelName}`);
    }
    return parentDoc;
}

async function upsertOrInsertDocument(collection, name, parentDoc, integrateur, fields) {
    const model = MODEL_MAP[collection];
    if (!model) return;

    // Filtrage du document par son nom et son parent s'il existe
    const filter = { name };
    
    if (parentDoc) {
        switch (collection) {
            case "Clients": filter.parc = parentDoc._id; break;
            case "Sites": filter.client = parentDoc._id; break;
            case "Espaces": filter.site = parentDoc._id; break;
        }
    }

    // Ajout du champ intégrateur si concerné
    if (collection === "Parcs" && integrateur) {
        fields.integrateur = integrateur;
    }

    // Vérifier si le document existe
    let existingDoc = await model.findOne(filter);
    if (existingDoc) {
        await model.updateOne(filter, { $set: fields });
        console.log(`Donnée mise à jour : ${name} dans ${collection}`);
    } else {
        // Création du nouveau document
        const newDocData = { name, ...fields };
        if (parentDoc) {
            switch (collection) {
                case "Clients": newDocData.parc = parentDoc._id; break;
                case "Sites": newDocData.client = parentDoc._id; break;
                case "Espaces": newDocData.site = parentDoc._id; break;
            }
        }
        const newDoc = new model(newDocData);
        await newDoc.save();
        console.log(`Nouvelle donnée ajoutée : ${name} dans ${collection}`);
    }
}


if (require.main === module) {
    const filePath = process.argv[2];
    if (!filePath) {
        console.error("Veuillez fournir un chemin de fichier Excel.");
        process.exit(1);
    }
    importExcel(filePath);
}

module.exports = importExcel;