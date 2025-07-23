// src/firebase-config.js

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCMLHEkIarjIrhzlU2Rl1kwOrp6pc0iYS8",
  authDomain: "gestionale-ore-6d53f.firebaseapp.com",
  projectId: "gestionale-ore-6d53f",
  storageBucket: "gestionale-ore-6d53f.appspot.com",
  messagingSenderId: "384552535847",
  appId: "1:384552535847:web:83913388e730b1027c8b02"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);