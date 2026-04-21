const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/database');
const logger    = require('../utils/logger');

const JWT_SECRET  = process.env.JWT_SECRET || 'change-me-in-prod';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) return res.status(409).json({ error: 'Email already registered' });

    const hash = await bcrypt.hash(password, 12);
    const result = await query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name, email, hash]
    );

    const token = jwt.sign({ id: result.insertId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(201).json({ token, user: { id: result.insertId, name, email } });

  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    if (!users.length) return res.status(401).json({ error: 'Invalid credentials' });

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    logger.info(`User ${user.id} logged in`);

    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) { next(err); }
};

exports.me = async (req, res, next) => {
  try {
    const users = await query(
      'SELECT id, name, email, created_at FROM users WHERE id = ?', [req.user.id]
    );
    if (!users.length) return res.status(404).json({ error: 'User not found' });
    res.json(users[0]);
  } catch (err) { next(err); }
};
