// config/inactivityLogout.js
import { getAuth, signOut } from "firebase/auth";

export function initInactivityLogout() {
  let authInstance;
  
  try {
    authInstance = getAuth();
  } catch (error) {
    console.error("⚠️ Erreur lors de l'initialisation de l'auth :", error);
    return;
  }

  let inactivityCounter = 0;
  const maxInactiveMinutes = 30; // Nombre total de minutes avant déconnexion
  let interval;

  function logoutUser() {
    console.log("🚨 Déconnexion pour inactivité...");
    signOut(authInstance)
      .then(() => {
        alert("Déconnexion pour inactivité");
        window.location.href = "../index.html"; // Redirection vers la page d'accueil
      })
      .catch((error) => console.error("❌ Erreur lors de la déconnexion :", error));
  }

  function startTimer() {
    clearInterval(interval);
    inactivityCounter = 0;

    interval = setInterval(() => {
      inactivityCounter++;
      console.log(`⏳ Temps d'inactivité : ${inactivityCounter} min / ${maxInactiveMinutes} min`);
      
      if (inactivityCounter >= maxInactiveMinutes) {
        clearInterval(interval);
        logoutUser();
      }
    }, 60000); // Vérification toutes les minutes
  }

  function resetTimer() {
    console.log("🔄 Activité détectée, reset du timer.");
    inactivityCounter = 0; // Réinitialisation correcte
  }

  // Démarrer le timer
  startTimer();

  // Réinitialiser le timer à chaque action utilisateur
  const events = ["click", "keydown", "scroll", "touchstart"];
  events.forEach(event => window.addEventListener(event, resetTimer));

  // Détecter si l'utilisateur quitte l'onglet et le ramène
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      console.log("👀 L'utilisateur est revenu, restart du timer.");
      startTimer();
    }
  });

  // Nettoyer les événements quand ce n'est plus nécessaire
  return function cleanup() {
    clearInterval(interval);
    events.forEach(event => window.removeEventListener(event, resetTimer));
    document.removeEventListener("visibilitychange", startTimer);
  };
}
