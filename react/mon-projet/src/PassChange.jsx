import {updatePassword } from 'firebase/auth';

const changePassword = async (newPassword) => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updatePassword(user, newPassword);
        console.log("Mot de passe mis à jour");
      } else {
        console.error("Aucun utilisateur connecté");
      }
    } catch (error) {
      console.error("Erreur de mise à jour du mot de passe:", error.message);
    }
  };