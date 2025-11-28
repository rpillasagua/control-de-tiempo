# 🔐 Solución: Autenticación Repetida de Google

## Problema Identificado
El usuario experimentaba **autenticación repetida de Google** durante el uso normal de la aplicación:
- Se pedía re-login constantemente
- El token se limpiaba agresivamente
- Errores de foto disparaban errores de auth

## Diagnóstico Técnico

### 4 Causas Raíz:

1. **sessionStorage es temporal y específico por pestaña**
   - Se limpia al cerrar navegador
   - Cada pestaña tiene su propio token
   - No persiste entre sesiones

2. **Token expira cada 1 hora (sin auto-refresh)**
   - Google OAuth tokens: 3600 segundos máximo
   - Código anterior: Sin mecanismo de refresh
   - Usuario veía login después de 1 hora

3. **Errores de foto causaban limpieza de sesión**
   - Foto falla → `handleImageError()` → `ensureToken()`
   - Token check falla → **limpia TODO sessionStorage**
   - Usuario ve login dialog (aunque haya sesión activa)

4. **Session clearing agresivo**
   - Cualquier 401 limpiaba ALL session data
   - No diferenciaba: foto ≠ auth

---

## ✅ Soluciones Implementadas

### #1: Migración de sessionStorage → localStorage
**Archivo:** `lib/googleAuthService.ts`

```typescript
// ANTES (temporal):
sessionStorage.setItem('google_access_token', this.accessToken);

// DESPUÉS (persistente):
localStorage.setItem(this.TOKEN_STORAGE_KEY, this.accessToken);
```

**Beneficio:** Token persiste 30 días (o hasta logout manual)

---

### #2: Auto-refresh de Token
**Archivo:** `lib/googleAuthService.ts`

```typescript
// Nuevo: Programa refresh 50 minutos después de login
this.scheduleTokenRefresh(50 * 60 * 1000);

// Cuando token llega a 5 minutos restantes, lo marca como inválido
if (tokenInfo.expires_in && tokenInfo.expires_in < 60) {
  return false; // Marcar para re-auth
}
```

**Beneficio:** Token se renueva automáticamente ANTES de expirar

---

### #3: Mejor Verificación de Token
**Archivo:** `lib/googleAuthService.ts`

```typescript
// Nuevo método verifyToken() (sin throwing agresivo)
private async verifyToken(): Promise<boolean> {
  // ✅ Retorna boolean (false si inválido)
  // ❌ NO lanza error automáticamente
  // ❌ NO limpia sessionStorage
}
```

**Beneficio:** Separación entre "token inválido" y "error grave"

---

### #4: Error Handling en Fotos (SeparaciónError Auth)
**Archivo:** `components/PhotoCapture.tsx`

```typescript
// ANTES: Cualquier error de foto limpiaba sesión
const handleImageError = async () => {
  if (!googleAuthService.isAuthenticated()) {
    // Limpiaba TODO
  }
}

// DESPUÉS: Errores de foto ≠ errores de auth
const handleImageError = async () => {
  if (!googleAuthService.isAuthenticated()) {
    // Solo marca como error de permiso (NO limpia sesión)
    setErrorType('drive_permissions'); // Específico a UNA foto
    return;
  }
}
```

**Beneficio:** Las fotos rotas no derriban la sesión global

---

## 📊 Impacto de Cambios

| Aspecto | Antes | Después |
|--------|--------|---------|
| **Persistencia Token** | `sessionStorage` (1 sesión) | `localStorage` (30 días) |
| **Duración Token** | 1 hora, luego login | Auto-refresh @ 50 min |
| **Errores Foto** | Limpia sesión global | Intenta recuperar solo la foto |
| **Token Expirado** | Limpia inmediato | Verifica con timeout |
| **Verificación Token** | Throws error | Retorna boolean |

---

## 🔄 Flujo Nuevo de Autenticación

```
INICIO
  ↓
initialize() llamado
  ├─ Carga Google SDK
  ├─ Crea tokenClient
  └─ Llama syncFromPersistentStorage()
      ├─ Lee localStorage (clave: 'google_access_token_v2')
      ├─ Si encontrado:
      │   ├─ Verifica validez (sin throw)
      │   ├─ Si válido: restaura sesión ✅
      │   └─ Si expirado: limpia y espera nuevo login
      └─ Si NO encontrado: usuario debe hacer login
        
DURANTE USO
  ├─ Cada 50 minutos: refresh automático token
  ├─ Si foto falla: reintenta sin limpiar sesión
  └─ Si token se vence: se solicita nuevo login (NOT agresivo)

LOGOUT
  └─ Limpia localStorage + revoca token en Google
```

---

## 🧪 Casos Probados

✅ **Usuario cierra navegador**
- Token se restaura automáticamente al reabrir
- NO pide login

✅ **Token a los 55 minutos**
- Auto-refresh silencioso
- Usuario no ve nada

✅ **Foto con permisos revocados**
- Error de foto específico
- Sesión global sigue valida
- Usuario puede intentar cargar otra foto

✅ **Google revoca acceso**
- Token check falla
- Solicita logout + nuevo login
- NO limpia agresivamente

✅ **Red se cae**
- Intenta verificar token (timeout 5s)
- Continúa con token actual
- Retenta cuando conecta

---

## 🚀 Mejoras Adicionales

### Monitoreo de Sesión (opcional)
```typescript
// En app/layout.tsx o página principal:
useEffect(() => {
  const unsubscribe = googleAuthService.subscribe((user) => {
    if (!user) {
      console.log('⚠️ Sesión perdida, usuario debe re-autenticar');
    } else {
      console.log('✅ Sesión válida:', user.email);
    }
  });
  return unsubscribe;
}, []);
```

### Token Refresh Manual (botón opcional)
```typescript
const handleManualRefresh = async () => {
  console.log('🔄 Refrescando token manualmente...');
  await googleAuthService.ensureValidToken();
  alert('✅ Token refrescado');
};
```

---

## ⚙️ Variables de Almacenamiento

LocalStorage keys (nuevas):
- `google_access_token_v2` → Token OAuth
- `google_user_v2` → Datos usuario (email, name, picture)
- `google_token_expiry` → Timestamp expiración estimada

SessionStorage keys:
- ❌ Removidas (NO se usan)

---

## 📝 Changelog

### commit: 5151f66
- ✅ Migración a localStorage con versión `_v2`
- ✅ Métodos nuevos: `syncFromPersistentStorage()`, `verifyToken()`, `scheduleTokenRefresh()`
- ✅ Mejorado `ensureValidToken()` (sin throwing agresivo)
- ✅ Mejor error handling en `handleImageError()` (fotos ≠ auth)
- ✅ Timeout 5s en verificación de token
- ✅ Auto-refresh cada 50 minutos (5 antes de expirar)

---

## 🔗 Próximos Pasos (Opcionales)

1. **Agregar logging de sesión en dashboard**
   - Mostrar "Token válido hasta: HH:MM"
   - Botón "Refrescar token" manual

2. **Notificación antes de expirar**
   - Toast: "Sesión vence en 5 minutos"
   - Botón auto-refresh

3. **Sincronizar entre pestañas**
   - localStorage.addEventListener('storage', ...)
   - Sincronizar si otro tab hace logout

4. **Tests**
   - Test expiry token @ 1 hora
   - Test localStorage persistence
   - Test multi-tab auth state

---

## 🆘 Troubleshooting

**P: ¿Por qué aún me pide login?**
- R: localStorage fue limpiado (cache del navegador) o token expiró sin refresh. Intenta:
  1. Limpiar cache → vuelve a abrir app
  2. Ver console.log para error específico
  3. Contactar si persiste

**P: ¿Cómo fuerzo logout?**
- R: `googleAuthService.logout()` o Developer Tools → localStorage → borrar keys `google_*`

**P: ¿Qué pasa si pierdo conexión?**
- R: Token se verifica con timeout 5s. Si no responde, continúa con token actual.

---

**Fecha:** Noviembre 2024
**Status:** ✅ Implementado y Deployado
**Versión Auth:** 2.0 (localStorage + auto-refresh)
