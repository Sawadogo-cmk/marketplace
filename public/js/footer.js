export function renderFooter() {
  const el = document.getElementById('footer');
  if (!el) return;

  el.innerHTML = `
    <footer>
      <div class="footer-inner">
        <div class="footer-col footer-brand">
          <div class="logo">🛍️ <span style="color:#fff">Market</span><span style="color:#a78bfa">place</span></div>
          <p>La marketplace qui connecte vendeurs passionnés et clients curieux. Paiements sécurisés, livraison rapide.</p>
        </div>
        <div class="footer-col">
          <h3>Boutique</h3>
          <a href="/products.html">Tous les produits</a>
          <a href="/products.html?category=mode">Mode</a>
          <a href="/products.html?category=tech">Tech</a>
          <a href="/products.html?category=maison">Maison</a>
        </div>
        <div class="footer-col">
          <h3>Vendeurs</h3>
          <a href="/login.html">Devenir vendeur</a>
          <a href="/vendor.html">Ma boutique</a>
          <a href="/orders.html">Mes ventes</a>
        </div>
        <div class="footer-col">
          <h3>Aide</h3>
          <a href="#">Livraison</a>
          <a href="#">Retours</a>
          <a href="#">Contact</a>
          <a href="#">CGV</a>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} Marketplace — Tous droits réservés</span>
        <span>Paiements sécurisés par Stripe</span>
      </div>
    </footer>
  `;
}