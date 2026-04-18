# 🌌 Nebula Cast FM

A production-grade Global Radio discovery built with React, Vite, and Tailwind CSS.

---

## 🛠️ Technical Stack

![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

- **Engine**: [React 18](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Logic**: TypeScript
- **Routing**: Internal State-based Terminal Flow
- **State Management**: Performance-tuned React Hooks (`useStations`, `usePlayer`, `useFavorites`)

---

## 📡 Data Source

- **Provider**: [radio-browser.info](https://www.radio-browser.info/)
- **Protocol**: Custom Core Interface utilizing REST endpoints with cursor-based pagination.
- **Optimization**: Progressive data loading and lazy audio initialization.

---

## 📊 Global Network Stats (Current Cycle)

The terminal is currently synchronized with a massive global radio mesh:

- 🌍 **Total Stations Focused**: `850,000+`
- 🗺 **Regional Nodes (Countries)**: `190+`

### Signal Sectors (Global Node Inventory)

The terminal is currently locked onto the following regional signal densities.

| Sector Node | Station Count | Sector Node | Station Count |
| :--- | :--- | :--- | :--- |
| **United States** | 393,783 | **Germany** | 34,127 |
| **Brazil** | 13,744 | **France** | 10,368 |
| **Russia** | 9,145 | **Greece** | 5,498 |
| **United Kingdom**| 4,701 | **Argentina** | 3,680 |
| **Italy** | 3,423 | **Canada** | 2,948 |
| **Switzerland** | 2,730 | **Mexico** | 2,370 |
| **China** | 2,171 | **Australia** | 2,169 |
| **Spain** | 2,054 | **Colombia** | 1,919 |
| **Netherlands** | 1,770 | **Chile** | 1,635 |
| **Poland** | 1,269 | **Australia** | 2,169 |
| **India** | 712 | **Ecuador** | 729 |
| **Belgium** | 711 | **Austria** | 671 |
| **Sweden** | 392 | **Uae** | 313 |
| **Romania** | 287 | **Turkey** | 208 |
| **Ukraine** | 183 | **Portugal** | 183 |
| **Norway** | 199 | **Serbia** | 172 |
| **Czechia** | 146 | **Bulgaria** | 138 |
| **Ireland** | 130 | **Venezuela** | 129 |
| **Denmark** | 123 | **Peru** | 158 |
| **Finland** | 54 | **Thailand** | 54 |
| **Singapore** | 44 | **Pakistan** | 40 |
| **Israel** | 70 | **Japan** | 48 |
| **South Africa** | 233 | **Egypt** | 30 |
| **Kenya** | 24 | **Nigeria** | 35 |
| **Afghanistan** | 56 | **Albania** | 13 |
| **Global Unsorted**| 363,589 | **TOTAL** | **~850,000+** |

*...and 150+ other regional nodes active in the mesh.*

---

## 🏗️ Project Architecture

```text
├── public/          # Static assets
├── src/
│   ├── components/  # Core UI components
│   ├── hooks/       # Custom React Hooks
│   ├── styles/      # Global CSS and Tailwind directives
│   ├── types/       # TypeScript type definitions
│   ├── App.tsx      # Core application logic
│   └── main.tsx     # Application entry point
├── package.json     # Project dependencies and scripts
└── vercel.json      # Deployment configuration
```

---

## 🚀 Installation & Local Development

### Prerequisites

- **Node.js**: `v18.0.0` or higher
- **npm**: `v9.0.0` or higher

### Setup Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/muhammedshihab1001/FM_Radio.git
   cd FM_Radio
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory based on `.env.example`:
   ```env
   VITE_API_BASE_URL=https://your-radio-api.com
   ```

4. **Launch the environment**:
   ```bash
   npm run dev
   ```

---

## 🛠️ Available Scripts

- `npm run dev`: Starts the terminal in development mode.
- `npm run build`: Compiles the application for production deployment.
- `npm run preview`: Previews the production build locally.

---

## ⚠️ Disclaimer

Nebula Cast FM does not host, store, or rebroadcast any proprietary audio content. All stream links are public signals sourced from the open web via the radio-browser.info community project.

---

## 📜 License

This project is licensed under the **MIT License**.

---

## 👨‍💻 Author

**Muhammed Shihab P**

> *“Nebula Cast FM: Discovering the sound of the universe, one frequency at a time.”*

