// config/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Remplacez ces valeurs par la configuration de votre projet Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA3ntqe60xKcnlb7mBRuh5WHqlxlLwKAfg",
    authDomain: "laurea-integration.firebaseapp.com",
    projectId: "laurea-integration",
    storageBucket: "laurea-integration.appspot.comKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
  };

// Initialisation de Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
