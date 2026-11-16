# Homebase 🏠

> A student dormitory discovery and room matching platform for Ariate Dormitory, helping students find affordable, convenient, and fitting accommodations, and helping the dorm office manage requests.

---

## 📋 Features

**Sign-up (`register.html`)**
- A 3-step page: account, about you, then safety and consent. Every field is checked as you type, with plain messages.
- It collects only what a dormitory needs: name, email, password, date of birth, mobile number, school, student ID, course, year level, home province (optional), and an emergency contact.
- **Students under 18** (worked out from the date of birth) give a parent or guardian instead. They get a 6-digit approval code, and a parent or guardian approves the account on **`guardian.html`** by entering the student's email, the code and their own full name (5 wrong tries lock the code). Until then the student can browse, compare and save rooms but cannot request one. In the finished system the code is emailed to the parent.
- Profiles of students under 18 are never shown to other students.

**For students**
- **Home (`home.html`)**: best match, your preferences, your room request and its progress, saved rooms and recent comparisons.
- **My Matches (`matches.html`)**: enter your budget, room type, floor, in-room amenities and building perks, and what matters most. Rooms are ranked by fit, with a plain-language label (Great, Good, Okay, Weak), the reason, and a separate section for rooms a little over budget.
- **Explore Rooms (`rooms.html`)**: browse every room, filter by availability, type and floor, open any room to see its complete details, its reviews and who stays there, save it, request it, or tick Compare on up to three rooms.
- **Room requests**: students ask for a bed, agree to the house rules, and follow the request (pending, approved, paid, ended). Shared rooms (Double and Quad) stay open until their last bed is taken.
- **Reviews**: after a stay, students rate overall, commute, safety and cleanliness. The office can reply publicly and can hide a comment (never the ratings) with a visible reason.
- **Profile (`profile.html`)**: photo, contact, emergency contact, living habits, password change, and account deletion.

**For the dorm office (landlord)**
- **Dashboard (`landlord.html`)**: requests to answer, beds free, building perks, and approve / decline / mark as paid / end stay.
- **Rooms (`landlord-rooms.html`)**: add, edit, delete and close rooms.
- **Reviews (`landlord-reviews.html`)**: reply publicly or hide a comment with a reason.

**Other**
- **Clean URLs & Deployment Ready**: `vercel.json` gives URLs without `.html`.
- `floorplan.html` still exists but is not linked from anywhere on the site.

---

## 📂 Project Structure

```text
Homebase-WEB/
├── assets/
│   ├── css/
│   │   └── components.css    # Shared buttons, fields, pills and status chips
│   ├── js/
│   │   ├── auth.js           # Accounts, sessions, profiles, per-user storage keys, safe avatar helpers
│   │   ├── building.js       # Building-wide perks (CCTV, water station, curfew, ...)
│   │   ├── compare.js        # Side-by-side room comparison
│   │   ├── reservation.js    # Beds, room list, requests, house rules
│   │   ├── reviews.js        # Student reviews, office replies and hidden comments
│   │   ├── signup.js         # Sign-up rules for every field, and creating the account
│   │   ├── rooms.js          # Starting (sample) rooms and in-room amenity choices
│   │   └── tw-config.js      # The ONE place for the color palette (Tailwind + CSS variables)
│   └── images/
├── index.html                # Landing page and login
├── register.html             # 3-step student sign-up
├── guardian.html             # Parent or guardian approval for students under 18
├── home.html  matches.html  rooms.html  profile.html     # Student pages
├── landlord.html  landlord-rooms.html  landlord-reviews.html   # Office pages
├── floorplan.html            # Not linked from the site
├── vercel.json               # Clean URLs
└── README.md
```

---

## 🛠️ Tech Stack

- **Markup:** HTML5
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (CDN) configured in `tw-config.js`, plus `components.css`
- **Typography:** Public Sans & Sora via Google Fonts
- **Logic:** Vanilla JavaScript with `localStorage`
- **Hosting:** [Vercel](https://vercel.com/)

---

## 🔐 Accounts, privacy and known limits

- **Only students can sign up**, on `register.html`. There is one dormitory, so the office account is created by the system. Its email is `manager@ariatedorm.com`. Ask the project owner for the demo password. To change it, replace the `sha256:` hash in `assets/js/auth.js` and in `index.html` with the SHA-256 of `homebase:` plus the new password.
- **Everything is stored in each browser's `localStorage`.** Accounts, rooms and requests are NOT shared between devices or people. This is a prototype.
- **Passwords are scrambled in the browser, which is not real security.** Anyone can open the browser tools and read the stored data. Do not enter real personal details (phone numbers, emergency contacts, photos) until the database phase (PHP + MySQL or Supabase).
- **Text typed by users is never inserted as HTML.** Use `HB_AUTH.safeImg` and `textContent` when showing user text. Do not use `innerHTML` with user text.
- Each student's saved rooms, preferences, best match and comparisons are stored under their own user id (`homebase_savedRooms_<id>` and so on). Deleting an account also removes that student's requests and reviews.
- Student profiles (photo, course, bio, living habits) of ADULT students are visible to other students on Explore Rooms. There is no opt-in yet. Add one before real use. Profiles of students under 18 are never shown.
- Date of birth is set at sign-up and cannot be edited, so age cannot be changed to skip the parent approval step.
- The sign-up rules are in `signup.js`. When there is a database, the server must check them again, because browser checks can be bypassed.
- Check the privacy notice text in `register.html` with the school's Data Protection Officer before real use.

---

## 🚀 Getting Started

No build step is required.

1. **VS Code Live Server**: right-click `index.html` and choose **Open with Live Server**.
2. **Python**: `python -m http.server 3000`, then open <http://localhost:3000>.
3. **Node**: `npx serve .`

## 🌐 Deployment (Vercel)

1. Push to GitHub.
2. Import the repository in the [Vercel Dashboard](https://vercel.com/dashboard).
3. Keep the defaults (**Framework Preset: Other**, **Root Directory: `./`**) and deploy.

---

## ✅ Notes

- [x] Modals on each room (Explore Rooms)
- [x] Reviews
- [ ] A note on compared rooms by the student: why each room fits them
- [ ] Share data across devices (PHP + MySQL or Supabase)