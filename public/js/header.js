// public/js/header.js
import { api } from './api.js';
import { count } from './cart.js';

export async function renderHeader(active = '') {
  const el = document.getElementById('header');
  if (!el) return;

  let me = null;
  try { me = await api.get('/auth/me'); } catch {}

  el.innerHTML = `
    <header>
      <a href="/" class="logo">🛍️ Marketplace</a>
      <nav>
        <a href="/products.html">Produits</a>
        ${me?.role === 'VENDOR' ? `<a href="/vendor.html">Ma boutique</a>` : ''}
        <a href="/cart.html">Panier <span class="badge" id="cartCount">${count()}</span></a>
        ${me
          ? `<span class="muted">${me.name}</span>
             <button class="btn" id="logoutBtn">Déconnexion</button>`
          : `<a href="/login.html" class="btn">Connexion</a>`}
      </nav>
    </header>
  `;

  const logout = document.getElementById('logoutBtn');
  if (logout) logout.onclick = async () => {
    await api.post('/auth/logout');
    location.href = '/';
  };

  window.addEventListener('cart:update', () => {
    const c = document.getElementById('cartCount');
    if (c) c.textContent = count();
  });
}