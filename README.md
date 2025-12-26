# 🎧 FM Radio Web App

A fast, scalable, and responsive **FM Radio streaming web application** built using **pure frontend technologies** and hosted on **GitHub Pages**.

The project is designed to efficiently handle a **very large dataset (270k+ radio stations)** while keeping the UI smooth and user-friendly on both **mobile and desktop devices**.

---

## 🌐 Live Demo

``` 
https://muhammedshihab1001.github.io/FM_Radio/
```


---

## ✨ Key Features

### 🎵 Playback
- Live FM radio streaming
- Play / Pause per station
- Only **one station plays at a time**
- Currently playing station highlighted
- Global mini player (persistent control bar)

### 🔍 Discovery & Navigation
- Search by **station name** or **country**
- Country-based filter (dropdown)
- Randomized home feed (new stations on every refresh)
- Scroll-to-top button for long lists

### ❤️ Favorites
- Add / remove stations from favorites
- Persistent favorites using `localStorage`
- Favorites count indicator
- Favorites-only view with back navigation
- Toast notifications for add/remove actions

### ℹ️ Station Info
- Station info popup showing:
  - Country
  - Bitrate
  - Codec
  - Stream URL

### 📄 Pagination & Performance
- Load More pagination (Home view only)
- Efficient handling of **270,000+ stations**
- Optimized frontend performance using split JSON files
- Lazy loading of less frequently accessed data

### 📱 UI & UX
- Clean dark theme
- Fully responsive (mobile, tablet, desktop)
- Mini player stays accessible without blocking UI
- Touch-friendly and keyboard-friendly controls

---

## 📊 Dataset Overview

The application currently works with a **large, global radio dataset**:

- 🌍 **Total stations:** `272,688`
- 🗺 **Total countries (including Unknown):** `193`
- ❓ **Unknown / missing country stations:** `243,057`

### Top countries by number of stations (examples)

| Country | Stations |
|-------|----------|
| United States | 3,703 |
| Germany | 3,476 |
| Russia | 1,946 |
| France | 1,567 |
| Greece | 1,279 |
| UK | 1,015 |
| Mexico | 925 |
| Italy | 832 |
| Canada | 813 |
| Australia | 1,162 |
| India | 523 |

> Stations with missing or unclear country information are grouped under **Unknown** and are still searchable and playable.

---

## 🆕 Recent Improvements

- Switched from a **single large JSON file** to a **split-data architecture**
  - World chunks
  - Country-wise files
  - Unknown station chunks
- Added a **global mini player** synced with station cards
- Improved Load More behavior (only shown when applicable)
- Fixed UI overlap issues on mobile devices
- Improved random station discovery on the home page
- Better state handling for Home / Search / Country / Favorites views

These changes significantly improved **performance, scalability, and user experience**.

---
## 🧱 Tech Stack

- HTML5
- CSS3
- JavaScript (Vanilla)
- Bootstrap 5
- HTML5 Audio API
- GitHub Pages

---

## 📡 Data Source

- **Radio-Browser**
  - https://www.radio-browser.info/
  - Public FM stream links

Station metadata and stream URLs are sourced from **Radio-Browser**, an open, community-driven radio directory.

To ensure performance and browser compatibility, the raw data is:
- Cleaned
- Normalized
- Stored as static JSON files
- Loaded progressively on demand

---
## ⚠️ Disclaimer

This project does **not host, store, or rebroadcast** any radio audio content.

All radio streams and station metadata are provided by **third-party sources** and are **publicly available on the internet**.  
Stream availability, content, and licensing are the responsibility of the respective radio stations and stream providers.

If any station owner has concerns regarding their listing or wishes to have their station removed from this project,  
they may contact the project maintainer via **GitHub Issues**, and the station will be removed promptly.

---

## 📜 MIT LICENSE

This project is licensed under the **MIT License**.

See the [LICENSE](LICENSE) file for details.

---

## 📌 Purpose

This project is created for **learning and educational purposes**.

It demonstrates:
- Browser-based audio streaming
- Handling very large datasets on the frontend
- Search, filtering, and pagination
- State management without frameworks
- Responsive UI design
- Performance optimization for static web apps


---
