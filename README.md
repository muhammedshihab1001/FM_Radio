# 🌌 Nebula Cast FM

### *The future of global radio, delivered with premium clarity.*

Nebula Cast FM is a professional, high-performance FM broadcasting and discovery website. Designed with a sleek, premium dark aesthetic, it provides seamless access to a massive network of over **872,000+** global radio stations with near-zero latency and hardened cross-device responsiveness.

---

## 🛠️ Technical Stack

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

- **Engine**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Architecture**: Edge-Cached synchronization for O(1) discovery.
- **Styling**: Vanilla CSS + Glassmorphism UI (Optimized for Mobile/Tablet/PC).
- **Streaming**: Advanced HLS.js integration for adaptive bitrate broadcasts.

---

## ✨ Key Features

### 💎 Premium Design & UX
- **Aurora Aesthetic**: Sleek dark mode with glassmorphism and vibrant gradients.
- **Responsive Hardening**: Zero-breakage layout optimized for mobile touch-targets and 4K displays.
- **Micro-Animations**: Subtle visual feedback for a refined, professional feel.

### ⚡ High-Performance Architecture
- **Edge Cache Optimization**: Optimized for high concurrency with multi-layered caching.
- **Silent Prefetching**: Proactive sector loading ensures zero-latency infinite scrolling.
- **Fast-Lock Audio**: Instantaneous playback engagement with stall-detection watchdogs.
- **Standardized Deduplication**: Built-in request deduplication to minimize network overhead.

### 🗺️ Global Discovery
- **872,000+ Stations**: Access a vast worldwide network of radio broadcasters.
- **Smart Filtering**: Search and filter by name, country, or location with near-instant results.
- **Trending Intelligence**: Real-time tracking of the most popular global stations.

### ⌨️ Navigation & Shortcuts
- `Space`: Toggle active broadcast (Play/Pause).
- `/`: Quick-focus the search bar.
- `Esc`: Close modals or clear search focus.
- `Shift + A`: Access the Administrative Dashboard.

---

## 🔐 Administrative Dashboard

The restricted Admin panel provides advanced maintenance tools for system integrity:
- **Station Management**: Manage broken or inactive stream links in real-time.
- **Database Restoration**: Re-validate and restore previously flagged stations.
- **System Cleanup**: Initialize database-wide cleanups to maintain high network standards.

---

## 🏗️ Project Architecture

```text
├── public/          # System assets and branding
├── src/
│   ├── components/  # Professional UI Modules (Header, StationCard, MiniPlayer, etc.)
│   ├── hooks/       # Logic Controllers (usePlayer, useStations, useFavorites)
│   ├── services/    # Data Transfer Layer
│   ├── utils/       # Stream Resolvers and UI utilities
│   ├── types/       # Global Schema and Type definitions
│   └── App.tsx      # Main Application Controller
└── vercel.json      # Production deployment config
```

---

## 🚀 Installation & Setup

### Prerequisites
- **Node.js**: `v18.20.0` or higher
- **npm**: `v10.0.0` or higher

### Deployment Steps
 
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
    Create a `.env` file with your API endpoint:
    ```env
    VITE_API_BASE_URL=your_api_endpoint_here
    ```
 4. **Start Development Server**:
    ```bash
    npm run dev
    ```

---

## 📊 Network Statistics

Connecting to **~872,000+** global broadcasters across **190+** countries.

| Region | Station Density | Region | Station Density |
| :--- | :--- | :--- | :--- |
| **USA** | 400k+ | **Germany** | 35k+ |
| **Brazil** | 15k+ | **France** | 12k+ |
| **Russia** | 10k+ | **India** | 1k+ |

---

## 👨‍💻 Author

**Muhammed Shihab P**

> *Connecting the globe through high-fidelity sound.*

---

## 📜 License
This project is licensed under the **MIT License**.
