// loadHeader.js
import { auth, db } from "../config/firebaseConfig.js";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

/**
 * Charge le header depuis header.html, l’insère dans #header-placeholder,
 * puis affiche ou masque certains liens selon les rôles de l’utilisateur.
 */
export async function loadHeader() {
  try {
    // 1) Récupération du contenu HTML du header
    const response = await fetch('../config/header.html');
    const headerHTML = await response.text();
    document.getElementById('header-placeholder').innerHTML = headerHTML;

    // 2) Une fois le header inséré, on peut gérer la déconnexion
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        signOut(auth)
          .then(() => {
            window.location.href = "../index.html";
          })
          .catch(error => console.error("Erreur lors de la déconnexion :", error));
      });
    }

    // 3) Récupérer les rôles de l’utilisateur connecté (dans Firestore par ex.)
    const user = auth.currentUser;
    if (user) {
      // Supposons que vous ayez un document "users" avec l'UID comme clé
      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();

        // Autre exemple : si userData.roleEntreprise === "AV", on affiche le lien "autre"
        if (userData.roleEntreprise === "AV") {
          document.getElementById('autrelink').style.display = 'block';
        }
      }
    }
  } catch (error) {
    console.error('Erreur lors du chargement du header:', error);
  }
}
