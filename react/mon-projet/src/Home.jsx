import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail, updatePassword } from 'firebase/auth';
import firebaseApp from './firebaseConfig';

const auth = getAuth(firebaseApp);

const Home = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      console.log("Utilisateur connecté:", userCredential.user);
    } catch (error) {
      console.error("Erreur de connexion:", error.message);
    }
  };

  const handleForgotPassword = async () => {
    try {
      await sendPasswordResetEmail(auth, username);
      console.log("Email de réinitialisation envoyé");
    } catch (error) {
      console.error("Erreur lors de l'envoi de l'email:", error.message);
    }
  };

  return (
    <div className="login-container">
      <h1>LAUREA Intégration</h1>
      <h2>Interface de connexion</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">Nom d'utilisateur : </label>
          <input
            type="email"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nom d'utilisateur"
            required
          />
        </div>
        <div>
          <label htmlFor="password">Mot de passe : </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe"
            required
          />
        </div>
        <button type="submit">Se connecter</button>
        <p className="forgot-password" onClick={handleForgotPassword} style={{ cursor: 'pointer', color: 'grey' }}>
          Mot de passe oublié ?
        </p>
      </form>
      <AdminPage />
    </div>
  );
};

export default Home;
