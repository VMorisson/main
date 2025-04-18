import { auth, db } from "../config/firebaseConfig.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-firestore.js";
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.1/firebase-auth.js";

export async function loadHeader() {
  try {
    const response = await fetch('../config/header.html');
    const headerHTML = await response.text();
    document.getElementById('header-placeholder').innerHTML = headerHTML;

    // Déconnexion
    const logoutButton = document.querySelector('.logout-button');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        signOut(auth)
          .then(() => window.location.href = "../index.html")
          .catch(err => console.error("Erreur déconnexion :", err));
      });
    }

    // ✅ Auth ready
    onAuthStateChanged(auth, async (user) => {
      if (!user) {
        console.warn("Aucun utilisateur connecté.");
        window.location.href = "../index.html";
      }

      const userDocRef = doc(db, "users", user.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (!userDocSnap.exists()) {
        console.warn("Utilisateur non trouvé dans Firestore.");
        return;
      }

      const userData = userDocSnap.data();
      window.user = userData;

      // Affichage conditionnel
      if (userData.roleEntreprise === "AV") {
        const autreLink = document.getElementById('autre-link');
        if (autreLink) autreLink.style.display = 'block';
      }

      if (userData.voirIntervention === true) {
        const interventionsLink = document.getElementById('interventions-link');
        if (interventionsLink) interventionsLink.style.display = 'block';
      }
    
      // Vérification du droit de modification du planning
      if (userData.modifierIntervention === true) {
        console.log("L'utilisateur peut modifier le planning.");
      } else {
        console.log("L'utilisateur ne peut pas modifier le planning.");
        // Vous pouvez ici masquer ou désactiver les éléments de modification (boutons, interactions, etc.)
      }
    });

  } catch (error) {
    console.error('Erreur lors du chargement du header:', error);
  }
}
