# 🌌 Nebula Cast FM

### *Discovering the sounds of the universe, one frequency at a time.*

Nebula Cast FM is an industrial-grade, high-fidelity Global Radio discovery terminal. Designed with a pure black holographic aesthetic, it provides seamless access to a massive mesh of over 30,000 global radio stations with near-zero latency.

---

## 🛠️ Technical Stack

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Hls.js](https://img.shields.io/badge/HLS.js-orange?style=for-the-badge)

- **Engine**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Logic**: 100% Type-safe TypeScript
- **Styling**: Tailwind CSS + Custom Glassmorphism UI
- **Streaming**: [Hls.js](https://github.com/video-dev/hls.js/) for modern adaptive bitrate signals

---

## ✨ Key Features

### 💎 Holographic Aesthetic
- **Pure Black Design**: Optimized for OLED displays and low-light environments.
- **Reactive Vector Lighting**: UI elements feature dynamic glows and micro-animations that respond to signal activity.
- **Glassmorphism**: High-blur backdrops and translucent borders create a sense of depth and focus.

### ⚡ Fast-Lock Streaming Engine
- **Near-Zero Latency**: Optimized HLS driver tuning for instantaneous playback engagement.
- **Priority Fetching**: Critical signal discovery requests are marked with high-priority flags at the network level.
- **Stable Core Lifecycle**: Decoupled audio lifecycle ensures un-interrupted playback during UI transitions.
- **Industrial Watchdog**: Real-time signal monitoring with automatic re-sync and stall detection.

### 🗺️ Global Discovery Mesh
- **30,000+ Nodes**: Access to a vast worldwide network of radio frequencies.
- **Deep Scan Discovery**: Search by name, country, city, or codec with high-speed indexing.
- **Signal Trending**: Real-time heartbeat tracking for the most active global signals.

### ⌨️ Terminal Mastery (Shortcuts)
- `Space`: Engage/Terminate active signal.
- `/`: Quick-focus Frequency Search.
- `Esc`: Clear focus or collapse active sector.
- `Shift + A`: Access Terminal Command Center (Admin).

---

## 🔐 Terminal Command Center (Admin)

The restricted Administrative panel provides industrial-grade maintenance tools:
- **Signal Pruning**: Flag dead or broken streams for exclusion from the mesh.
- **Registry Restoration**: Re-validate and restore previously flagged frequencies.
- **Global Mesh Cleanup**: Initialize deep-scan system cleanups to maintain network integrity.

---

## 🏗️ Project Architecture

```text
├── public/          # System assets and branding
├── src/
│   ├── components/  # Holographic UI Modules (Header, StationCard, MiniPlayer, etc.)
│   ├── hooks/       # Logic Controllers (usePlayer, useStations, useAdmin)
│   ├── services/    # Data Transfer Layer (API integration)
│   ├── utils/       # Signal Resolvers and Security utilities
│   ├── types/       # Global Schema and Signal definitions
│   └── App.tsx      # Terminal Command Logic
└── vercel.json      # Production deployment config
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: `v18.20.0` or higher
- **npm**: `v10.0.0` or higher

### Deployment Steps
1. **Initialize Terminal**:
   ```bash
   git clone https://github.com/muhammedshihab1001/FM_Radio.git
   cd FM_Radio
   ```
2. **Install Linkages**:
   ```bash
   npm install
   ```
3. **Configure Signal Core**:
   Create a `.env` file with your VITE_API_BASE_URL:
   ```env
   VITE_API_BASE_URL=https://your-radio-api.com
   ```
4. **Ignite Development**:
   ```bash
   npm run dev
   ```

---

## 📡 Data Source
- **Provider**: radio-browser.info
- **Protocol**: Custom Core Interface utilizing REST endpoints with cursor-based pagination.
- **Optimization**: Progressive data loading and lazy audio initialization.

---

## ⚠️ Disclaimer
Nebula Cast FM does not host, store, or rebroadcast any proprietary audio content. All stream links are public signals sourced from the open web via the radio-browser.info community project.

---

## 📊 Global Network Stats

Locked onto **~850,000+** global nodes across **190+** countries.

| Sector Node | Density | Sector Node | Density |
| :--- | :--- | :--- | :--- |
| **USA** | 390k+ | **Germany** | 34k+ |
| **Brazil** | 13k+ | **France** | 10k+ |
| **Russia** | 9k+ | **India** | 700+ |

---

## 👨‍💻 Author

**Muhammed Shihab P**

> *Connecting the globe through high-fidelity sound.*

---

## 📜 License
This project is licensed under the **MIT License**.
