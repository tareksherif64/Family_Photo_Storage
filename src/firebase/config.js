import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your Firebase configuration
// Replace these values with your actual Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDT_WrkGtfHbsuTV--eftScEI_hzxugxQM",
  authDomain: "family-photo-databse.firebaseapp.com",
  databaseURL: "https://family-photo-databse-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "family-photo-databse",
  storageBucket: "family-photo-databse.firebasestorage.app",
  messagingSenderId: "832334092538",
  appId: "1:832334092538:web:5e53db33c0cc19f26dd143",
  measurementId: "G-KQWNWX6G7Y"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
