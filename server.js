const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const db = new Database(path.join(__dirname, 'friendzone.db'));

// ─── DATABASE INIT ──────────────────────────────────────────────────────────
db.exec(`
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    password      TEXT NOT NULL,
    name          TEXT,
    age           INTEGER,
    gender        TEXT,
    bio           TEXT,
    interests     TEXT DEFAULT '[]',
    location      TEXT,
    avatar_color  TEXT DEFAULT '#FF6542',
    profile_complete INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS likes (
    id            TEXT PRIMARY KEY,
    from_user_id  TEXT NOT NULL,
    to_user_id    TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_user_id, to_user_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id            TEXT PRIMARY KEY,
    user1_id      TEXT NOT NULL,
    user2_id      TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS messages (
    id            TEXT PRIMARY KEY,
    match_id      TEXT NOT NULL,
    sender_id     TEXT NOT NULL,
    text          TEXT NOT NULL,
    timestamp     DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS blocks (
    id            TEXT PRIMARY KEY,
    blocker_id    TEXT NOT NULL,
    blocked_id    TEXT NOT NULL,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(blocker_id, blocked_id)
  );

  CREATE TABLE IF NOT EXISTS reports (
    id            TEXT PRIMARY KEY,
    reporter_id   TEXT NOT NULL,
    reported_id   TEXT NOT NULL,
    reason        TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── MIDDLEWARE ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'fz-super-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 }
}));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  next();
};

// ─── AUTH ROUTES ─────────────────────────────────────────────────────────────
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) return res.status(400).json({ error: 'Email is already registered' });

    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    const colors = ['#FF6542', '#FFD166', '#06D6A0', '#118AB2', '#9B5DE5', '#F15BB5', '#FF9F1C', '#2EC4B6'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    db.prepare('INSERT INTO users (id, email, password, avatar_color) VALUES (?, ?, ?, ?)')
      .run(id, email.toLowerCase().trim(), hashed, color);

    req.session.userId = id;
    res.json({ success: true, userId: id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Signup failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email?.toLowerCase().trim());
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    req.session.userId = user.id;
    res.json({ success: true, profileComplete: !!user.profile_complete });
  } catch (e) {
    res.status(500).json({ error: 'Login failed' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, email, name, age, gender, bio, interests, location, avatar_color, profile_complete FROM users WHERE id = ?'
  ).get(req.session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  user.interests = safeParseJSON(user.interests, []);
  res.json(user);
});

// ─── PROFILE ROUTES ───────────────────────────────────────────────────────────
app.put('/api/profile', requireAuth, (req, res) => {
  try {
    const { name, age, gender, bio, interests, location } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name is required' });
    if (age && (age < 13 || age > 100)) return res.status(400).json({ error: 'Invalid age' });

    const interestsJson = JSON.stringify(Array.isArray(interests) ? interests.slice(0, 15) : []);
    db.prepare('UPDATE users SET name=?, age=?, gender=?, bio=?, interests=?, location=?, profile_complete=1 WHERE id=?')
      .run(name.trim(), age ? parseInt(age) : null, gender, bio?.trim(), interestsJson, location?.trim(), req.session.userId);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Profile update failed' });
  }
});

// ─── DISCOVER ROUTE ───────────────────────────────────────────────────────────
app.get('/api/discover', requireAuth, (req, res) => {
  try {
    const { ageMin, ageMax, location, interests } = req.query;
    const userId = req.session.userId;

    const blockedIds = db.prepare('SELECT blocked_id FROM blocks WHERE blocker_id = ?').all(userId).map(b => b.blocked_id);
    const blockedByIds = db.prepare('SELECT blocker_id FROM blocks WHERE blocked_id = ?').all(userId).map(b => b.blocker_id);
    const likedIds = db.prepare('SELECT to_user_id FROM likes WHERE from_user_id = ?').all(userId).map(l => l.to_user_id);
    const matchedIds = db.prepare('SELECT user1_id, user2_id FROM matches WHERE user1_id = ? OR user2_id = ?')
      .all(userId, userId).map(m => m.user1_id === userId ? m.user2_id : m.user1_id);

    const excludeIds = [...new Set([userId, ...blockedIds, ...blockedByIds, ...likedIds, ...matchedIds])];

    let query = 'SELECT id, name, age, gender, bio, interests, location, avatar_color FROM users WHERE profile_complete = 1';
    const params = [];

    if (excludeIds.length > 0) {
      query += ` AND id NOT IN (${excludeIds.map(() => '?').join(',')})`;
      params.push(...excludeIds);
    }
    if (ageMin) { query += ' AND age >= ?'; params.push(parseInt(ageMin)); }
    if (ageMax) { query += ' AND age <= ?'; params.push(parseInt(ageMax)); }
    if (location) { query += ' AND location LIKE ?'; params.push(`%${location}%`); }

    query += ' ORDER BY RANDOM() LIMIT 30';

    let users = db.prepare(query).all(...params).map(u => ({
      ...u, interests: safeParseJSON(u.interests, [])
    }));

    if (interests) {
      const filterList = interests.split(',').map(i => i.trim().toLowerCase()).filter(Boolean);
      if (filterList.length > 0) {
        users = users.filter(u => u.interests.some(i => filterList.includes(i.toLowerCase())));
      }
    }

    res.json(users);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Discover failed' });
  }
});

// ─── LIKES & MATCHES ──────────────────────────────────────────────────────────
app.post('/api/likes', requireAuth, (req, res) => {
  try {
    const { toUserId } = req.body;
    const fromUserId = req.session.userId;

    if (fromUserId === toUserId) return res.status(400).json({ error: 'Cannot like yourself' });

    const targetUser = db.prepare('SELECT id, name FROM users WHERE id = ?').get(toUserId);
    if (!targetUser) return res.status(404).json({ error: 'User not found' });

    db.prepare('INSERT OR IGNORE INTO likes (id, from_user_id, to_user_id) VALUES (?, ?, ?)').run(uuidv4(), fromUserId, toUserId);

    const mutualLike = db.prepare('SELECT id FROM likes WHERE from_user_id = ? AND to_user_id = ?').get(toUserId, fromUserId);

    if (mutualLike) {
      const existing = db.prepare(
        'SELECT id FROM matches WHERE (user1_id=? AND user2_id=?) OR (user1_id=? AND user2_id=?)'
      ).get(fromUserId, toUserId, toUserId, fromUserId);

      if (!existing) {
        const matchId = uuidv4();
        db.prepare('INSERT INTO matches (id, user1_id, user2_id) VALUES (?, ?, ?)').run(matchId, fromUserId, toUserId);
        return res.json({ match: true, matchId, matchedUser: targetUser });
      }
    }

    res.json({ match: false });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Like failed' });
  }
});

app.get('/api/matches', requireAuth, (req, res) => {
  try {
    const userId = req.session.userId;
    const matches = db.prepare(`
      SELECT
        m.id AS match_id,
        m.created_at,
        u.id, u.name, u.bio, u.interests, u.location, u.avatar_color, u.age,
        (SELECT text FROM messages WHERE match_id = m.id ORDER BY timestamp DESC LIMIT 1) AS last_message,
        (SELECT timestamp FROM messages WHERE match_id = m.id ORDER BY timestamp DESC LIMIT 1) AS last_message_time
      FROM matches m
      JOIN users u ON u.id = CASE WHEN m.user1_id = ? THEN m.user2_id ELSE m.user1_id END
      WHERE m.user1_id = ? OR m.user2_id = ?
      ORDER BY COALESCE(last_message_time, m.created_at) DESC
    `).all(userId, userId, userId);

    const result = matches.map(m => ({
      matchId: m.match_id,
      matchedAt: m.created_at,
      lastMessage: m.last_message,
      lastMessageTime: m.last_message_time,
      user: {
        id: m.id, name: m.name, bio: m.bio,
        interests: safeParseJSON(m.interests, []),
        location: m.location, avatarColor: m.avatar_color, age: m.age
      }
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: 'Failed to get matches' });
  }
});

// ─── CHAT ROUTES ─────────────────────────────────────────────────────────────
app.get('/api/chats/:matchId/messages', requireAuth, (req, res) => {
  try {
    const { matchId } = req.params;
    const userId = req.session.userId;
    const since = req.query.since;

    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)').get(matchId, userId, userId);
    if (!match) return res.status(403).json({ error: 'Access denied' });

    let query = `
      SELECT m.id, m.text, m.timestamp, m.sender_id, u.name AS sender_name
      FROM messages m JOIN users u ON u.id = m.sender_id
      WHERE m.match_id = ?`;
    const params = [matchId];

    if (since) { query += ' AND m.timestamp > ?'; params.push(since); }
    query += ' ORDER BY m.timestamp ASC LIMIT 100';

    res.json(db.prepare(query).all(...params));
  } catch (e) {
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

app.post('/api/chats/:matchId/messages', requireAuth, (req, res) => {
  try {
    const { matchId } = req.params;
    const { text } = req.body;
    const userId = req.session.userId;

    if (!text?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });
    if (text.length > 1000) return res.status(400).json({ error: 'Message too long (max 1000 chars)' });

    const match = db.prepare('SELECT * FROM matches WHERE id = ? AND (user1_id = ? OR user2_id = ?)').get(matchId, userId, userId);
    if (!match) return res.status(403).json({ error: 'Access denied' });

    const id = uuidv4();
    db.prepare('INSERT INTO messages (id, match_id, sender_id, text) VALUES (?, ?, ?, ?)').run(id, matchId, userId, text.trim());

    const message = db.prepare(`
      SELECT m.id, m.text, m.timestamp, m.sender_id, u.name AS sender_name
      FROM messages m JOIN users u ON u.id = m.sender_id WHERE m.id = ?
    `).get(id);

    res.json(message);
  } catch (e) {
    res.status(500).json({ error: 'Send failed' });
  }
});

// ─── BLOCK & REPORT ───────────────────────────────────────────────────────────
app.post('/api/users/:id/block', requireAuth, (req, res) => {
  try {
    const blockerId = req.session.userId;
    const blockedId = req.params.id;
    if (blockerId === blockedId) return res.status(400).json({ error: 'Cannot block yourself' });

    db.prepare('INSERT OR IGNORE INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)').run(uuidv4(), blockerId, blockedId);
    db.prepare('DELETE FROM matches WHERE (user1_id=? AND user2_id=?) OR (user1_id=? AND user2_id=?)').run(blockerId, blockedId, blockedId, blockerId);

    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Block failed' });
  }
});

app.post('/api/users/:id/report', requireAuth, (req, res) => {
  try {
    const { reason } = req.body;
    db.prepare('INSERT INTO reports (id, reporter_id, reported_id, reason) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), req.session.userId, req.params.id, reason || '');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Report failed' });
  }
});

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function safeParseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ─── SEED DEMO USERS ──────────────────────────────────────────────────────────
function seedDemoUsers() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (count > 0) return;

  const demos = [
    { name: 'Alex Chen', age: 25, gender: 'Non-binary', bio: 'Coffee enthusiast and weekend hiker. Always up for a spontaneous road trip! 🏔️ Let\'s explore hidden trails and find the best chai spots.', interests: ['hiking', 'coffee', 'travel', 'photography', 'yoga'], location: 'Delhi', color: '#FF6542' },
    { name: 'Priya Sharma', age: 23, gender: 'Female', bio: 'Bookworm by day, gamer by night 🎮 Looking for friends to explore Delhi\'s amazing food scene and maybe join my D&D campaign!', interests: ['gaming', 'reading', 'food', 'anime', 'board games'], location: 'Delhi', color: '#9B5DE5' },
    { name: 'Rohan Mehta', age: 27, gender: 'Male', bio: 'Fitness junkie and amateur chef. Let\'s go for a 5am run then make brunch together! 🏃‍♂️ Also obsessed with trying new protein recipes.', interests: ['gym', 'cooking', 'running', 'nutrition', 'cycling'], location: 'Delhi', color: '#06D6A0' },
    { name: 'Ananya Patel', age: 24, gender: 'Female', bio: 'Musician 🎵 and gallery hopper. Looking for people who appreciate a good jazz night or spontaneous art walks through Lodhi Colony.', interests: ['music', 'art', 'dancing', 'movies', 'poetry'], location: 'Delhi', color: '#F15BB5' },
    { name: 'Dev Kapoor', age: 26, gender: 'Male', bio: 'Software dev by day, board game enthusiast by night 🎲 Always looking for teammates for hackathons or just a chill evening of Catan.', interests: ['coding', 'gaming', 'tech', 'board games', 'sci-fi'], location: 'Delhi', color: '#118AB2' },
    { name: 'Meera Joshi', age: 22, gender: 'Female', bio: 'Certified yoga instructor and sustainability advocate 🌿 Let\'s meditate at sunrise, clean a park, then find the best vegan brunch in town!', interests: ['yoga', 'nature', 'sustainability', 'wellness', 'meditation'], location: 'Delhi', color: '#FFD166' },
    { name: 'Arjun Singh', age: 28, gender: 'Male', bio: 'Freelance photographer and night owl ⭐ Always chasing that perfect golden hour. Let\'s shoot some portraits or do a midnight street photography walk!', interests: ['photography', 'travel', 'art', 'coffee', 'film'], location: 'Delhi', color: '#FF9F1C' },
    { name: 'Kavya Reddy', age: 25, gender: 'Female', bio: 'Startup founder by day, wannabe stand-up comedian by weekend 😂 Looking for someone to bounce ideas off and share startup war stories over chai.', interests: ['entrepreneurship', 'comedy', 'networking', 'reading', 'podcasts'], location: 'Bangalore', color: '#2EC4B6' },
    { name: 'Vikram Nair', age: 29, gender: 'Male', bio: 'Architect with a love for urban exploration 🏛️ Let\'s visit old Delhi\'s hidden havelis, sketch street scenes, and argue about brutalism vs Art Deco.', interests: ['architecture', 'art', 'travel', 'history', 'sketching'], location: 'Delhi', color: '#9B5DE5' },
    { name: 'Sana Khan', age: 24, gender: 'Female', bio: 'Aspiring chef and food blogger 🍜 I\'m on a mission to eat at every interesting restaurant in Delhi. Join me? I promise great food recommendations!', interests: ['cooking', 'food', 'travel', 'photography', 'writing'], location: 'Delhi', color: '#FF6542' },
  ];

  const hashed = bcrypt.hashSync('demo123', 10);
  for (const u of demos) {
    const id = uuidv4();
    db.prepare(`INSERT INTO users (id, email, password, name, age, gender, bio, interests, location, avatar_color, profile_complete)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`)
      .run(id, `${u.name.toLowerCase().replace(/\s/g, '.')}@demo.com`, hashed, u.name, u.age, u.gender, u.bio, JSON.stringify(u.interests), u.location, u.color);
  }
  console.log('✅ Demo users seeded');
}

seedDemoUsers();

// ─── START SERVER ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🚀 FriendZone is running at http://localhost:${PORT}`);
  console.log(`   Demo login: alex.chen@demo.com / demo123\n`);
});
