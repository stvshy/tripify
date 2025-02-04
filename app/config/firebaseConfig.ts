
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyD2HUJaAZ6z7WaalvUuaIfp71tgdyxVIqc",
  authDomain: "tripify-global.firebaseapp.com",
  databaseURL: "https://tripify-global-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "tripify-global",
  storageBucket: "tripify-global.appspot.com",
  messagingSenderId: "256648613996",
  appId: "1:256648613996:web:034c9f8ca51d43ef4c8849",
  measurementId: "G-H65BKVYN0C"
};

const app = initializeApp(firebaseConfig);

// Użycie AsyncStorage do przechowywania stanu autoryzacji
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Eksport instancji Firestore
const db = getFirestore(app);
const storage = getStorage(app); // Initialize Firebase Storage

export { auth, db, storage };


