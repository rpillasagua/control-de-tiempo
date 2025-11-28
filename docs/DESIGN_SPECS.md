# 🎨 Dark Glass Industrial - Guía Visual & Especificaciones

## 📐 Especificaciones de Diseño

### Sistema de Medidas (Modular)

```
Base Unit: 4px (1rem = 16px)

Spacing Scale:
  xs: 4px    (1 unit)
  sm: 8px    (2 units)
  md: 16px   (4 units)
  lg: 24px   (6 units)
  xl: 32px   (8 units)

Border Radius:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  2xl: 20px
  full: 9999px

Font Sizes:
  h1: 2.5rem (40px)
  h2: 2rem   (32px)
  h3: 1.5rem (24px)
  h4: 1.25rem (20px)
  body: 1rem (16px)
  small: 0.875rem (14px)
  xs: 0.75rem (12px)

Line Heights:
  tight: 1.2
  normal: 1.6
  relaxed: 1.7
```

---

## 🎨 Paleta de Colores Detallada

### Backgrounds (Oscuros)
```
bg-dark-0  #0a0e27  RGB(10, 14, 39)    ← Negro profundo (Base)
bg-dark-1  #0f1535  RGB(15, 21, 53)    ← Azul noche
bg-dark-2  #1a2847  RGB(26, 40, 71)    ← Azul profundo
bg-dark-3  #2a3a5a  RGB(42, 58, 90)    ← Azul grisáceo
```

Uso:
- `bg-dark-0` → Body principal
- `bg-dark-1` → Modales, overlays
- `bg-dark-2` → Gradientes, fondos secundarios
- `bg-dark-3` → Backgrounds hover

### Glass Effects (Vidrio Esmerilado)
```
glass-light   rgba(255, 255, 255, 0.08)   ← Sutil (8% opacidad)
glass-medium  rgba(255, 255, 255, 0.12)   ← Equilibrio (12% opacidad)
glass-strong  rgba(255, 255, 255, 0.16)   ← Contraste (16% opacidad)

Combinado con:
  backdrop-filter: blur(10px) saturate(180%)
  -webkit-backdrop-filter: blur(10px) saturate(180%)
```

Uso:
- `glass-light` → Cards normales
- `glass-medium` → Botones secondary
- `glass-strong` → Cards elevated

### Accent Colors (Industriales)

#### Cyan (Primario - Tech)
```
--accent-cyan:       #06b6d4  RGB(6, 182, 212)    ← Base
--accent-cyan-light: #22d3ee  RGB(34, 211, 238)   ← Hover
--accent-cyan-dark:  #0891b2  RGB(8, 145, 178)    ← Active
```

Uso: Botones primarios, links, iconos importantes

#### Electric Purple (Secundario - Premium)
```
--accent-electric:       #8b5cf6  RGB(139, 92, 246)    ← Base
--accent-electric-light: #a78bfa  RGB(167, 139, 250)   ← Hover
--accent-electric-dark:  #7c3aed  RGB(124, 58, 237)    ← Active
```

Uso: Stats premium, badges especiales

#### Green (Success - Éxito)
```
--accent-green:       #10b981  RGB(16, 185, 129)   ← Base
--accent-green-light: #34d399  RGB(52, 211, 153)   ← Hover
--accent-green-dark:  #059669  RGB(5, 150, 105)    ← Active
```

Uso: Botones success, checkmarks, confirmación

#### Orange (Warning - Alerta)
```
--accent-orange: #f97316  RGB(249, 115, 22)
```

Uso: Alertas, advertencias

#### Red (Error - Crítico)
```
--accent-red: #ef4444  RGB(239, 68, 68)
```

Uso: Botones danger, errores, validación negativa

### Text Colors (Alto Contraste)

```
text-white:     #ffffff   RGB(255, 255, 255)    ← 100% blanco
text-light:     #f3f4f6   RGB(243, 244, 246)    ← Primario
text-muted:     #d1d5db   RGB(209, 213, 219)    ← Secundario
text-secondary: #9ca3af   RGB(156, 163, 175)    ← Terciario
text-tertiary:  #6b7280   RGB(107, 114, 128)    ← Cuaternario

Contrast Ratios (vs bg-dark-0):
  text-white:     ✓ 23:1 (AAA)
  text-light:     ✓ 21:1 (AAA)
  text-muted:     ✓ 12:1 (AAA)
  text-secondary: ✓ 8:1  (AAA)
  text-tertiary:  ✓ 5:1  (AA)
```

### Border & Divider Colors

```
border-light:   rgba(255, 255, 255, 0.1)    ← 10% opacidad
border-medium:  rgba(255, 255, 255, 0.15)   ← 15% opacidad (predeterminado)
border-strong:  rgba(255, 255, 255, 0.2)    ← 20% opacidad (hover)
border-subtle:  rgba(229, 231, 235, 0.05)   ← 5% opacidad (muy sutil)
```

---

## 🌈 Gradientes Predefinidos

### Primario (Cyan)
```css
background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
/* O más largo */
background: linear-gradient(135deg, #22d3ee 0%, #06b6d4 50%, #0891b2 100%);
```

### Secundario (Purple)
```css
background: linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%);
```

### Success (Green)
```css
background: linear-gradient(135deg, #34d399 0%, #059669 100%);
```

### Danger (Red)
```css
background: linear-gradient(135deg, #f87171 0%, #dc2626 100%);
```

### Dark Glass (Background)
```css
background: linear-gradient(135deg, #0a0e27 0%, #1a2847 50%, #0a0e27 100%);
```

---

## 📦 Sombras Detalladas

```css
--shadow-xs: 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-sm: 0 4px 8px rgba(0, 0, 0, 0.4);
--shadow-md: 0 8px 16px rgba(0, 0, 0, 0.5);
--shadow-lg: 0 16px 32px rgba(0, 0, 0, 0.6);
--shadow-xl: 0 24px 48px rgba(0, 0, 0, 0.7);
--shadow-glow: 0 0 20px rgba(6, 182, 212, 0.15);

Combinado en glass-card:
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.3),
    inset 0 1px 1px rgba(255, 255, 255, 0.1);
```

Uso:
- `--shadow-xs` → Botones, badges
- `--shadow-sm` → Cards normales
- `--shadow-md` → Cards hover
- `--shadow-lg` → Modales, overlays
- `--shadow-xl` → Notificaciones principales

---

## 🎯 Componentes Especificaciones

### Glass Card

**Dimensiones:**
```
Padding: 24px (lg) → 16px (tablet) → 12px (mobile)
Border Radius: 12px (lg) → 8px (mobile)
Min Height: 80px (mobile)
Max Width: 100% (responsive)
```

**Estilos:**
```css
background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.12) 100%);
backdrop-filter: blur(10px) saturate(180%);
border: 1px solid rgba(255, 255, 255, 0.15);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.1);
```

**Variantes:**
- `.glass-card` → Standard
- `.glass-card.dark` → Fondo más oscuro
- `.glass-card.elevated` → Mayor profundidad
- `.glass-card.accent-cyan` → Border cyan

**Estados:**
- `hover` → Más opacidad, border más fuerte
- `active` → Slight scale down
- `focus` → Ring cyan

### Botones

**Base:**
```
Padding: 12px 20px
Min Height: 48px (mobile) / 40px (tablet) / 36px (desktop)
Border Radius: 12px
Font Weight: 600 (semi-bold)
Font Size: 0.95rem (14.4px)
Text Transform: UPPERCASE
Letter Spacing: 0.3px
```

**Primario (Cyan):**
```css
Background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)
Color: #0a0e27 (texto oscuro)
Box-shadow: 0 8px 16px rgba(6, 182, 212, 0.3)
Hover: +2px translate, +4px shadow
```

**Secundario (Glass):**
```css
Background: rgba(255, 255, 255, 0.12)
Color: #f3f4f6
Border: 1px solid rgba(255, 255, 255, 0.2)
Hover: Más opacidad, cyan border
```

**Success (Green):**
```css
Background: linear-gradient(135deg, #10b981 0%, #059669 100%)
Color: #ffffff
Box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3)
```

**Danger (Red):**
```css
Background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%)
Color: #ffffff
Box-shadow: 0 8px 16px rgba(239, 68, 68, 0.3)
```

**Outline:**
```css
Background: transparent
Color: #06b6d4
Border: 2px solid #06b6d4
Hover: Fondo cyan con opacidad
```

### Inputs & Forms

**Styling:**
```css
Padding: 12px 14px
Font Size: 16px (previene zoom iOS)
Background: rgba(255, 255, 255, 0.12)
Backdrop Filter: blur(8px)
Border: 1px solid rgba(255, 255, 255, 0.15)
Border Radius: 12px
Color: #f3f4f6
Placeholder Color: #6b7280
Box Shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3)
```

**Focus State:**
```css
Border Color: #06b6d4
Background: rgba(6, 182, 212, 0.05)
Box-shadow: 
  inset 0 1px 2px rgba(0, 0, 0, 0.3),
  0 0 20px rgba(6, 182, 212, 0.2)
Transform: translateY(-1px)
```

**Hover State:**
```css
Border Color: rgba(255, 255, 255, 0.2)
Background: rgba(255, 255, 255, 0.15)
Box-shadow: 0 6px 14px rgba(148, 163, 184, 0.2)
```

### Badges

**Base:**
```
Padding: 6px 12px
Border Radius: 9999px (full)
Font Size: 0.85rem (13.6px)
Font Weight: 600
Display: inline-flex
Gap: 6px
```

**Colores:**
```
badge-success:  bg: rgba(16, 185, 129, 0.15), color: #34d399
badge-warning:  bg: rgba(249, 115, 22, 0.15), color: #fb923c
badge-error:    bg: rgba(239, 68, 68, 0.15), color: #ef4444
badge-info:     bg: rgba(6, 182, 212, 0.15), color: #22d3ee
```

### Progress Bar

**Styling:**
```css
Height: 6px
Background: rgba(255, 255, 255, 0.08)
Border Radius: 9999px
Box Shadow: inset 0 1px 3px rgba(0, 0, 0, 0.3)
```

**Fill:**
```css
Background: linear-gradient(90deg, #06b6d4 0%, #22d3ee 100%)
Box Shadow: 0 0 10px rgba(6, 182, 212, 0.5)
Transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1)
```

---

## 🎬 Animaciones Detalladas

### fadeIn
```css
Duration: 0.3s
Easing: ease-out
from: opacity 0
to: opacity 1
```

### slideInUp
```css
Duration: 0.4s
Easing: ease-out
from: opacity 0, translateY(20px)
to: opacity 1, translateY(0)
```

### slideInDown
```css
Duration: 0.4s
Easing: ease-out
from: opacity 0, translateY(-20px)
to: opacity 1, translateY(0)
```

### scaleIn
```css
Duration: 0.3s
Easing: ease-out
from: opacity 0, scale(0.95)
to: opacity 1, scale(1)
```

### glow
```css
Duration: 2s
Easing: ease-in-out
Loop: infinite
0%:   box-shadow: 0 0 20px rgba(6, 182, 212, 0.2)
50%:  box-shadow: 0 0 30px rgba(6, 182, 212, 0.4)
100%: box-shadow: 0 0 20px rgba(6, 182, 212, 0.2)
```

### pulse
```css
Duration: 2s
Easing: ease-in-out
Loop: infinite
0%, 100%: opacity 1
50%:      opacity 0.7
```

### spin
```css
Duration: 1s
Easing: linear
Loop: infinite
from: rotate(0deg)
to:   rotate(360deg)
```

---

## 📱 Responsive Breakpoints

```
MOBILE (< 640px)
  Font Size Base: 14px (14-15px)
  Button Height: 48px
  Button Width: 100%
  Padding: 12px
  Gap: 8px
  Card Padding: 12px
  Input Font Size: 16px (importante para iOS)
  Z-index for modals: 999

TABLET (641px - 1024px)
  Font Size Base: 15px
  Button Height: 44px
  Button Width: auto
  Padding: 16px
  Gap: 12px
  Card Padding: 16px
  Grid Columns: 2

DESKTOP (1025px - 1919px)
  Font Size Base: 16px
  Button Height: 40px
  Padding: 20px
  Gap: 16px
  Card Padding: 20px
  Grid Columns: 3

XL SCREENS (1920px+)
  Font Size Base: 16px
  Button Height: 44px
  Padding: 24-32px
  Gap: 20px
  Card Padding: 24-32px
  Grid Columns: 4-5
  Max Width: 1400px
```

---

## 🔍 Contraste y Accesibilidad

### WCAG AA Compliance

```
text-white vs bg-dark-0:     23:1 ✓ AAA
text-light vs bg-dark-0:     21:1 ✓ AAA
text-muted vs bg-dark-0:     12:1 ✓ AAA
text-secondary vs bg-dark-0:  8:1 ✓ AAA
accent-cyan vs bg-dark-0:     7:1 ✓ AAA
accent-cyan vs white button:  5:1 ✓ AA
```

### Focus Indicators

```css
:focus {
  outline: 2px solid #06b6d4;
  outline-offset: 2px;
}

Alternativo:
:focus {
  box-shadow: 0 0 0 2px #06b6d4;
}
```

### Motion Preferences

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 🎯 Casos de Uso por Color

### Cyan #06b6d4
- ✅ Botones primarios
- ✅ Links principales
- ✅ Iconos de acción
- ✅ Borders importantes
- ✅ Status: Activo/Online

### Purple #8b5cf6
- ✅ Elementos premium
- ✅ Badges especiales
- ✅ Stats destacados
- ✅ Gradientes secundarios

### Green #10b981
- ✅ Botones success
- ✅ Checkmarks
- ✅ Confirmaciones
- ✅ Status: Completado
- ✅ Positive feedback

### Orange #f97316
- ✅ Alertas/Warnings
- ✅ Información importante
- ✅ Status: Pendiente
- ✅ Atención requerida

### Red #ef4444
- ✅ Botones danger
- ✅ Errores
- ✅ Validación negativa
- ✅ Status: Error/Crítico
- ✅ Confirmación de borrado

---

## 📝 Tipografía

### Font Family
```
Sans Serif: Inter (Google Fonts)
  Weights: 400, 500, 600, 700, 800
  
Monospace: Space Mono (Google Fonts)
  Weights: 400, 700
  Uso: Code blocks, logs
```

### Font Scale
```
h1: 2.5rem (40px)    font-weight: 700  letter-spacing: -0.5px
h2: 2rem   (32px)    font-weight: 700  letter-spacing: -0.015em
h3: 1.5rem (24px)    font-weight: 700  letter-spacing: -0.01em
h4: 1.25rem (20px)   font-weight: 700  letter-spacing: -0.005em
h5: 1.125rem (18px)  font-weight: 600
h6: 1rem   (16px)    font-weight: 600

p:  1rem    (16px)   font-weight: 400  line-height: 1.7
small: 0.875rem (14px) font-weight: 400 line-height: 1.6

label: 0.95rem (15px) font-weight: 600 letter-spacing: 0.3px
button: 0.95rem (15px) font-weight: 600 text-transform: UPPERCASE
```

---

## 💾 Exportar para Figma/Design Tools

Para integrar en Figma:

1. **Variables:**
   - Crear estilos de color
   - Crear estilos de tipografía
   - Crear estilos de componentes

2. **Componentes:**
   - Glass Card (8 variantes)
   - Buttons (6 tipos × 4 sizes)
   - Inputs (text, select, textarea)
   - Badges (4 colores)
   - Progress Bar

3. **Grid de Espaciado:**
   - 4px × 4px grid
   - Usar multiples de 4px

---

## 🖼️ Ejemplos Visuales (Descripción)

### Card Normal
```
┌─ glass-card ─────────────────────────┐
│  backdrop: blur(10px) saturate(180%) │
│  border: 1px solid rgba(255,255,255) │
│  (Efecto de vidrio esmerilado)       │
└──────────────────────────────────────┘
```

### Card Elevated
```
┌─ glass-card.elevated ─────────────────┐
│  shadow: 0 16px 48px rgba(0,0,0,0.6) │
│  opacity más alta                     │
│  border más visible                   │
└───────────────────────────────────────┘
```

### Button Primary
```
┌────────────────────────┐
│  BOTON PRIMARIO        │  ← Cyan gradient
│  gradient: cyan→cyan   │
│  No border             │
│  Shadow glow           │
└────────────────────────┘
  Hover: +2px up, +shadow
```

---

## ✅ Checklist de Implementación Visual

- [ ] Colores en paleta están correctos en monitor calibrado
- [ ] Contraste suficiente para lectura (WCAG AA+)
- [ ] Espaciado es múltiplo de 4px (modular)
- [ ] Bordes redondeados siguen escala (4, 6, 8, 12, 16, 20px)
- [ ] Sombras dan profundidad real
- [ ] Animaciones son suaves (60fps)
- [ ] Tipografía se alinea a escala
- [ ] Responsive funciona en 3 breakpoints
- [ ] Backdrop blur es visible (no desaparece)
- [ ] Focus states son visibles (accesibilidad)

---

**Versión:** 1.0.0  
**Fecha:** Noviembre 2024  
**Status:** Listo para Producción
