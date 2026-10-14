const router = require('express').Router();
const upload = require('../middlewares/upload');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

// POST /api/upload — un seul fichier, champ "image"
router.post(
  '/',
  auth,
  role('VENDOR', 'ADMIN'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier' });
    res.status(201).json({
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  }
);

// Gestion d'erreur Multer local
router.use((err, req, res, next) => {
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE')
      return res.status(400).json({ error: 'Fichier trop volumineux (max 3 Mo)' });
    return res.status(400).json({ error: err.message });
  }
  if (err) return res.status(400).json({ error: err.message });
  next();
});

module.exports = router;