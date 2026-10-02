import { rtdb, auth } from './firebaseconfig.js';
import { 
  ref, 
  push, 
  onValue, 
  remove 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Capa padrão em SVG (caso a música não tenha capa enviada)
const DEFAULT_COVER_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 24 24' fill='%231db954'><rect width='100%' height='100%' fill='%23282828'/><path d='M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z'/></svg>`;

// Elementos do DOM
const songGrid = document.getElementById('song-grid');
const songForm = document.getElementById('song-form');
const modal = document.getElementById('modal');
const btnOpenModal = document.getElementById('btn-open-modal');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnLogout = document.getElementById('btn-logout');
const userEmailDisplay = document.getElementById('user-email-display');
const searchInput = document.getElementById('search-input');

// Elementos do Player de Áudio
const audioPlayer = document.getElementById('audio-player');
const playerCover = document.getElementById('player-cover');
const playerTitle = document.getElementById('player-title');
const playerArtist = document.getElementById('player-artist');
const volumeSlider = document.getElementById('volume-slider');
const btnMute = document.getElementById('btn-mute');
const volumeIcon = document.getElementById('volume-icon');

// Referência do banco
const songsRef = ref(rtdb, 'musicas');
let allSongs = [];
let lastVolume = 1;

// ----------------------------------------------------
// 1. SEGURANÇA E AUTENTICAÇÃO
// ----------------------------------------------------
onAuthStateChanged(auth, (user) => {
  if (user) {
    if (userEmailDisplay) userEmailDisplay.textContent = user.email;
    carregarMusicas();
  } else {
    // Redireciona para o login se não estiver autenticado
    window.location.href = 'login.html';
  }
});

btnLogout?.addEventListener('click', () => {
  signOut(auth).then(() => {
    window.location.href = 'login.html';
  });
});

// ----------------------------------------------------
// 2. TELA E RENDERIZAÇÃO DOS CARDS (Otimizado para Safari)
// ----------------------------------------------------
function carregarMusicas() {
  onValue(songsRef, (snapshot) => {
    songGrid.innerHTML = '';
    allSongs = [];

    if (!snapshot.exists()) {
      renderEmptyState();
      return;
    }

    const data = snapshot.val();
    Object.keys(data).forEach((id) => {
      allSongs.push({ id, ...data[id] });
    });

    filtrarERenderizar(searchInput?.value.toLowerCase().trim() || '');
  });
}

function renderSongCard(song) {
  const card = document.createElement('div');
  card.className = 'song-card';

  const coverSrc = song.capaBase64 || DEFAULT_COVER_SVG;

  card.innerHTML = `
    <img src="${coverSrc}" alt="Capa da música">
    <h3>${song.nome}</h3>
    <p><strong>Artista:</strong> ${song.estilo}</p>
    <p><strong>Gênero:</strong> ${song.genero}</p>
    <div class="card-actions">
      <button class="btn-primary btn-play">Tocar</button>
      <button class="btn-danger btn-delete">Remover da playlist</button>
    </div>
  `;

  // AÇÃO TOCAR: Atribui o áudio levemente sob demanda para evitar travamentos no Safari
  card.querySelector('.btn-play').addEventListener('click', async () => {
    try {
      if (!song.audioBase64 || !song.audioBase64.startsWith('data:audio')) {
        alert("Esta música não possui um arquivo de áudio válido.");
        return;
      }

      audioPlayer.src = song.audioBase64;
      playerCover.src = coverSrc;
      playerTitle.textContent = song.nome;
      playerArtist.textContent = `${song.estilo} • ${song.genero}`;

      // Inicia reprodução
      await audioPlayer.play();
    } catch (err) {
      console.error("Erro ao reproduzir áudio:", err);
      alert("O navegador impediu a execução ou o arquivo de áudio é muito pesado para a memória.");
    }
  });

  // AÇÃO REMOVER
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

function renderEmptyState() {
  songGrid.innerHTML = `
    <div class="empty-state" style="grid-column: 1/-1; text-align: center; color: #b3b3b3; padding: 40px 0;">
      <i class="fa-solid fa-music" style="font-size: 48px; margin-bottom: 16px; color: #1db954;"></i>
      <p>Sua biblioteca está vazia.</p>
      <p>Clique em "+ Nova Música" para adicionar suas faixas!</p>
    </div>
  `;
}

// ----------------------------------------------------
// 3. BARRA DE PESQUISA (BUSCA)
// ----------------------------------------------------
searchInput?.addEventListener('input', (e) => {
  const termo = e.target.value.toLowerCase().trim();
  filtrarERenderizar(termo);
});

function filtrarERenderizar(termo) {
  songGrid.innerHTML = '';

  const musicasFiltradas = allSongs.filter(song => {
    return (song.nome && song.nome.toLowerCase().includes(termo)) ||
           (song.estilo && song.estilo.toLowerCase().includes(termo)) ||
           (song.genero && song.genero.toLowerCase().includes(termo));
  });

  if (musicasFiltradas.length === 0) {
    if (allSongs.length === 0) {
      renderEmptyState();
    } else {
      songGrid.innerHTML = '<p style="grid-column: 1/-1; color: #b3b3b3;">Nenhuma música encontrada com essa busca.</p>';
    }
    return;
  }

  musicasFiltradas.forEach(song => renderSongCard(song));
}

// ----------------------------------------------------
// 4. CADASTRO DE MÚSICAS (CREATE)
// ----------------------------------------------------
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

  // Trava de tamanho para não travar conexões de rede do celular (máx ~4MB)
  if (mp3File.size > 4.5 * 1024 * 1024) {
    alert("O arquivo MP3 é muito pesado para o banco em texto (limite recomendado: 4MB). Escolha um arquivo menor.");
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
    alert("Erro ao salvar a música no banco de dados.");
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Salvar";
  }
});

// Conversor de arquivo para Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });
}

// ----------------------------------------------------
// 5. CONTROLE DO MODAL
// ----------------------------------------------------
btnOpenModal?.addEventListener('click', () => {
  modal.classList.remove('hidden');
});

btnCloseModal?.addEventListener('click', () => {
  modal.classList.add('hidden');
  songForm.reset();
});

window.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.add('hidden');
    songForm.reset();
  }
});

// ----------------------------------------------------
// 6. CONTROLE DE VOLUME (com parseFloat)
// ----------------------------------------------------
volumeSlider?.addEventListener('input', (e) => {
  const vol = parseFloat(e.target.value);
  audioPlayer.volume = vol;
  atualizarIconeVolume(vol);
});

btnMute?.addEventListener('click', () => {
  if (audioPlayer.volume > 0) {
    lastVolume = audioPlayer.volume;
    audioPlayer.volume = 0;
    volumeSlider.value = 0;
    atualizarIconeVolume(0);
  } else {
    audioPlayer.volume = lastVolume;
    volumeSlider.value = lastVolume;
    atualizarIconeVolume(lastVolume);
  }
});

function atualizarIconeVolume(vol) {
  if (!volumeIcon) return;
  if (vol === 0) {
    volumeIcon.className = 'fa-solid fa-volume-xmark';
  } else if (vol < 0.5) {
    volumeIcon.className = 'fa-solid fa-volume-low';
  } else {
    volumeIcon.className = 'fa-solid fa-volume-high';
  }
}