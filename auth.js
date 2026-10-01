import { auth } from './firebaseconfig.js';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Monitora estado de login
onAuthStateChanged(auth, (user) => {
  if (user) window.location.href = "index.html";
});

const tabRegister = document.getElementById('tab-register');
const tabLogin = document.getElementById('tab-login');
const registerForm = document.getElementById('register-form');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');

// Troca de Abas
tabRegister?.addEventListener('click', () => {
  tabRegister.classList.add('active');
  tabLogin.classList.remove('active');
  registerForm.classList.remove('hidden');
  loginForm.classList.add('hidden');
  if (authError) authError.textContent = '';
});

tabLogin?.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabRegister.classList.remove('active');
  loginForm.classList.remove('hidden');
  registerForm.classList.add('hidden');
  if (authError) authError.textContent = '';
});

// Cadastro
registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-password').value;

  try {
    await createUserWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (error) {
    tratarErroFirebase(error.code);
  }
});

// Login
loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = "index.html";
  } catch (error) {
    tratarErroFirebase(error.code);
  }
});

function tratarErroFirebase(code) {
  let mensagem = "Erro ao processar solicitação.";
  switch (code) {
    case 'auth/operation-not-allowed':
      mensagem = "Ative 'E-mail/Senha' nas configurações de Autenticação do Firebase!";
      break;
    case 'auth/email-already-in-use':
      mensagem = "E-mail já está em uso. Clique na aba 'Entrar'.";
      break;
    case 'auth/weak-password':
      mensagem = "A senha deve conter no mínimo 6 caracteres.";
      break;
    default:
      mensagem = "E-mail ou senha incorretos.";
  }
  if (authError) authError.textContent = mensagem;
}