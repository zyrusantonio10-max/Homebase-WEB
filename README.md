# Homebase 🏠

> A modern student dormitory discovery and room matching platform for Ariate Dormitory, helping students find affordable, convenient, and fitting accommodations.

---

## 📋 Features

- **Personalized Room Matching (`matches.html`)**: Enter your monthly budget and required amenities to receive an algorithmic fit ranking of available rooms.
- **Interactive Floor Plan (`floorplan.html`)**: Explore dormitory floors with schematic room layouts, real-time vacancy indicators, and quick-view room details.
- **Explore Rooms Catalog (`rooms.html`)**: Browse the complete room inventory with filter options by room type (*Single*, *Double*, *Quad*), availability status, and amenities.
- **Authentication & Roles (`index.html`)**: Client-side authentication supporting student and landlord profiles with secure local storage sessions.
- **Clean URLs & Deployment Ready**: Integrated `vercel.json` configuration for clean, modern URLs without `.html` extensions.

---

## 📂 Project Structure

```text
Homebase-WEB/
├── assets/
│   ├── js/
│   │   ├── auth.js           # Client authentication, user sessions & scoped storage
│   │   ├── compare.js        # Side-by-side room comparison manager
│   │   ├── reservation.js    # Student reservation request pipeline
│   │   ├── rooms.js          # Room inventory data, pricing, and amenities
│   │   └── tw-config.js      # Shared Tailwind CSS color scheme & design tokens
│   └── images/               # Media assets and illustrations
├── index.html                # Landing page and login/signup portal
├── home.html                 # Student overview & dashboard
├── matches.html              # Room recommendation & match scoring engine
├── rooms.html                # Room catalog with real-time filtering
├── floorplan.html            # Interactive multi-floor schematic viewer
├── vercel.json               # Deployment configuration (Clean URLs)
├── .gitignore                # Version control ignore list
└── README.md                 # Project documentation
```

---

## 🛠️ Tech Stack

- **Markup & Structure:** HTML5 (Semantic & Accessible)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (configured via `tw-config.js`)
- **Typography:** Public Sans & Sora via Google Fonts
- **Logic:** Vanilla JavaScript (ES6+) with `localStorage` client state
- **Hosting & Deployment:** [Vercel](https://vercel.com/)

---

## 🚀 Getting Started

### Local Development

No build step or package manager is required. You can run the project using any local HTTP server or VS Code extension:

1. **Using VS Code Live Server**:
   - Right-click `index.html` and click **"Open with Live Server"**.

2. **Using Python (built-in)**:
   ```bash
   python -m http.server 3000
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

3. **Using Node.js (`npx serve`)**:
   ```bash
   npx serve .
   ```

---

## 🌐 Deployment (Vercel)

1. Push your changes to your GitHub repository.
2. In the [Vercel Dashboard](https://vercel.com/dashboard), import your repository.
3. Keep the default settings (**Framework Preset: Other**, **Root Directory: `./`**).
4. Deploy! The included `vercel.json` ensures clean routes such as `/home`, `/matches`, `/rooms`, and `/floorplan`.




NOTES
- ADD MODALS TO EACH ROOM
- ADD REVIEWS 
- ADD A REVIEW SYSTEM ON THE COMPARED ROOMS BY THE USER (LIKE HOW OR WHAT IS THE REASON WHY THEY FIT)
