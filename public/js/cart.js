// public/js/cart.js
const KEY = 'marketplace_cart';

export function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

function save(cart) {
  localStorage.setItem(KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event('cart:update'));
}

export function addToCart(productId, qty = 1) {
  const cart = getCart();
  const item = cart.find(i => i.productId === productId);
  if (item) item.quantity += qty;
  else cart.push({ productId, quantity: qty });
  save(cart);
}

export function setQuantity(productId, qty) {
  let cart = getCart();
  if (qty <= 0) cart = cart.filter(i => i.productId !== productId);
  else {
    const item = cart.find(i => i.productId === productId);
    if (item) item.quantity = qty;
  }
  save(cart);
}

export function removeFromCart(productId) {
  save(getCart().filter(i => i.productId !== productId));
}

export function clearCart() { save([]); }

export function count() {
  return getCart().reduce((s, i) => s + i.quantity, 0);
}