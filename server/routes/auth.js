// server/routes/auth.js
const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const auth = require('../middlewares/auth');

const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: false, // true en prod HTTPS
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

function sign(user) {
  return jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, shopName } = req.body;
    if (!email || !password || !name)
      return res.status(400).json({ error: 'Champs manquants' });

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json({ error: 'Email déjà utilisé' });

    const hash = await bcrypt.hash(password, 10);
    const userRole = role === 'VENDOR' ? 'VENDOR' : 'CLIENT';

    const user = await prisma.user.create({
      data: {
        email,
        password: hash,
        name,
        role: userRole,
        vendor: userRole === 'VENDOR'
          ? { create: { shopName: shopName || name } }
          : undefined,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    res.cookie('token', sign(user), COOKIE_OPTS);
    res.status(201).json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Identifiants invalides' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'Identifiants invalides' });

    res.cookie('token', sign(user), COOKIE_OPTS);
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, name: true, role: true, vendor: true },
  });
  res.json(user);
});

module.exports = router;