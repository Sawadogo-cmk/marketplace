const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

const VENDEURS = [
  {
    email: 'boutique.mode@test.com',
    name: 'Awa Diallo',
    shopName: 'Awa Fashion',
    password: 'password123',
  },
  {
    email: 'tech.store@test.com',
    name: 'Moussa Traoré',
    shopName: 'Tech Sahel',
    password: 'password123',
  },
  {
    email: 'maison.co@test.com',
    name: 'Fatou Kaboré',
    shopName: 'Maison & Déco',
    password: 'password123',
  },
  {
    email: 'sport.africa@test.com',
    name: 'Ibrahim Ouédraogo',
    shopName: 'Sport Africa',
    password: 'password123',
  },
  {
    email: 'beaute.nature@test.com',
    name: 'Mariam Sawadogo',
    shopName: 'Beauté Naturelle',
    password: 'password123',
  },
];

// [vendeurIndex, titre, description, prix (FCFA), stock, catégorie, imageSeed]
const PRODUITS = [
  // ===== MODE (Awa Fashion) =====
  [0, 'Robe wax élégante', 'Robe en tissu wax authentique, coupe cintrée, longueur genou. Parfaite pour les cérémonies et événements.', 18500, 8, 'mode', 'robe-wax'],
  [0, 'Chemise en bogolan', 'Chemise homme en bogolan traditionnel malien. Coton 100%, coupe droite.', 12000, 15, 'mode', 'chemise-bogolan'],
  [0, 'Boubou brodé homme', 'Boubou grand modèle en basin riche avec broderies dorées faites main.', 45000, 5, 'mode', 'boubou-brode'],
  [0, 'Ensemble pagne femme', 'Ensemble 2 pièces pagne africain moderne, top + jupe longue.', 22000, 10, 'mode', 'ensemble-pagne'],
  [0, 'Sac à main cuir', 'Sac à main artisanal en cuir véritable, bandoulière réglable.', 35000, 6, 'mode', 'sac-cuir'],
  [0, 'Sandales en cuir tressé', 'Sandales artisanales en cuir tressé à la main, confortables.', 15000, 12, 'mode', 'sandales-cuir'],
  [0, 'Foulard en soie', 'Foulard 100% soie naturelle, imprimé géométrique.', 8000, 20, 'mode', 'foulard-soie'],

  // ===== TECH (Tech Sahel) =====
  [1, 'Smartphone Android 128Go', 'Smartphone 6,5 pouces, 4Go RAM, 128Go stockage, double SIM.', 145000, 7, 'tech', 'smartphone-1'],
  [1, 'Écouteurs Bluetooth sans fil', 'Écouteurs sans fil avec boîtier de charge, autonomie 24h.', 25000, 25, 'tech', 'ecouteurs-bt'],
  [1, 'Chargeur solaire portable', 'Batterie externe 20000mAh avec panneau solaire, USB double.', 18000, 15, 'tech', 'chargeur-solaire'],
  [1, 'Montre connectée', 'Montre intelligente avec suivi cardiaque, notifications, étanche.', 42000, 10, 'tech', 'montre-connectee'],
  [1, 'Enceinte Bluetooth', 'Enceinte portable waterproof, son stéréo puissant.', 22000, 18, 'tech', 'enceinte-bt'],
  [1, 'Clavier mécanique', 'Clavier mécanique RGB, switch bleu, filaire USB.', 38000, 9, 'tech', 'clavier-meca'],
  [1, 'Souris ergonomique', 'Souris sans fil ergonomique, 1600 DPI, silencieuse.', 12000, 22, 'tech', 'souris-ergo'],
  [1, 'Webcam HD 1080p', 'Webcam Full HD avec micro intégré, USB plug-and-play.', 28000, 11, 'tech', 'webcam-hd'],

  // ===== MAISON (Maison & Déco) =====
  [2, 'Vase terre cuite', 'Vase artisanal en terre cuite, hauteur 30cm, motif traditionnel.', 9500, 14, 'maison', 'vase-terre'],
  [2, 'Panier tressé', 'Grand panier tressé à la main en fibres naturelles.', 7000, 20, 'maison', 'panier-tresse'],
  [2, 'Set 4 coussins', 'Lot de 4 coussins décoratifs, housses réversibles 40x40cm.', 15000, 12, 'maison', 'coussin-set'],
  [2, 'Lampe de chevet rotin', 'Lampe de chevet en rotin tressé, douille E27.', 22000, 8, 'maison', 'lampe-rotin'],
  [2, 'Tapis berbère', 'Tapis berbère fait main, laine naturelle, 150x200cm.', 65000, 4, 'maison', 'tapis-berbere'],
  [2, 'Miroir doré soleil', 'Miroir rond style soleil, cadre métal doré, diamètre 50cm.', 18000, 10, 'maison', 'miroir-soleil'],

  // ===== SPORT (Sport Africa) =====
  [3, 'Ballon de football officiel', 'Ballon taille 5, cuir synthétique, homologué compétition.', 12000, 30, 'sport', 'ballon-foot'],
  [3, 'Tapis de yoga antidérapant', 'Tapis 183x61cm, épaisseur 6mm, inclut sangle de transport.', 15000, 20, 'sport', 'tapis-yoga'],
  [3, 'Haltères 2x5kg', 'Paire d\'haltères 5kg chacune, revêtement néoprène.', 18000, 12, 'sport', 'halteres-5kg'],
  [3, 'Corde à sauter pro', 'Corde à sauter vitesse, roulements à billes, longueur ajustable.', 6500, 25, 'sport', 'corde-sauter'],
  [3, 'Gants de boxe', 'Gants de boxe 12oz cuir PU, rembourrage mousse haute densité.', 22000, 10, 'sport', 'gants-boxe'],
  [3, 'Bouteille sport isotherme', 'Bouteille inox 750ml, garde froid 24h / chaud 12h.', 9000, 28, 'sport', 'bouteille-sport'],

  // ===== BEAUTÉ (Beauté Naturelle) =====
  [4, 'Beurre de karité pur', 'Beurre de karité brut 250g, non raffiné, bio du Burkina.', 5000, 40, 'beaute', 'karite-pur'],
  [4, 'Savon noir africain', 'Savon noir traditionnel 200g, purifiant et exfoliant.', 3500, 50, 'beaute', 'savon-noir'],
  [4, 'Huile de coco vierge', 'Huile de coco vierge bio 500ml, pressée à froid.', 7500, 30, 'beaute', 'huile-coco'],
  [4, 'Masque argile verte', 'Masque visage à l\'argile verte 100g, purifiant.', 6500, 25, 'beaute', 'masque-argile'],
  [4, 'Coffret soins visage', 'Coffret complet : nettoyant, sérum, crème hydratante.', 25000, 10, 'beaute', 'coffret-soin'],
  [4, 'Baume à lèvres karité', 'Baume à lèvres hydratant au karité, parfum vanille.', 2500, 60, 'beaute', 'baume-levres'],
];

async function main() {
  console.log('🧹 Nettoyage des données existantes…');
  await prisma.transfer.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test.com' } } });

  console.log('👥 Création des vendeurs…');
  const vendors = [];
  for (const v of VENDEURS) {
    const hash = await bcrypt.hash(v.password, 10);
    const user = await prisma.user.create({
      data: {
        email: v.email,
        password: hash,
        name: v.name,
        role: 'VENDOR',
        vendor: {
          create: { shopName: v.shopName, status: 'PENDING' },
        },
      },
      include: { vendor: true },
    });
    vendors.push(user.vendor);
    console.log(`  ✓ ${v.shopName}`);
  }

  console.log('📦 Création des produits…');
  let count = 0;
  for (const [vIdx, title, description, price, stock, category, seed] of PRODUITS) {
    await prisma.product.create({
      data: {
        vendorId: vendors[vIdx].id,
        title,
        description,
        price,
        stock,
        category,
        imageUrl: `https://picsum.photos/seed/${seed}/600/600`,
        active: true,
      },
    });
    count++;
  }
  console.log(`  ✓ ${count} produits créés`);

  console.log('\n✅ Seed terminé !');
  console.log('\n👤 Comptes vendeurs créés :');
  VENDEURS.forEach(v => console.log(`  ${v.email} / ${v.password}`));
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());