import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBURxth9aE-iMhURftBbRSIiRwV9-KZZ8A',
  authDomain: 'school-app-f188a.firebaseapp.com',
  projectId: 'school-app-f188a',
  storageBucket: 'school-app-f188a.firebasestorage.app',
  messagingSenderId: '777291628809',
  appId: '1:777291628809:web:8aff6861ead1c032b753d8',
  measurementId: 'G-NN1FRBDJ6K',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase Auth instance
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
