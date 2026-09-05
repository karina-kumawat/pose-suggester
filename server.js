const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');
const authRoutes = require('./auth');

const app = express();
const JWT_SECRET = 'poseSecretKey123';

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Pose Suggester backend is running!');
});

app.get('/api/settings', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DISTINCT setting FROM poses ORDER BY setting');
    res.json(rows.map(r => r.setting));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not fetch settings' });
  }
});

app.get('/api/poses', async (req, res) => {
  try {
    const { setting, people_count } = req.query;
    let query = 'SELECT * FROM poses WHERE 1=1';
    const params = [];

    if (setting) {
      query += ' AND setting = ?';
      params.push(setting);
    }
    if (people_count) {
      query += ' AND people_count = ?';
      params.push(people_count);
    }

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong fetching poses' });
  }
});

// Middleware: token check karta hai favorites ke routes ke liye
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'No token provided' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Favorite add/remove karo
app.post('/api/favorites/:poseId', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'INSERT IGNORE INTO favorites (user_id, pose_id) VALUES (?, ?)',
      [req.userId, req.params.poseId]
    );
    res.json({ message: 'Added to favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Could not add favorite' });
  }
});

app.delete('/api/favorites/:poseId', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM favorites WHERE user_id = ? AND pose_id = ?',
      [req.userId, req.params.poseId]
    );
    res.json({ message: 'Removed from favorites' });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove favorite' });
  }
});

// Logged-in user ke saare favorites
app.get('/api/favorites', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.* FROM poses p
       JOIN favorites f ON f.pose_id = p.id
       WHERE f.user_id = ?`,
      [req.userId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch favorites' });
  }
});

app.listen(5001, () => {
  console.log('Server running on http://localhost:5001');
});