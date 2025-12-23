const list = document.getElementById("stationList");
const searchInput = document.getElementById("searchInput");
const loadMoreBtn = document.getElementById("loadMoreBtn");
const player = document.getElementById("player");
const scrollBtn = document.getElementById("scrollTopBtn");

const PAGE_SIZE = 24;

let stations = [];
let visible = [];
let activeList = [];
let index = 0;
let isSearching = false;
let currentStationIndex = null;

/* ===== LOAD DATA ===== */
fetch("data/stations_clean.json")
  .then(res => res.json())
  .then(data => {
    stations = shuffle(data);
    loadNext();
  })
  .catch(() => {
    list.innerHTML = "<p class='text-danger'>Failed to load stations</p>";
  });

/* ===== LOAD NEXT ===== */
function loadNext() {
  if (isSearching) return;

  const next = stations.slice(index, index + PAGE_SIZE);
  visible = visible.concat(next);
  index += PAGE_SIZE;

  activeList = visible;
  render(activeList);
}

/* ===== RENDER ===== */
function render(data) {
  list.innerHTML = "";

  data.forEach((s, i) => {
    const isPlaying = currentStationIndex === i;

    const col = document.createElement("div");
    col.className = "col-md-4 mb-4";

    col.innerHTML = `
      <div class="station-card p-3 h-100 ${isPlaying ? "playing" : ""}">
        <div class="d-flex justify-content-between align-items-center">
          <div class="station-title">${s.name}</div>
          <button class="play-btn" onclick="togglePlay(${i})">
            ${isPlaying ? "⏸" : "▶"}
          </button>
        </div>

        <div class="mt-3 d-flex justify-content-between align-items-center">
          <small class="text-muted">${s.country || "Unknown"}</small>
          <button class="btn btn-sm btn-outline-light"
            onclick="showInfo(${i})">Info</button>
        </div>
      </div>
    `;

    list.appendChild(col);
  });
}

/* ===== PLAY / PAUSE ===== */
function togglePlay(i) {
  const station = activeList[i];
  if (!station) return;

  if (currentStationIndex === i) {
    player.pause();
    currentStationIndex = null;
    render(activeList);
    return;
  }

  player.pause();
  player.src = station.url;
  player.play().catch(() => alert("Stream not supported"));

  currentStationIndex = i;
  render(activeList);
}

/* ===== PLAYER ERROR ===== */
player.onerror = () => {
  alert("This station is not working");
  currentStationIndex = null;
  render(activeList);
};

/* ===== SEARCH (FREEZE MODE) ===== */
searchInput.addEventListener("input", e => {
  const q = e.target.value.trim().toLowerCase();

  if (q !== "") {
    isSearching = true;
    loadMoreBtn.style.display = "none";

    const results = stations.filter(s =>
      s.name.toLowerCase().includes(q) ||
      (s.country || "").toLowerCase().includes(q)
    );

    activeList = results.slice(0, 50);
    currentStationIndex = null;
    render(activeList);
    return;
  }

  isSearching = false;
  loadMoreBtn.style.display = "block";
  activeList = visible;
  currentStationIndex = null;
  render(activeList);
});

/* ===== INFO MODAL ===== */
function showInfo(i) {
  const s = activeList[i];
  if (!s) return;

  document.getElementById("modalBody").innerHTML = `
    <p><strong>Name:</strong> ${s.name}</p>
    <p><strong>Country:</strong> ${s.country || "Unknown"}</p>
    <p><strong>Bitrate:</strong> ${s.bitrate} kbps</p>
    <p><strong>Codec:</strong> ${s.codec}</p>
    <p class="small text-break">${s.url}</p>
  `;

  new bootstrap.Modal(document.getElementById("infoModal")).show();
}

/* ===== LOAD MORE ===== */
loadMoreBtn.onclick = loadNext;

/* ===== SCROLL TO TOP ===== */
window.addEventListener("scroll", () => {
  scrollBtn.style.display = window.scrollY > 300 ? "block" : "none";
});

scrollBtn.onclick = () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ===== SHUFFLE ===== */
function shuffle(arr) {
  return arr
    .map(v => ({ v, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map(o => o.v);
}
