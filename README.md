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
- **Styling**: TailwindCSS with a token-based design system (layered dark surfaces, cyan / magenta accents), optimized for Mobile / Tablet / Desktop
- **Streaming**: Advanced HLS.js integration for adaptive bitrate broadcasts

---

## ✨ Key Features

### 💎 Premium Design & UX
- **v4 Design System**: Layered near-black surfaces with two signal colours — **cyan** for live / primary actions, **magenta** for saved stations. Every colour, radius, shadow, type size and motion timing comes from shared design tokens, so all views look and behave alike.
- **Living Station Cards** 🎨: Every card carries unique, deterministically generated artwork — a gradient and monogram derived from the station's name (safe for Arabic, CJK and emoji names) — so there is never a broken image. The whole card is one play button, with a solid play / pause / retry button always visible in the corner. The station on air gets a crisp cyan edge, a "LIVE" badge and an animated equalizer (no glow over the artwork, so the pause control stays readable); buffering / reconnecting stations show a quiet status label; a failed stream offers a retry without ever breaking the card.
- **One Heading Pattern**: Home, Global Top Charts, Shuffle, Favourites and Search all share the same section heading — title, subtitle, accent bar and a live indicator where relevant.
- **Responsive Hardening**: Grid of 2 columns on phones up to 6 on wide screens; no horizontal scrolling or overlapping elements from 320 px phones (portrait and landscape) through tablets to 4K displays, with safe-area support for notched devices.
- **Instant First Paint**: A static app shell (header, heading and skeleton cards) appears before the app loads and is replaced without any layout shift; shimmer skeletons cover later data fetches.
- **Friendly States**: Clear, plain-language messages for errors (with a "Try again" button), empty results, an offline banner, and a "New version available → Refresh" notice.
- **Scroll to Top**: A floating button appears once you scroll down long lists.
- **Keyboard Shortcuts**: Power-user navigation built in (see shortcuts section below).

### 🧭 Navigation
- **Phones — one navigation bar**: A bottom tab bar (Home, Charts, Shuffle, Saved, Search) with a saved-station count badge; the top bar keeps only the logo and the Install button. The mini player docks just above the tab bar.
- **Desktop**: Header with the search field (`/` to focus) and Charts / Shuffle / Favorites buttons, plus a quiet status footer; the mini player floats above it.
- **Country Filter**: A searchable dropdown that sits clear of the navigation, with full keyboard support (arrows, Home / End, Enter, Esc).

### 🎛️ Player & Station Details
- **Mini Player**: Station artwork, live status line, play / pause, favourite, and volume (a pop-out slider on phones); a "Try again" button appears when a stream fails.
- **Station Details**: Opens as a bottom sheet on phones and a centred dialog on desktop, showing the station's details with copy-stream-link and play / pause actions; closes with Esc, the close button or a tap outside, and returns focus to where you were.

### ♿ Accessibility & App Experience
- **WCAG 2.2 AA**: Every text colour meets contrast requirements, every tap target is at least 44 × 44 px, headings are in order, and all controls have clear names for screen readers, with live announcements of player status.
- **Keyboard First**: Everything works without a mouse, with visible focus rings; dialogs trap focus and shortcuts never hijack a focused control or a text field.
- **Reduced Motion**: Animations are switched off for visitors who prefer reduced motion.
- **Right-to-Left Names**: Arabic and Hebrew station names display in the correct direction.
- **Installable App**: Install Nebula Cast FM to your home screen (an "Install" button on supported browsers, a one-time "Share → Add to Home Screen" tip on iPhone); the app shell loads offline.

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
| `Space` | Play / Pause active broadcast (a focused button or field keeps its normal Space behaviour) |
| `/` | Focus the search bar |
| `Esc` | Close the station details or the country list |
| `Shift + A` | Open Broadcast Control Dashboard (ignored while typing) |

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

---

<p align="center">
  <a href="https://buymeacoffee.com/muhammedshihab1001" target="_blank" rel="noopener noreferrer">
    <img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=%E2%98%95&slug=muhammedshihab1001&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Buy me a coffee" height="50" />
  </a>
</p>
