const router = require('express').Router();
const stripe = require('../services/stripe');
const prisma = require('../prisma');
const auth = require('../middlewares/auth');

router.post('/checkout', auth, async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: 'orderId requis' });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) return res.status(404).json({ error: 'Commande introuvable' });
    if (order.clientId !== req.user.id)
      return res.status(403).json({ error: 'Non autorisé' });
    if (order.status !== 'PENDING')
      return res.status(400).json({ error: 'Commande déjà traitée' });

    const vendorIds = [...new Set(order.items.map(i => i.vendorId))];
    if (vendorIds.length > 1)
      return res.status(400).json({
        error: 'Un seul vendeur par commande. Séparez vos achats.',
      });

    const vendorId = vendorIds[0];
    const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });

    if (!vendor?.stripeAccountId)
      return res.status(400).json({ error: 'Ce vendeur n\'a pas activé ses paiements' });

    if (vendor.status !== 'ACTIVE')
      return res.status(400).json({ error: 'Compte Stripe vendeur non validé' });

    const productIds = order.items.map(i => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, title: true, imageUrl: true },
    });
    const productMap = Object.fromEntries(products.map(p => [p.id, p]));

    const lineItems = order.items.map(i => ({
      price_data: {
        currency: 'eur',
        product_data: {
          name: productMap[i.productId]?.title || 'Produit',
          images: productMap[i.productId]?.imageUrl
            ? [`${process.env.CLIENT_URL}${productMap[i.productId].imageUrl}`]
            : undefined,
        },
        unit_amount: Math.max(50, Math.round(i.unitPrice / 655.957 * 100)),
      },
      quantity: i.quantity,
    }));

    const commissionRate = parseFloat(process.env.PLATFORM_COMMISSION || '0.15');
    const totalCommissionEUR = order.items.reduce(
      (sum, i) => sum + Math.round((i.unitPrice * i.quantity) / 655.957 * 100 * commissionRate),
      0
    );

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${process.env.CLIENT_URL}/success.html?session_id={CHECKOUT_SESSION_ID}&order=${orderId}`,
      cancel_url: `${process.env.CLIENT_URL}/cart.html?cancel=1`,
      metadata: {
        orderId: order.id,
        clientId: req.user.id,
        vendorId,
      },
      payment_intent_data: {
        application_fee_amount: totalCommissionEUR,
        transfer_data: {
          destination: vendor.stripeAccountId,
        },
        metadata: {
          orderId: order.id,
          vendorId,
        },
      },
    });

    await prisma.order.update({
      where: { id: orderId },
      data: { stripePaymentId: session.id },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;