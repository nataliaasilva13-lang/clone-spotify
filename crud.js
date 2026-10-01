import { rtdb, auth } from './firebaseconfig.js';
import { signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
  ref, push, onValue, remove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// DOM
const userEmailDisplay = document.getElementById('user-email-display');
const btnLogout = document.getElementById('btn-logout');

const songGrid = document.getElementById('song-grid');
const songForm = document.getElementById('song-form');
const modal = document.getElementById('modal');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const searchInput = document.getElementById('search-input');

const audioPlayer = document.getElementById('audio-player');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const playerCover = document.getElementById('player-cover');

// Controles de Volume
const volumeSlider = document.getElementById('volume-slider');
const btnMute = document.getElementById('btn-mute');
const volumeIcon = document.getElementById('volume-icon');

let lastVolume = 1;

// Variáveis de Estado
let allSongs = [];
const songsRef = ref(rtdb, 'musicas');

// Placeholder SVG limpo e offline
const DEFAULT_COVER_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='%231db954'><rect width='100%' height='100%' fill='%23282828'/><path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/></svg>";

// Proteção de Rota
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "login.html";
  } else {
    if (userEmailDisplay) {
      const usuarioPuro = user.email.split('@')[0];
      const nomeFormatado = usuarioPuro.charAt(0).toUpperCase() + usuarioPuro.slice(1);
      userEmailDisplay.textContent = nomeFormatado;
    }
  }
});

btnLogout?.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = "login.html";
  });
});

//volume
if (volumeSlider && audioPlayer) {
  // Ajuste deslizante
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    audioPlayer.volume = val;
    updateVolumeIcon(val);
  });

  // Botão Mudo / Desmudo
  btnMute?.addEventListener('click', () => {
    if (audioPlayer.volume > 0) {
      lastVolume = audioPlayer.volume;
      audioPlayer.volume = 0;
      volumeSlider.value = 0;
      updateVolumeIcon(0);
    } else {
      audioPlayer.volume = lastVolume || 1;
      volumeSlider.value = audioPlayer.volume;
      updateVolumeIcon(audioPlayer.volume);
    }
  });
}

function updateVolumeIcon(volume) {
  if (!volumeIcon) return;
  volumeIcon.className = 'fa-solid ';
  if (volume === 0) {
    volumeIcon.className += 'fa-volume-xmark';
  } else if (volume < 0.5) {
    volumeIcon.className += 'fa-volume-low';
  } else {
    volumeIcon.className += 'fa-volume-high';
  }
}
//converte o arquivo para base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// Modal
btnOpenModal?.addEventListener('click', () => {
  songForm.reset();
  modal.classList.remove('hidden');
});

btnCloseModal?.addEventListener('click', () => {
  modal.classList.add('hidden');
});

// READ: Ouvir banco em tempo real
onValue(songsRef, (snapshot) => {
  const data = snapshot.val();
  allSongs = [];
  
  if (data) {
    Object.keys(data).forEach((id) => {
      allSongs.push({ id, ...data[id] });
    });
  }
  
  const termo = searchInput ? searchInput.value.toLowerCase().trim() : '';
  filtrarERenderizar(termo);
});

// Pesquisa
searchInput?.addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase().trim();
  filtrarERenderizar(termo);
});

function filtrarERenderizar(termo) {
  const filtradas = allSongs.filter(song => {
    const nome = (song.nome || '').toLowerCase();
    const estilo = (song.estilo || '').toLowerCase();
    const genero = (song.genero || '').toLowerCase();
    return nome.includes(termo) || estilo.includes(termo) || genero.includes(termo);
  });

  renderSongList(filtradas);
}

function renderSongList(songsToRender) {
  songGrid.innerHTML = '';

  if (songsToRender.length === 0) {
    songGrid.innerHTML = '<p style="color: #b3b3b3; grid-column: 1/-1;">Nenhuma música encontrada.</p>';
    return;
  }

  songsToRender.forEach(song => renderSongCard(song));
}

// Renderizar Card Individual
function renderSongCard(song) {
  const card = document.createElement('div');
  card.className = 'song-card';

  const coverSrc = song.capaBase64 || DEFAULT_COVER_SVG;

  card.innerHTML = `
    <img src="${coverSrc}" alt="Capa">
    <h3>${song.nome}</h3>
    <p><strong>Artista:</strong> ${song.estilo}</p>
    <p><strong>Gênero:</strong> ${song.genero}</p>
    <div class="card-actions">
      <button class="btn-primary btn-play">Tocar</button>
      <button class="btn-danger btn-delete">Remover da playlist</button>
    </div>
  `;

  // Tocar música com validação de áudio
  card.querySelector('.btn-play').addEventListener('click', () => {
    if (song.audioBase64 && song.audioBase64.startsWith('data:audio')) {
      audioPlayer.src = song.audioBase64;
      playerCover.src = coverSrc;
      playerTitle.textContent = song.nome;
      playerArtist.textContent = `${song.estilo} • ${song.genero}`;
      
      audioPlayer.play().catch(err => {
        console.error("Erro ao tocar áudio:", err);
        alert("O arquivo de áudio está corrompido ou o navegador bloqueou a reprodução.");
      });
    } else {
      alert("Esta música não possui um arquivo MP3 válido salvo.");
    }
  });

  // Remover da Playlist (Excluir do banco)
  card.querySelector('.btn-delete').addEventListener('click', async () => {
    if (confirm(`Deseja remover "${song.nome}" da playlist?`)) {
      try {
        await remove(ref(rtdb, `musicas/${song.id}`));
      } catch (err) {
        console.error("Erro ao remover música:", err);
      }
    }
  });

  songGrid.appendChild(card);
}

// CREATE (Adicionar nova música)
songForm?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nome = document.getElementById('song-name').value;
  const estilo = document.getElementById('song-style').value;
  const genero = document.getElementById('song-genre').value;
  
  const mp3File = document.getElementById('song-file').files[0];
  const coverFile = document.getElementById('song-cover-file').files[0];
  const saveBtn = document.getElementById('btn-save');

  if (!mp3File) {
    alert("Selecione um arquivo MP3 para cadastrar a música.");
    return;
  }

  saveBtn.disabled = true;
  saveBtn.textContent = "Processando...";

  try {
    const audioBase64 = await fileToBase64(mp3File);
    const capaBase64 = coverFile ? await fileToBase64(coverFile) : '';

    await push(songsRef, {
      nome,
      estilo,
      genero,
      audioBase64,
      capaBase64,
      criadoEm: new Date().toISOString()
    });

    modal.classList.add('hidden');
    songForm.reset();
  } catch (error) {
    console.error("Erro ao salvar música:", error);
    alert("Erro ao salvar! Verifique se o arquivo MP3 não é muito pesado.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Salvar";
  }
});