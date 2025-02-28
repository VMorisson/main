import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import firebaseApp from './firebaseConfig';

const auth = getAuth(firebaseApp);

const Admin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Utilisateur ajouté:", userCredential.user);
      await sendPasswordResetEmail(auth, email);
      console.log("Email avec mot de passe temporaire envoyé");
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'utilisateur:", error.message);
    }
  };

  return (
    <div className="admin-container">
      <h1>Gestion Administrateur</h1>
      <form onSubmit={handleAddUser}>
        <div>
          <label htmlFor="email">Email utilisateur :</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email utilisateur"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Mot de passe temporaire :</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe temporaire"
            required
          />
        </div>
        <button type="submit">Ajouter utilisateur</button>
      </form>
    </div>
  );
};

export default Admin;
