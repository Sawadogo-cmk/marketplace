// public/js/api.js
const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`);
  return data;
}

export const api = {
  get:    (p)       => request(p),
  post:   (p, body) => request(p, { method: 'POST',   body: JSON.stringify(body) }),
  put:    (p, body) => request(p, { method: 'PUT',    body: JSON.stringify(body) }),
  delete: (p)       => request(p, { method: 'DELETE' }),
};

export function formatPrice(centimes) {
  return (centimes / 100).toFixed(2).replace('.', ',') + ' €';
}

export function showAlert(container, msg, type = 'error') {
  container.innerHTML = `<div class="alert alert-${type}">${msg}</div>`;
  if (type === 'success') setTimeout(() => container.innerHTML = '', 3000);
}