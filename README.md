# 🌌 Nebula Cast FM

### *The future of global radio, delivered with premium clarity.*

Nebula Cast FM is a professional, high-performance FM broadcasting and discovery website. Designed with a sleek, premium dark aesthetic, it provides seamless access to a massive network of over 30,000 global radio stations with near-zero latency and hardened cross-device responsiveness.

---

## 🛠️ Technical Stack

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)
![Cloudflare](https://img.shields.io/badge/Cloudflare-F38020?style=for-the-badge&logo=Cloudflare&logoColor=white)

- **Engine**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Architecture**: KV-First Edge-Cached backend alignment for O(1) discovery.
- **Styling**: Tailwind CSS + Custom Glassmorphism UI (Optimized for Mobile/Tablet/PC).
- **Streaming**: Advanced HLS.js integration for adaptive bitrate broadcasts.

---

## ✨ Key Features

### 💎 Premium Design & UX
- **Aurora Aesthetic**: Sleek dark mode with glassmorphism and vibrant gradients.
- **Responsive Hardening**: Zero-breakage layout optimized for mobile touch-targets and 4K displays.
- **Micro-Animations**: Subtle visual feedback for a refined, professional feel.

### ⚡ High-Performance Architecture
- **KV + Edge Cache**: Optimized for high concurrency with a multi-layered caching strategy.
- **Silent Prefetching**: Proactive sector loading (Page N+1) ensures zero-latency infinite scrolling.
- **Fast-Lock Audio**: Instantaneous playback engagement with stall-detection watchdogs.
- **Standardized Deduplication**: Built-in request deduplication to minimize network overhead.

### 🗺️ Global Discovery
- **30,000+ Stations**: Access a vast worldwide network of radio broadcasters.
- **Smart Filtering**: Search and filter by name, country, city, or codec with near-instant results.
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
│   ├── hooks/       # Logic Controllers (usePlayer, useStations, useAdmin)
│   ├── services/    # Data Transfer Layer (KV-aware API integration)
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
   Create a `.env` file with your VITE_API_BASE_URL:
   ```env
   VITE_API_BASE_URL=https://your-radio-api.com
   ```
4. **Start Development Server**:
   ```bash
   npm run dev
   ```

---

## 📡 Data Source & Compliance
- **Provider**: radio-browser.info
- **Protocol**: Custom Edge Interface utilizing cursor-based pagination.
- **Compliance**: Nebula Cast FM does not host audio content. All stream links are public signals sourced from the open web via the community-driven radio-browser project.

---

## 📊 Network Statistics

Connecting to **~850,000+** global broadcasters across **190+** countries.

| Region | Station Density | Region | Station Density |
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
