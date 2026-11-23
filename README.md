# Homebase 🏠

> A student dormitory discovery and room matching platform for Ariate Dormitory (Naga City, Bicol). It helps students find an affordable, convenient room that fits them, and helps the dorm office manage requests, messages, concerns and reviews.

*This project is still being built. This README describes it as it is today and will keep changing.*

---

## 📋 Features

**Sign-up (`register.html`)**
- A 3-step page: account, about you, then safety and consent. Every field is checked as you type, with plain messages.
- It collects only what a dormitory needs: name, email, password, date of birth, mobile number, school, student ID, course, year level, home province (optional), and an emergency contact. Working professionals and other residents can sign up too, with an occupation and workplace instead of a school.
- **Students under 18** (worked out from the date of birth) give a parent or guardian instead. They get a 6-digit approval code, and a parent or guardian approves the account on **`guardian.html`** by entering the student's email, the code and their own full name (5 wrong tries lock the code, and the student can get a new one on Home). Until then the student can browse, compare and save rooms but cannot request one. In the finished system the code is emailed to the parent.
- Profiles of students under 18 are never shown to other students.

**Landing page (`index.html`)**
- Log in, create an account, or look at every room first with no account (filter by type, availability only, open a room for its details). A short "How matching works" window explains the score.

**For students**
- **Home (`home.html`)**: best match, your preferences, your room request and its progress, saved rooms and recent comparisons.
- **My Matches (`matches.html`)**: tell it what you need and every room with a free bed gets a fit score out of 100. See [How My Matches works](#-how-my-matches-works) below.
- **Explore Rooms (`rooms.html`)**: browse every room, filter by availability, type and floor, open any room to see its complete details, its reviews and who stays there, save it, request it, ask about it, or tick Compare on up to three rooms.
- **Messages (`messages.html`)**: ask the office a question about a room and read the reply. One conversation per student and room, with an unread count in the navbar. Messages are plain text, up to 1000 characters.
- **Room requests**: students ask for a bed, agree to the house rules, and follow the request: pending, approved, then confirmed (paid) and finally ended. A request can also be declined, cancelled by the student, or expire if it is not paid in time. Shared rooms (Double, Triple and Quad) stay open until their last bed is taken.
- **Concerns (`concerns.html`)**: a student who lives here can report a problem (repairs, water and electricity, cleanliness, noise, billing, safety, other), with an optional photo and an urgent flag, and follow it: received, in progress, resolved. Only the student can close it ("it is fixed") or reopen it.
- **Reviews**: after a stay, students rate overall, commute, safety and cleanliness. The office can reply publicly and can hide a comment (never the ratings) with a visible reason.
- **Profile (`profile.html`)**: photo, contact, emergency contact, living habits, password change, and account deletion.
- **Dark mode**: a moon or sun button on every page switches theme. The choice is remembered in the browser.

**For the dorm office (landlord)**
- **Dashboard (`landlord.html`)**: requests to answer, beds free, and approve / decline / mark as paid / end stay. The office sets how many days a student has to pay. The Building amenities (CCTV, water station, curfew, ...) are chosen here.
- **Rooms (`landlord-rooms.html`)**: add, edit, delete and close rooms, with up to 5 photos per room.
- **Messages (`landlord-messages.html`)**: every student conversation, newest first.
- **Concerns (`landlord-concerns.html`)**: concerns sorted urgent first, then oldest first. The office can start work, mark resolved and leave notes.
- **Reviews (`landlord-reviews.html`)**: reply publicly or hide a comment with a reason.

**Other**
- **Clean URLs & Deployment Ready**: `vercel.json` gives URLs without `.html`.
- `assets/js/app-shell.js` and `assets/css/shell.css` are a new sidebar and mobile menu for every signed-in page. They are built but **no page loads them yet**: students still use the top navbar and the office uses `landlord-shell.js`.

---

## 🎯 How My Matches works

- **What you tell it:** monthly budget (type it or use the slider; each dot on the slider is a room with a free bed), room type (Any, Single, Double, Triple, Quad), floor, in-room amenities and building perks, and what matters most.
- **The score:** 100 points shared between budget (40), amenities (30), room type (15) and floor (15). The part you pick as most important counts about 45, and the others share the rest.
  - Budget: full points at 90% of your limit or less, about 60% when close to your limit, none when over it.
  - Labels: **Great fit** is 85 or more with nothing missing, **Good** is 65 or more, **Okay** is 45 to 64, **Weak** is below 45.
  - Rooms with no free bed are never listed. Rooms up to 20% over your budget get their own section ("A little over budget").
- **Results:** the best match is shown big, with what each part earned. The other rooms follow as one ranked list, each with its fit score, short reasons (within budget, missing Wi-Fi, ...), and the buttons Request room, Save, Ask about this room and Compare.
- **On a phone:** once there are results, the form folds into a one-line summary with an **Edit** button.
- **What it saves:** your last preferences, your best match and your saved rooms, per student in the browser (`homebase_preferences_<id>`, `homebase_topMatch_<id>`, `homebase_savedRooms_<id>`). Home reads them.
- The scoring numbers are in `matches.html`, in the script, under `SCORING`.

---

## 📂 Project Structure

```text
Homebase-WEB/
├── assets/
│   ├── css/
│   │   ├── components.css    # Shared buttons, fields, pills and status chips (+ landlord sidebar styles)
│   │   ├── dark.css          # Dark mode colors and fixes
│   │   └── shell.css         # Styles for app-shell.js (not used by a page yet)
│   ├── js/
│   │   ├── supabase.js       # Connects to Supabase (project URL + public key)
│   │   ├── auth.js           # Login, sessions, profiles, per-user storage keys, safe avatar helpers
│   │   ├── signup.js         # Sign-up rules for every field, and creating the account
│   │   ├── dbsync.js         # Copies reviews, messages, concerns and building perks to and from the database
│   │   ├── reservation.js    # Beds, room list, requests, house rules (also synced with the database)
│   │   ├── rooms.js          # Starting (sample) rooms and in-room amenity choices
│   │   ├── building.js       # Building-wide perks (CCTV, water station, curfew, ...)
│   │   ├── compare.js        # Side-by-side room comparison
│   │   ├── reviews.js        # Student reviews, office replies and hidden comments
│   │   ├── messages.js       # Student <-> office messaging about rooms
│   │   ├── concerns.js       # Tenant concerns and how they are followed up
│   │   ├── photos.js         # Room photo upload for the office (Supabase Storage)
│   │   ├── theme.js          # Light / dark toggle button
│   │   ├── landlord-shell.js # The office sidebar and mobile menu
│   │   ├── app-shell.js      # Sidebar for every signed-in page (built, not used yet)
│   │   └── tw-config.js      # The ONE place for the color palette (Tailwind + CSS variables)
│   ├── images/               # Logo and room photos
│   └── README.txt            # Optional hero photo for the landing page
├── index.html                # Landing page, login and room preview
├── register.html             # 3-step sign-up
├── guardian.html             # Parent or guardian approval for students under 18
├── home.html  matches.html  rooms.html  messages.html  concerns.html  profile.html   # Student pages
├── landlord.html  landlord-rooms.html  landlord-messages.html  landlord-concerns.html  landlord-reviews.html   # Office pages
├── vercel.json               # Clean URLs
└── README.md
```

---

## 🛠️ Tech Stack

- **Markup:** HTML5
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (CDN) configured in `tw-config.js`, plus `components.css`, `dark.css` and `shell.css`
- **Typography:** Public Sans & Sora via Google Fonts
- **Logic:** Vanilla JavaScript. Pages read and write `localStorage`, and sync with the database
- **Database, login and photos:** [Supabase](https://supabase.com/) (Auth, Postgres, Storage), loaded with `supabase-js` v2 from a CDN
- **Hosting:** [Vercel](https://vercel.com/)

---

## 🗄️ Supabase

- **Login and sign-up** use Supabase Auth (email and password). A database trigger (`handle_new_user`) creates the student's profile from the sign-up details.
- **Tables the code uses:** `profiles`, `rooms`, `reservations`, `building_perks`, `threads`, `messages`, `concerns`, `concern_updates`, `reviews`.
- **Database functions the code calls:** `approve_guardian`, `new_guardian_code`, `delete_my_account`, `room_occupancy`.
- **Storage:** a bucket named `room-photos` holds the room photos. Photos are shrunk in the browser (1200 px, JPEG), and only their links are saved on the room.
- **How it syncs:** the pages keep reading and writing `localStorage`. On every page load `dbsync.js` (and `reservation.js` for rooms and requests) copies the database into `localStorage`, and when something is saved it sends only what changed.
- **Setup notes:**
  - In Supabase, Authentication settings, switch **Confirm email** off, or sign-up stops at step 3.
  - The office (landlord) account is not created on the sign-up page. The project owner creates it in Supabase and sets its profile role to landlord.
  - `assets/js/supabase.js` holds the project URL and the **public (publishable) key**, which is meant to be in the browser. **Never put the `service_role` / secret key in this repo or in any page.**
  - The public key is only safe if **Row Level Security** is on for every table, with policies so that students see only their own data. The SQL for the tables, policies, trigger and functions lives in the Supabase dashboard and is **not in this repo yet**. Keep a copy (for example a `supabase/schema.sql`).

---

## 🔐 Privacy and known limits

- **Only students and other residents can sign up**, on `register.html`. There is one dormitory, so the office account is created by the project owner. Ask the project owner for its login.
- **Accounts, rooms, requests, messages, concerns, reviews, profiles and building perks live in the Supabase database.** `localStorage` is used as a cache of them, so anyone with access to a browser can read what that browser has loaded.
- **Saved rooms, preferences, best match and comparisons stay in the browser** (per student: `homebase_savedRooms_<id>` and so on). They are not shared across devices yet.
- **Text typed by users is never inserted as HTML.** Use `HB_AUTH.safeImg` and `textContent` when showing user text. Do not use `innerHTML` with user text.
- **Deleting an account** runs `delete_my_account` in the database, which also removes that student's requests and reviews.
- Student profiles (photo, course, bio, living habits) of ADULT students are visible to other students on Explore Rooms. There is no opt-in yet. Add one before real use. Profiles of students under 18 are never shown.
- Date of birth is set at sign-up and cannot be edited, so age cannot be changed to skip the parent approval step.
- The sign-up rules are in `signup.js` and are checked again before the account is saved. Browser checks can be bypassed, so the database must enforce them too.
- The parent approval code is shown to the student in this version. In the finished system it should be emailed to the parent only.
- Payment is not handled on the site. The dormitory office handles payment and the contract.
- Check the privacy notice text in `register.html` with the school's Data Protection Officer before real use.

---

## 🚀 Getting Started

No build step is required.

1. **VS Code Live Server**: right-click `index.html` and choose **Open with Live Server**.
2. **Python**: `python -m http.server 3000`, then open <http://localhost:3000>.
3. **Node**: `npx serve .`

The pages need an internet connection, because Tailwind, the fonts and Supabase load from CDNs.

## 🌐 Deployment (Vercel)

1. Push to GitHub.
2. Import the repository in the [Vercel Dashboard](https://vercel.com/dashboard).
3. Keep the defaults (**Framework Preset: Other**, **Root Directory: `./`**) and deploy.

---

## ✅ Notes

- [x] Modals on each room (Explore Rooms)
- [x] Reviews
- [x] Messages between students and the office
- [x] Concerns for tenants
- [x] Dark mode
- [x] Database, login and room photos with Supabase
- [x] New My Matches page (ranked list, score breakdown, phone summary)
- [ ] Use `app-shell.js` on every signed-in page
- [ ] Add the Supabase SQL (tables, policies, functions) to the repo
- [ ] Email the parent approval code to the parent
- [ ] Share saved rooms, preferences and comparisons across devices
- [ ] A note on compared rooms by the student: why each room fits them