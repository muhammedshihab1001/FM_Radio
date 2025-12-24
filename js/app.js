const list = document.getElementById("stationList");
const searchInput = document.getElementById("searchInput");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const player = document.getElementById("player");
const scrollBtn = document.getElementById("scrollTopBtn");
const countryFilter = document.getElementById("countryFilter");
const favToggleBtn = document.getElementById("favToggleBtn");
const favCountEl = document.getElementById("favCount");
const toastEl = document.getElementById("favToast");
const toastMsg = document.getElementById("toastMsg");
const emptyFav = document.getElementById("emptyFav");
const goHomeBtn = document.getElementById("goHomeBtn");
const backBtn = document.getElementById("backBtn");

const PAGE_SIZE = 24;

let stations = [];
let baseList = [];
let visible = [];
let index = 0;
let showFavorites = false;
let currentStationIndex = null;

let favorites = JSON.parse(localStorage.getItem("favorites") || "{}");

/* ================= HELPERS ================= */

function normalizeUrl(url) {
  return url.trim().toLowerCase().replace(/\/$/, "");
}

function getNowPlayingText(st) {
  const artist = typeof st.artist === "string" ? st.artist.trim() : "";
  const song = typeof st.song === "string" ? st.song.trim() : "";

  if (artist && song) return `${artist} – ${song}`;
  if (song) return song;
  return "Live Radio";
}

/* ================= LOAD DATA ================= */

fetch("data/stations_clean.json")
  .then(res => res.json())
  .then(data => {
    stations = shuffle(data);
    baseList = stations;
    populateCountries();
    updateFavCount();
    resetAndLoad();
  })
  .catch(() => {
    list.innerHTML = `<p class="text-danger">Failed to load stations</p>`;
  });

/* ================= PAGINATION ================= */

function resetAndLoad() {
  index = 0;
  visible = [];
  loadNext();
}

function loadNext() {
  if (showFavorites) return;

  const next = baseList.slice(index, index + PAGE_SIZE);
  if (!next.length) return;

  visible = visible.concat(next);
  index += PAGE_SIZE;

  render();
  updateLoadMoreVisibility();
}

function updateLoadMoreVisibility() {
  loadMoreBtn.style.display =
    !showFavorites && index < baseList.length ? "inline-block" : "none";
}

/* ================= RENDER ================= */

function render() {
  list.innerHTML = "";
  emptyFav.classList.add("d-none");

  if (showFavorites && visible.length === 0) {
    emptyFav.classList.remove("d-none");
    return;
  }

  visible.forEach((s, i) => {
    const key = normalizeUrl(s.url);
    const isFav = favorites[key];
    const isPlaying = currentStationIndex === i;

    list.insertAdjacentHTML("beforeend", `
      <div class="col-md-4 mb-4">
        <div class="station-card p-3 h-100 ${isPlaying ? "playing" : ""}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="station-title">${s.name}</div>
              <small class="text-muted">${getNowPlayingText(s)}</small>
            </div>
            <button class="play-btn" onclick="togglePlay(${i})">
              ${isPlaying ? "⏸" : "▶"}
            </button>
          </div>

          <div class="mt-3 d-flex justify-content-between align-items-center">
            <small>${s.country || "Unknown"}</small>
            <div>
              <button class="favorite-btn ${isFav ? "active" : ""}"
                onclick="toggleFavorite('${key}', '${s.name}')">♥</button>
              <button class="btn btn-sm btn-outline-light"
                onclick="showInfo(${i})">Info</button>
            </div>
          </div>
        </div>
      </div>
    `);
  });
}

/* ================= FAVORITES ================= */

function toggleFavorite(key, name) {
  if (favorites[key]) {
    delete favorites[key];
    showToast(`Removed "${name}" from favorites`);
  } else {
    favorites[key] = true;
    showToast(`Added "${name}" to favorites`);
  }

  localStorage.setItem("favorites", JSON.stringify(favorites));
  updateFavCount();

  showFavorites ? applyFavoritesView() : render();
}

function updateFavCount() {
  favCountEl.textContent = Object.keys(favorites).length;
}

favToggleBtn.onclick = () => {
  showFavorites = true;
  applyFavoritesView();
};

function applyFavoritesView() {
  backBtn.classList.remove("d-none");
  baseList = stations.filter(s => favorites[normalizeUrl(s.url)]);
  visible = baseList;
  render();
  loadMoreBtn.style.display = "none";
}

backBtn.onclick = () => {
  backBtn.classList.add("d-none");
  showFavorites = false;
  baseList = stations;
  resetAndLoad();
};

goHomeBtn.onclick = backBtn.onclick;

/* ================= SEARCH & FILTER ================= */

searchInput.addEventListener("input", e => {
  backBtn.classList.add("d-none");
  showFavorites = false;

  const q = e.target.value.toLowerCase();
  baseList = q
    ? stations.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.country || "").toLowerCase().includes(q)
      )
    : stations;

  resetAndLoad();
});

countryFilter.onchange = () => {
  backBtn.classList.add("d-none");
  showFavorites = false;

  baseList = countryFilter.value
    ? stations.filter(s => s.country === countryFilter.value)
    : stations;

  resetAndLoad();
};

/* ================= PLAYER ================= */

function togglePlay(i) {
  const s = visible[i];
  if (!s) return;

  if (currentStationIndex === i) {
    player.pause();
    currentStationIndex = null;
  } else {
    player.pause();
    player.src = s.url;
    player.play().catch(() => {});
    currentStationIndex = i;
  }

  render();
}

function showInfo(i) {
  const s = visible[i];
  if (!s) return;

  document.getElementById("modalBody").innerHTML = `
    <p><b>Name:</b> ${s.name}</p>
    <p><b>Country:</b> ${s.country}</p>
    <p><b>Bitrate:</b> ${s.bitrate}</p>
    <p><b>Codec:</b> ${s.codec}</p>
    <p class="small">${s.url}</p>
  `;

  new bootstrap.Modal(infoModal).show();
}

/* ================= UI ================= */

function showToast(msg) {
  toastMsg.textContent = msg;
  new bootstrap.Toast(toastEl, { delay: 2000 }).show();
}

window.addEventListener("scroll", () => {
  scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
});
scrollBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

function populateCountries() {
  [...new Set(stations.map(s => s.country).filter(Boolean))]
    .sort()
    .forEach(c => {
      const o = document.createElement("option");
      o.value = c;
      o.textContent = c;
      countryFilter.appendChild(o);
    });
}

function shuffle(arr) {
  return arr
    .map(v => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.v);
}

loadMoreBtn.onclick = loadNext;
