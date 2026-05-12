# 🌌 Nebula Cast FM

### *The future of global radio, delivered with premium clarity.*

Nebula Cast FM is a professional, high-performance FM broadcasting and discovery platform. Designed with a sleek, premium dark aesthetic, it provides seamless access to a massive worldwide network of over **872,000+** radio stations — filtered to real geographic locations only — with near-zero latency and hardened cross-device responsiveness.

---

## 🛠️ Technical Stack

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

- **Engine**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: TypeScript — fully typed throughout
- **Styling**: TailwindCSS + Glassmorphism UI (optimized for Mobile / Tablet / Desktop)
- **Streaming**: Advanced HLS.js integration for adaptive bitrate broadcasts

---

## ✨ Key Features

### 💎 Premium Design & UX
- **Aurora Aesthetic**: Sleek dark mode with glassmorphism panels, vibrant gradients, and micro-animations.
- **Responsive Hardening**: Zero-breakage layout optimised for mobile touch-targets through to 4K displays.
- **Skeleton Loaders**: Shimmer placeholders during data fetches for a polished loading experience.
- **Keyboard Shortcuts**: Power-user navigation built in (see shortcuts section below).

### 📻 Discovery & Browsing
- **Estonia Home Page**: Opens directly to Estonian stations — a curated starting point for discovery.
- **Discovery Shuffle** 🔀: Picks a random real country from the global database on every press. The country filter updates instantly to reflect the chosen location, giving true variety with each tap.
- **Global Top Charts** ⚡: Dedicated trending section showing the most played broadcasts across the global network, complete with a live-signal heading and animated indicator.
- **Country Filter**: Browse by any of 190+ real geographic countries. "Global" catch-all entries are excluded — every station shown belongs to a real location.
- **Smart Search**: Full-text station search with debounce and real-time results.
- **Infinite Scroll**: Seamless load-more for country browsing sessions.

### 🎵 Playback Engine
- **Fast-Lock Audio**: Instantaneous playback with persistent stall-detection watchdogs.
- **Signal Resilience**: 3-layer recovery protocol — auto-re-syncs weak or interrupted broadcasts before surfacing an error.
- **HLS Support**: Native adaptive bitrate streaming via HLS.js with Safari fallback.
- **Mixed-Content Guard**: Automatically upgrades stream URLs to HTTPS where possible; blocks insecure streams on secure contexts.
- **Heartbeat Monitor**: Background heartbeat detects silent playback freeze and triggers recovery instantly.

### ❤️ Favourites
- **Persistent Collection**: Save stations to a local favourites list that persists across sessions.
- **One-Tap Access**: Dedicated favourites view with station count summary.

### ⌨️ Keyboard Shortcuts
| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause active broadcast |
| `/` | Focus the search bar |
| `Esc` | Close modal or clear focus |
| `Shift + A` | Open Broadcast Control Dashboard |

---

## 📡 Signal Handling & Stability

Nebula Cast FM implements an industrial-grade signal management architecture:

1. **Watchdog Monitoring** — A persistent background watchdog tracks the active broadcast. Prolonged buffering or stalling triggers an automatic recovery handshake.
2. **Heartbeat Synchronisation** — High-frequency playback checks detect silence drift or freeze and instantly re-sync the connection.
3. **Circuit Breaker** — Smart service protection that gracefully degrades under load, always returning results rather than errors.
4. **Client-Side Caching** — Discovered stations are cached in memory with intelligent TTL management, reducing redundant network requests on repeat visits.
5. **Signal Recovery Protocol** — Multi-stage recovery with clear visual status feedback (Connecting → Buffering → Recovering → Playing).
6. **Graceful Fallbacks** — Every data path has a fallback chain: fresh data → cached data → alternative source — ensuring the page is never blank.

---

## 🏗️ Project Architecture

```text
├── public/          # Static assets and branding
├── src/
│   ├── components/  # UI Modules (Header, StationCard, MiniPlayer, CountryFilter, etc.)
│   ├── hooks/       # Logic Controllers (usePlayer, useStations, useFavorites, useAdmin)
│   ├── services/    # Data Transfer Layer (api.ts)
│   ├── utils/       # Stream Resolvers and broadcast utilities
│   ├── types/       # Global schema and type definitions
│   └── App.tsx      # Main Application Controller
└── vercel.json      # Production deployment config
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: `v18.20.0` or higher
- **npm**: `v10.0.0` or higher

### Steps

1. **Clone Repository**:
   ```bash
   git clone https://github.com/muhammedshihab1001/FM_Radio.git
   cd FM_Radio
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment**:
   Create a `.env` file in the project root:
   ```env
   VITE_API_BASE_URL=your_api_endpoint_here
   ```

4. **Start Development Server**:
   ```bash
   npm run dev
   ```

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## 📊 Network Coverage

Connecting to **~872,000+** real-location broadcasts across **190+** countries.

| Region | Stations | Region | Stations |
| :--- | :--- | :--- | :--- |
| **United States** | 400k+ | **Germany** | 35k+ |
| **Brazil** | 15k+ | **France** | 12k+ |
| **Russia** | 10k+ | **Estonia** | 1k+ |
| **United Kingdom** | 8k+ | **India** | 1k+ |

> Only real geographic stations are indexed — catch-all global entries are excluded from all views.

---

## 👨‍💻 Author

**Muhammed Shihab P**

> *Connecting the globe through high-fidelity sound.*

---

## 📜 License
This project is licensed under the **MIT License**.
