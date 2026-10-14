const router = require('express').Router();
const prisma = require('../prisma');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

const COMMISSION_RATE = parseFloat(process.env.PLATFORM_COMMISSION || '0.15');

// POST /api/orders — créer une commande depuis le panier
// body: { items: [{ productId, quantity }] }
router.post('/', auth, async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items) || items.length === 0)
      return res.status(400).json({ error: 'Panier vide' });

    // 1. Charger les produits
    const ids = items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: ids }, active: true },
      include: { vendor: true },
    });

    if (products.length !== items.length)
      return res.status(400).json({ error: 'Produit introuvable ou inactif' });

    // 2. Vérifier le stock
    for (const item of items) {
      const p = products.find(p => p.id === item.productId);
      if (p.stock < item.quantity)
        return res.status(400).json({ error: `Stock insuffisant : ${p.title}` });
    }

    // 3. Calculer les totaux et commissions
    let total = 0;
    const orderItemsData = items.map(item => {
      const p = products.find(p => p.id === item.productId);
      const lineTotal = p.price * item.quantity;
      const commission = Math.round(lineTotal * COMMISSION_RATE);
      total += lineTotal;
      return {
        productId: p.id,
        vendorId: p.vendorId,
        quantity: item.quantity,
        unitPrice: p.price,
        commission,
      };
    });

    // 4. Transaction : créer la commande + décrémenter le stock
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          clientId: req.user.id,
          total,
          status: 'PENDING',
          items: { create: orderItemsData },
        },
        include: {
          items: {
            include: {
              order: false,
            },
          },
        },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      return created;
    });

    res.status(201).json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/orders — mes commandes (client) ou commandes reçues (vendeur)
router.get('/', auth, async (req, res) => {
  try {
    let orders;

    if (req.user.role === 'VENDOR') {
      // Commandes contenant au moins un produit de ce vendeur
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
      orders = await prisma.order.findMany({
        where: {
          items: { some: { vendorId: vendor.id } },
        },
        include: {
          client: { select: { id: true, name: true, email: true } },
          items: {
            where: { vendorId: vendor.id },
            include: { order: false },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      orders = await prisma.order.findMany({
        where: { clientId: req.user.id },
        include: {
          items: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Charger les produits associés
    const productIds = [...new Set(orders.flatMap(o => o.items.map(i => i.productId)))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, imageUrl: true },
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const enriched = orders.map(o => ({
      ...o,
      items: o.items.map(i => ({ ...i, product: productMap[i.productId] })),
    }));

    res.json(enriched);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// GET /api/orders/:id — détail d'une commande
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        client: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });
    if (!order) return res.status(404).json({ error: 'Commande introuvable' });

    // Sécurité : client propriétaire, vendeur concerné ou admin
    if (req.user.role === 'CLIENT' && order.clientId !== req.user.id)
      return res.status(403).json({ error: 'Non autorisé' });

    if (req.user.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user.id } });
      const hasItem = order.items.some(i => i.vendorId === vendor.id);
      if (!hasItem) return res.status(403).json({ error: 'Non autorisé' });
    }

    const productIds = [...new Set(order.items.map(i => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, imageUrl: true },
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    res.json({
      ...order,
      items: order.items.map(i => ({ ...i, product: productMap[i.productId] })),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// PATCH /api/orders/:id/status — changer le statut (vendeur ou admin)
router.patch('/:id/status', auth, role('VENDOR', 'ADMIN'), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!allowed.includes(status))
      return res.status(400).json({ error: 'Statut invalide' });

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(order);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

module.exports = router;