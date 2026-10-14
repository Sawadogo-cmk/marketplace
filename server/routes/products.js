const router = require('express').Router();
const prisma = require('../prisma');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

// GET /api/products — catalogue public
router.get('/', async (req, res) => {
  try {
    const { q, category, vendorId } = req.query;
    const where = { active: true };
    if (category) where.category = category;
    if (vendorId) where.vendorId = vendorId;
    if (q) where.title = { contains: q }; // SQLite : case-insensitive par défaut

    const products = await prisma.product.findMany({
      where,
      include: { vendor: { select: { id: true, shopName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(products);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/products/:id — détail
router.get('/:id', async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { vendor: { select: { id: true, shopName: true } } },
    });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json(product);
  } catch (e) {
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// POST /api/products — créer (vendeur seulement)
router.post('/', auth, role('VENDOR'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    if (!vendor) return res.status(400).json({ error: 'Vendeur introuvable' });

    const { title, description, price, stock, imageUrl, category } = req.body;
    if (!title || !description || price == null)
      return res.status(400).json({ error: 'Champs manquants' });

    const product = await prisma.product.create({
      data: {
        vendorId: vendor.id,
        title,
        description,
        price: parseInt(price),
        stock: parseInt(stock || 0),
        imageUrl: imageUrl || null,
        category: category || null,
      },
    });
    res.status(201).json(product);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PUT /api/products/:id — modifier (propriétaire uniquement)
router.put('/:id', auth, role('VENDOR'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.vendorId !== vendor.id)
      return res.status(403).json({ error: 'Non autorise' });

    const { title, description, price, stock, imageUrl, category, active } = req.body;
    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        title: title ?? product.title,
        description: description ?? product.description,
        price: price != null ? parseInt(price) : product.price,
        stock: stock != null ? parseInt(stock) : product.stock,
        imageUrl: imageUrl ?? product.imageUrl,
        category: category ?? product.category,
        active: active ?? product.active,
      },
    });
    res.json(updated);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// DELETE /api/products/:id — supprimer (propriétaire uniquement)
router.delete('/:id', auth, role('VENDOR'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product || product.vendorId !== vendor.id)
      return res.status(403).json({ error: 'Non autorise' });

    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;