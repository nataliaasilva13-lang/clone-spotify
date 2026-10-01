import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCBHSNVphnRqqZBRTW_2hPeBmaFvPYJeak",
  authDomain: "clone-spotify-c9293.firebaseapp.com",
  databaseURL: "https://clone-spotify-c9293-default-rtdb.firebaseio.com/",
  projectId: "clone-spotify-c9293",
  storageBucket: "clone-spotify-c9293.firebasestorage.app",
  messagingSenderId: "704434308301",
  appId: "1:704434308301:web:cece0084d9cf3cc6791584"
};

const app = initializeApp(firebaseConfig);
export const rtdb = getDatabase(app);
export const auth = getAuth(app);