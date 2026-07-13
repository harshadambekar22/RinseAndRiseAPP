// A tiny client-side "in-progress order" store kept in localStorage so the
// selection survives the sign-in redirect and page refreshes during the flow.
const KEY = 'df_cart'

export function getCart() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { items: {}, address: null, pickupAt: null } }
  catch { return { items: {}, address: null, pickupAt: null } }
}
export function saveCart(cart) { localStorage.setItem(KEY, JSON.stringify(cart)) }
export function clearCart() { localStorage.removeItem(KEY) }

// items is a map of clothTypeId -> { id, name, price, qty }
export function cartCount(cart) {
  return Object.values(cart.items || {}).reduce((n, i) => n + i.qty, 0)
}
export function cartSubtotal(cart) {
  return Object.values(cart.items || {}).reduce((s, i) => s + i.price * i.qty, 0)
}
