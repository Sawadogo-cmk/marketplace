const stripe = require('../services/stripe');
const prisma = require('../prisma');

module.exports = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log('→ Stripe webhook:', event.type);

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'PAID' },
        });
        console.log(`✓ Commande ${orderId} → PAID`);
      }
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CANCELLED' },
        });
      }
    }
      if (event.type === 'account.updated') {
      const account = event.data.object;
      const vendorId = account.metadata?.vendorId;

      if (vendorId) {
        const active = account.charges_enabled && account.payouts_enabled;
        await prisma.vendor.update({
          where: { id: vendorId },
          data: { status: active ? 'ACTIVE' : 'PENDING' },
        });
        console.log(`✓ Vendeur ${vendorId} → ${active ? 'ACTIVE' : 'PENDING'}`);
      }
    }
} catch (e) {
    console.error('Webhook handler error:', e);
  }

  res.json({ received: true });
};