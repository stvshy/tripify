// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { initializeAuth } from 'firebase/auth';
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getReactNativePersistence } from "firebase/auth";
import AsyncStorage from '@react-native-async-storage/async-storage';


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

export { auth };
// Eksport instancji Firestore
export const db = getFirestore(app);