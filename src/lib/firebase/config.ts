import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCqukeC5CES5qWlE9Ccy2whu6Rqy1LyH2Q",
  authDomain: "games-2f526.firebaseapp.com",
  projectId: "games-2f526",
  storageBucket: "games-2f526.firebasestorage.app",
  messagingSenderId: "711428065973",
  appId: "1:711428065973:web:d70037c0aa90596a2eccfc",
  measurementId: "G-HZ2562NYT8"
};

// Khởi tạo Firebase
const app = initializeApp(firebaseConfig);

// Khởi tạo các dịch vụ
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
