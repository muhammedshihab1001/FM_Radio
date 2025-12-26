/* ================= ELEMENTS ================= */

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

/* MINI PLAYER */
const miniPlayer = document.getElementById("miniPlayer");
const miniTitle = document.getElementById("miniTitle");
const miniCountry = document.getElementById("miniCountry");
const miniPlayBtn = document.getElementById("miniPlayBtn");
const miniFavBtn = document.getElementById("miniFavBtn");

/* ================= CONFIG ================= */

const PAGE_SIZE = 24;

/* ================= STATE ================= */

let stations = [];          // home feed (mixed + randomized)
let unknownStations = [];   // cached unknown
let baseList = [];
let visible = [];
let index = 0;

let worldChunkIndex = 1;
let unknownChunkIndex = 1;

let loadingWorld = false;
let loadingUnknown = false;
let unknownFinished = false;

let mode = "home"; // home | search | country | favorites
let currentStationIndex = null;
let currentStation = null;

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

function shuffle(arr) {
  return arr
    .map(v => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.v);
}

/* ================= DATA LOADERS ================= */

/* WORLD CHUNKS */
async function loadWorldChunk() {
  if (loadingWorld) return;
  loadingWorld = true;

  try {
    const res = await fetch(`data/chunks/world_${worldChunkIndex}.json`);
    if (!res.ok) return;

    const data = shuffle(await res.json());
    stations.push(...data);
    baseList = stations;
    worldChunkIndex++;
  } catch {}

  loadingWorld = false;
}

/* UNKNOWN CHUNKS */
async function loadUnknownChunk() {
  if (loadingUnknown || unknownFinished) return;
  loadingUnknown = true;

  try {
    const res = await fetch(`data/unknown/unknown_${unknownChunkIndex}.json`);
    if (!res.ok) {
      unknownFinished = true;
      return;
    }

    const data = shuffle(await res.json());
    unknownStations.push(...data);

    /* mix small % into home */
    stations.push(...data.slice(0, 40));
    stations = shuffle(stations);
    baseList = stations;

    unknownChunkIndex++;
  } catch {
    unknownFinished = true;
  }

  loadingUnknown = false;
}

/* ================= INIT ================= */

async function init() {
  await loadCountries();
  updateFavCount();

  await loadWorldChunk();
  loadUnknownChunk();

  resetToHome();
}

init();

/* ================= COUNTRIES ================= */

async function loadCountries() {
  const res = await fetch("data/meta/countries_clean.json");
  const countries = await res.json();

  countries.forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    countryFilter.appendChild(o);
  });
}

/* ================= MODE HELPERS ================= */

function resetToHome() {
  mode = "home";
  backBtn.classList.add("d-none");
  emptyFav.classList.add("d-none");
  searchInput.value = "";
  countryFilter.value = "";

  baseList = shuffle(stations);
  visible = [];
  index = 0;
  list.innerHTML = "";

  loadNext();
}

/* ================= PAGINATION ================= */

function loadNext() {
  if (mode !== "home") return;

  const next = baseList.slice(index, index + PAGE_SIZE);

  if (!next.length) {
    loadWorldChunk();
    loadUnknownChunk();
    return;
  }

  visible = visible.concat(next);
  index += PAGE_SIZE;

  render();
  updateLoadMoreVisibility();
}

function updateLoadMoreVisibility() {
  loadMoreBtn.style.display =
    mode === "home" && index < baseList.length
      ? "inline-block"
      : "none";
}

/* ================= RENDER ================= */

function render() {
  list.innerHTML = "";
  emptyFav.classList.add("d-none");

  if (visible.length === 0) {
    if (mode === "favorites") emptyFav.classList.remove("d-none");
    return;
  }

  visible.forEach((s, i) => {
    const key = normalizeUrl(s.url);
    const isFav = favorites[key];
    const isPlaying =
      currentStation &&
      normalizeUrl(currentStation.url) === key &&
      !player.paused;

    list.insertAdjacentHTML("beforeend", `
      <div class="col-md-4 mb-4">
        <div class="station-card p-3 h-100 ${isPlaying ? "playing" : ""}">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <div class="station-title">${s.name}</div>
              <small>${getNowPlayingText(s)}</small>
            </div>
            <button class="play-btn" onclick="togglePlay(${i})">
              ${isPlaying ? "⏸" : "▶"}
            </button>
          </div>

          <div class="mt-3 d-flex justify-content-between align-items-center">
            <small>${s.country || "Unknown"}</small>
            <div>
              <button class="favorite-btn ${isFav ? "active" : ""}"
                onclick="toggleFavorite('${key}', '${s.name.replace(/'/g, "")}')">♥</button>
              <button class="btn btn-sm btn-outline-light"
                onclick="showInfo(${i})">Info</button>
            </div>
          </div>
        </div>
      </div>
    `);
  });

  updateMiniPlayer();
}

/* ================= PLAYER ================= */

function togglePlay(i) {
  const s = visible[i];
  if (!s) return;

  if (
    currentStation &&
    normalizeUrl(currentStation.url) === normalizeUrl(s.url) &&
    !player.paused
  ) {
    player.pause();
  } else {
    player.pause();
    player.src = s.url;
    player.play().catch(() => {});
    currentStation = s;
    currentStationIndex = i;
  }

  render();
}

player.addEventListener("pause", render);
player.addEventListener("play", render);

/* ================= MINI PLAYER ================= */

function updateMiniPlayer() {
  if (!currentStation) {
    miniPlayer.classList.add("d-none");
    return;
  }

  miniTitle.textContent = currentStation.name;
  miniCountry.textContent = currentStation.country || "Unknown";
  miniPlayBtn.textContent = player.paused ? "▶" : "⏸";

  const key = normalizeUrl(currentStation.url);
  miniFavBtn.classList.toggle("active", !!favorites[key]);
  miniPlayer.classList.remove("d-none");
}

miniPlayBtn.onclick = () => {
  player.paused ? player.play() : player.pause();
};

miniFavBtn.onclick = () => {
  if (!currentStation) return;
  toggleFavorite(normalizeUrl(currentStation.url), currentStation.name);
};

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

  if (mode === "favorites") {
    applyFavoritesView();
  } else {
    render();
  }
}

function updateFavCount() {
  favCountEl.textContent = Object.keys(favorites).length;
}

favToggleBtn.onclick = () => {
  mode = "favorites";
  backBtn.classList.remove("d-none");

  baseList = stations.filter(s =>
    favorites[normalizeUrl(s.url)]
  );

  visible = baseList;
  render();
  updateLoadMoreVisibility();
};

function applyFavoritesView() {
  baseList = stations.filter(s =>
    favorites[normalizeUrl(s.url)]
  );
  visible = baseList;
  render();
}

/* ================= SEARCH ================= */

searchInput.addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();

  if (!q) {
    resetToHome();
    return;
  }

  mode = "search";
  backBtn.classList.add("d-none");

  loadUnknownChunk();

  baseList = [...stations, ...unknownStations].filter(s =>
    s.name.toLowerCase().includes(q) ||
    (s.country || "").toLowerCase().includes(q)
  );

  visible = baseList;
  render();
  updateLoadMoreVisibility();
});

/* ================= COUNTRY FILTER ================= */

countryFilter.onchange = async () => {
  const c = countryFilter.value;

  if (!c) {
    resetToHome();
    return;
  }

  mode = "country";
  backBtn.classList.remove("d-none");

  const res = await fetch(`data/country/${c.replace(/ /g, "_")}.json`);
  baseList = await res.json();

  visible = baseList;
  render();
  updateLoadMoreVisibility();
};

/* ================= INFO ================= */

function showInfo(i) {
  const s = visible[i];
  document.getElementById("modalBody").innerHTML = `
    <p><b>Name:</b> ${s.name}</p>
    <p><b>Country:</b> ${s.country || "Unknown"}</p>
    <p><b>Bitrate:</b> ${s.bitrate}</p>
    <p><b>Codec:</b> ${s.codec}</p>
    <p class="small">${s.url}</p>
  `;
  new bootstrap.Modal(infoModal).show();
}

/* ================= TOAST ================= */

function showToast(msg) {
  toastMsg.textContent = msg;
  new bootstrap.Toast(toastEl, { delay: 2000 }).show();
}

/* ================= SCROLL ================= */

window.addEventListener("scroll", () => {
  scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
});

scrollBtn.onclick = () =>
  window.scrollTo({ top: 0, behavior: "smooth" });

loadMoreBtn.onclick = loadNext;
goHomeBtn.onclick = resetToHome;
backBtn.onclick = resetToHome;
