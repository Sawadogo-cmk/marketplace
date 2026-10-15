const router = require('express').Router();
const stripe = require('../services/stripe');
const prisma = require('../prisma');
const auth = require('../middlewares/auth');
const role = require('../middlewares/role');

// POST /api/connect/onboard — créer un compte Stripe v2 pour le vendeur
router.post('/onboard', auth, role('VENDOR'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
      include: { user: true },
    });

    if (!vendor) return res.status(404).json({ error: 'Vendeur introuvable' });

    let accountId = vendor.stripeAccountId;

    // 1. Créer le compte v2 si pas encore fait
    if (!accountId) {
      const account = await stripe.v2.core.accounts.create({
        contact_email: vendor.user.email,
        identity: {
          country: 'US',
        },
        dashboard: 'express',
        defaults: {
          responsibilities: {
            fees_collector: 'application',
            losses_collector: 'application',
          },
        },
        configuration: {
          merchant: {
            capabilities: {
              card_payments: { requested: true },
            },
          },
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: { requested: true },
              },
            },
          },
        },
        metadata: {
          vendorId: vendor.id,
        },
      });

      accountId = account.id;

      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { stripeAccountId: accountId },
      });
    }

    // 2. Créer le lien d'onboarding (v1 accountLinks compatible)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.CLIENT_URL}/vendor.html?stripe=refresh`,
      return_url: `${process.env.CLIENT_URL}/vendor.html?stripe=ok`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (e) {
    console.error('Onboard error:', e);
    res.status(500).json({ error: e.message });
  }
});

// GET /api/connect/status — état du compte vendeur
router.get('/status', auth, role('VENDOR'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });

    if (!vendor) return res.status(404).json({ error: 'Vendeur introuvable' });

    if (!vendor.stripeAccountId) {
      return res.json({ connected: false, status: vendor.status });
    }

    const account = await stripe.v2.core.accounts.retrieve(vendor.stripeAccountId);

    // Capabilities v2
    const cardPayments =
      account.configuration?.merchant?.capabilities?.card_payments?.status;
    const transfers =
      account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status;

    const active = cardPayments === 'active' && transfers === 'active';
    const detailsSubmitted = !!account.requirements?.summary?.minimum_deadline;

    if (active && vendor.status !== 'ACTIVE') {
      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { status: 'ACTIVE' },
      });
    }

    res.json({
      connected: true,
      status: active ? 'ACTIVE' : vendor.status,
      chargesEnabled: cardPayments === 'active',
      payoutsEnabled: transfers === 'active',
      detailsSubmitted,
      requirements: account.requirements?.entries || [],
    });
  } catch (e) {
    console.error('Status error:', e);
    res.status(500).json({ error: e.message });
  }
});

// POST /api/connect/dashboard — lien vers le dashboard Express du vendeur
router.post('/dashboard', auth, role('VENDOR'), async (req, res) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user.id },
    });
    if (!vendor?.stripeAccountId)
      return res.status(400).json({ error: 'Compte Stripe non créé' });

    const link = await stripe.accounts.createLoginLink(vendor.stripeAccountId);
    res.json({ url: link.url });
  } catch (e) {
    console.error('Dashboard error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;