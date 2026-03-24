# 🌐 FriendZone – Find Your People

A full-stack friend-finding web app built with Node.js + Express + SQLite.
Swipe, match, and chat — but just for friendship.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18+ ([nodejs.org](https://nodejs.org))
- **npm** (comes with Node.js)

### 2. Install & Run

```bash
# From this directory:
npm install
npm start
```

Then open **http://localhost:3000** in your browser.

---

## 🔑 Demo Accounts

Ten pre-seeded demo users are created on first launch.

| Email | Password |
|-------|----------|
| alex.chen@demo.com | demo123 |
| priya.sharma@demo.com | demo123 |
| rohan.mehta@demo.com | demo123 |
| ananya.patel@demo.com | demo123 |
| dev.kapoor@demo.com | demo123 |

> You can also use the **"Try Demo Account"** button on the login page.

---

## 📁 Project Structure

```
friendzone/
├── server.js          # Express backend (API + static serving)
├── package.json       # Dependencies
├── friendzone.db      # SQLite database (auto-created on first run)
└── public/
    ├── index.html     # SPA shell
    ├── style.css      # All styles (design system + pages)
    └── app.js         # Frontend SPA logic
```

---

## 🗂️ Database Schema

| Table | Key Fields |
|-------|-----------|
| `users` | id, email, password, name, age, gender, bio, interests (JSON), location, avatar_color |
| `likes` | from_user_id, to_user_id |
| `matches` | user1_id, user2_id, created_at |
| `messages` | match_id, sender_id, text, timestamp |
| `blocks` | blocker_id, blocked_id |
| `reports` | reporter_id, reported_id, reason |

---

## 🔌 API Reference

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user session |

### Profile
| Method | Path | Description |
|--------|------|-------------|
| PUT | `/api/profile` | Update profile |

### Discover & Matching
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/discover` | Get users to discover (filters: ageMin, ageMax, location, interests) |
| POST | `/api/likes` | Like a user (returns `{ match: true/false }`) |
| GET | `/api/matches` | Get all matches |

### Chat
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/chats/:matchId/messages` | Get messages (supports `?since=timestamp`) |
| POST | `/api/chats/:matchId/messages` | Send message |

### Safety
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/users/:id/block` | Block a user |
| POST | `/api/users/:id/report` | Report a user |

---

## ✨ Features

- **Authentication** – Email/password signup, session-based login, 7-day persistence
- **Profile System** – Name, age, gender, bio, location, up to 10 interest tags
- **Discover** – Card stack UI, drag-to-swipe or button swipe, age/location/interest filters
- **Matching** – Mutual like creates a match with celebration modal
- **Chat** – Private messaging with 2.5s polling for near-real-time updates
- **Safety** – Block user (removes match), report user, input validation
- **Design** – Mobile-first, responsive, warm coral/navy palette, Syne + Nunito fonts

---

## 🔧 Configuration

| Env Variable | Default | Description |
|-------------|---------|-------------|
| `PORT` | `3000` | Server port |

---

## 📦 Dependencies

| Package | Purpose |
|---------|---------|
| `express` | Web framework |
| `better-sqlite3` | SQLite database |
| `bcryptjs` | Password hashing |
| `express-session` | Session management |
| `uuid` | Unique ID generation |

---

## 🛣️ Roadmap / Future Features

- [ ] Profile photo upload
- [ ] WebSocket real-time chat
- [ ] Push notifications
- [ ] Online/offline status
- [ ] Group chats & events
- [ ] Interest-based communities
- [ ] Admin moderation dashboard
- [ ] Email verification
- [ ] Password reset flow

---

## 📝 License

MIT – build on it freely!
