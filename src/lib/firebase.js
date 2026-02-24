// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// Se elimina la propiedad storageBucket de aquí para evitar ambigüedad.
const firebaseConfig = {
  apiKey: "AIzaSyDosM_CsWWri17hE54Xi5G9F9Mb2GwYc94",
  authDomain: "procesaractas.firebaseapp.com",
  projectId: "procesaractas",
  messagingSenderId: "603692866228",
  appId: "1:603692866228:web:c2af12cf8ef4ed0c8395e1",
  measurementId: "G-GW3Z79R5HG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, "actas");
const auth = getAuth(app);

// SOLUCIÓN: Inicializar Storage apuntando explícitamente al bucket correcto usando su URI.
const storage = getStorage(app, "gs://fotos-actas");

export { db, auth, storage };
