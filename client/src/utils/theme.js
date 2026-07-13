// Derives the app's full color palette (buttons, navbar, icons, wash
// tints...) from the two base hex colors an admin picks in Admin → Features
// → Theme, then writes them as CSS custom properties on the root element.
// Inline styles on the root beat every stylesheet rule (including the
// light/dark `[data-theme]` blocks in index.css), so this applies instantly
// across the whole app without a reload and without needing separate
// light/dark values from the admin.

const clamp = (n, min, max) => Math.min(max, Math.max(min, n))

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return null
  const int = parseInt(m[1], 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

const toHex = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
const rgbToHex = ({ r, g, b }) => `#${toHex(r)}${toHex(g)}${toHex(b)}`

// Mixes toward white (amount > 0) or black (amount < 0) by `amount` (0..1).
function shade({ r, g, b }, amount) {
  const target = amount > 0 ? 255 : 0
  const t = Math.abs(amount)
  return { r: r + (target - r) * t, g: g + (target - g) * t, b: b + (target - b) * t }
}

// Perceived brightness (0..255) — decides whether text on this color should
// be white or near-black so it stays readable.
const luminance = ({ r, g, b }) => 0.299 * r + 0.587 * g + 0.114 * b

function palette(hex, { onDark = '#ffffff', onLight = '#1a0d02' } = {}) {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  return {
    base: rgbToHex(rgb),
    deep: rgbToHex(shade(rgb, -0.18)),
    hover: rgbToHex(shade(rgb, -0.1)),
    wash: `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, .14)`,
    on: luminance(rgb) > 150 ? onLight : onDark,
  }
}

// Applies (or clears, if a color is falsy) the derived palette to the
// document root as inline custom properties.
export function applyThemeColors({ primary, accent } = {}) {
  const root = document.documentElement.style

  const p = primary && palette(primary)
  if (p) {
    root.setProperty('--primary', p.base)
    root.setProperty('--primary-deep', p.deep)
    root.setProperty('--primary-hover', p.hover)
    root.setProperty('--primary-wash', p.wash)
    root.setProperty('--on-primary', p.on)
  } else {
    ;['--primary', '--primary-deep', '--primary-hover', '--primary-wash', '--on-primary']
      .forEach((v) => root.removeProperty(v))
  }

  const a = accent && palette(accent, { onDark: '#ffffff', onLight: '#4a2c05' })
  if (a) {
    root.setProperty('--accent', a.base)
    root.setProperty('--accent-hover', a.hover)
    root.setProperty('--accent-wash', a.wash)
    root.setProperty('--on-accent', a.on)
  } else {
    ;['--accent', '--accent-hover', '--accent-wash', '--on-accent'].forEach((v) => root.removeProperty(v))
  }
}
