// Import the functions you need from the SDKs you need
import firebase from "firebase/compat/app";
import 'firebase/compat/auth';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeV091ZfZMhQWraAlRw0QFvdJYcBOsl5A",
  authDomain: "fir-preparkinson.firebaseapp.com",
  projectId: "fir-preparkinson",
  storageBucket: "fir-preparkinson.appspot.com",
  messagingSenderId: "69234021516",
  appId: "1:69234021516:web:2a801149ab004d37ac97a9"
};

// Initialize Firebase
// DOUBLE CHECK SYNTAX WITH NEWER VERSION
let app;
if(firebase.apps.length === 0){
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app()
}

const auth = firebase.auth()

export { auth }