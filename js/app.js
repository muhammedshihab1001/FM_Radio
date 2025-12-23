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

function normalizeUrl(url) {
  return url.trim().toLowerCase().replace(/\/$/, "");
}

/* ===== LOAD DATA ===== */
fetch("data/stations_clean.json")
  .then(res => res.json())
  .then(data => {
    stations = shuffle(data);
    baseList = stations;
    populateCountries();
    updateFavCount();
    resetAndLoad();
  });

/* ===== PAGINATION ===== */
function resetAndLoad() {
  index = 0;
  visible = [];
  loadNext();
}

function loadNext() {
  if (showFavorites) return;

  const next = baseList.slice(index, index + PAGE_SIZE);
  if (next.length === 0) return;

  visible = visible.concat(next);
  index += PAGE_SIZE;

  render();
  updateLoadMoreVisibility();
}

function updateLoadMoreVisibility() {
  if (showFavorites) {
    loadMoreBtn.style.display = "none";
    return;
  }
  loadMoreBtn.style.display =
    index < baseList.length ? "inline-block" : "none";
}

/* ===== RENDER ===== */
function render() {
  list.innerHTML = "";
  emptyFav.classList.add("d-none");

  if (showFavorites && visible.length === 0) {
    emptyFav.classList.remove("d-none");
    return;
  }

  visible.forEach((s, i) => {
    const key = normalizeUrl(s.url);
    const isPlaying = currentStationIndex === i;
    const isFav = favorites[key];

    list.innerHTML += `
      <div class="col-md-4 mb-4">
        <div class="station-card p-3 h-100 ${isPlaying ? "playing" : ""}">
          <div class="d-flex justify-content-between align-items-center">
            <div class="station-title">${s.name}</div>
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
    `;
  });
}

/* ===== FAVORITES ===== */
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

  if (showFavorites) applyFavoritesView();
  else render();
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

/* ===== SEARCH ===== */
searchInput.addEventListener("input", e => {
  showFavorites = false;
  backBtn.classList.add("d-none");

  const q = e.target.value.toLowerCase();
  baseList = q
    ? stations.filter(s =>
        s.name.toLowerCase().includes(q) ||
        (s.country || "").toLowerCase().includes(q)
      )
    : stations;

  resetAndLoad();
});

/* ===== COUNTRY FILTER ===== */
countryFilter.onchange = () => {
  showFavorites = false;
  backBtn.classList.add("d-none");

  const c = countryFilter.value;
  baseList = c
    ? stations.filter(s => s.country === c)
    : stations;

  resetAndLoad();
};

/* ===== PLAYER ===== */
function togglePlay(i) {
  const s = visible[i];
  if (!s) return;

  if (currentStationIndex === i) {
    player.pause();
    currentStationIndex = null;
  } else {
    player.pause();
    player.src = s.url;
    player.play();
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

  new bootstrap.Modal(document.getElementById("infoModal")).show();
}

/* ===== TOAST ===== */
function showToast(msg) {
  toastMsg.textContent = msg;
  new bootstrap.Toast(toastEl, { delay: 2000 }).show();
}

/* ===== SCROLL ===== */
window.addEventListener("scroll", () => {
  scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
});
scrollBtn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

function populateCountries() {
  const countries = [...new Set(stations.map(s => s.country).filter(Boolean))].sort();
  countries.forEach(c => {
    const opt = document.createElement("option");
    opt.value = c;
    opt.textContent = c;
    countryFilter.appendChild(opt);
  });
}

function shuffle(arr) {
  return arr
    .map(v => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.v);
}

/* ===== LOAD MORE CLICK ===== */
loadMoreBtn.onclick = loadNext;
