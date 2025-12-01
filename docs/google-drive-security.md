# Google Drive API - Guía de Seguridad

## Resumen

Tu aplicación usa Google Drive API para almacenar fotos. Las API keys están expuestas en el cliente (navegador), lo cual es **normal para OAuth2**, pero requiere configuración de seguridad adecuada.

---

## ✅ Estado Actual

**Seguridad Implementada:**
- ✅ OAuth2 flow implementado correctamente
- ✅ API key solo se usa para discovery document
- ✅ Todas las operaciones usan token OAuth del usuario
- ✅ No hay acceso directo a Drive sin autenticación

**Riesgo:** BAJO (si sigues las recomendaciones)

---

## 🔒 Configuración Recomendada

### Paso 1: Restringir API Key en Google Cloud Console

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Selecciona tu proyecto
3. Navega a **APIs & Services** → **Credentials**
4. Click en tu API Key

#### Restricciones de Aplicación:

**HTTP referrers (sitios web):**
```
https://tu-app.vercel.app/*
https://*.vercel.app/*  (para preview deployments)
http://localhost:3000/*  (para desarrollo)
```

#### Restricciones de API:

Marcar **"Restrict key"** y seleccionar solo:
- ✅ Google Drive API
- ✅ Google Picker API (si lo usas)

**NO seleccionar:** Ninguna otra API

---

### Paso 2: Configurar OAuth 2.0 Client ID

En **OAuth 2.0 Client IDs**:

**Authorized JavaScript origins:**
```
https://tu-app.vercel.app
https://*.vercel.app
http://localhost:3000
```

**Authorized redirect URIs:**
```
https://tu-app.vercel.app
https://tu-app.vercel.app/oauth/callback (si lo usas)
http://localhost:3000
```

---

### Paso 3: Configurar Quotas

1. En **APIs & Services** → **Google Drive API**
2. Click en **Quotas**
3. Revisar:
   - **Queries per day:** 1,000,000,000 (default, más que suficiente)
   - **Queries per 100 seconds:** 12,000 (ajustar según uso)

**Con restricciones:** Solo tu dominio puede usar la quota

---

## 📊 Uso Estimado

### Cálculo de Quota:

```
Usuarios activos: 10
Fotos por usuario/día: 20
Operaciones por foto: 3 (upload + permissions + metadata)

Total diario: 10 × 20 × 3 = 600 requests/día
Total mensual: 600 × 30 = 18,000 requests/mes
```

**Conclusión:** Muy por debajo del límite (1B requests/día)

---

## ⚠️ Qué NO Hacer

❌ **NO** uses Service Account keys en el cliente  
❌ **NO** expongas credenciales en código  
❌ **NO** dejes la API key sin restricciones  
❌ **NO** compartas la API key públicamente (GitHub público)

---

## ✅ Qué SÍ Hacer

✅ **SÍ** usa OAuth2 (ya lo haces)  
✅ **SÍ** restringe por dominio  
✅ **SÍ** restringe por API  
✅ **SÍ** monitorea el uso en Cloud Console  
✅ **SÍ** rota las keys si sospechas compromiso

---

## 🔍 Monitoreo

### Ver uso de API:

1. Google Cloud Console → **APIs & Services** → **Dashboard**
2. Click en **Google Drive API**
3. Ver gráficas de:
   - Requests por día
   - Errores
   - Latencia

### Alertas recomendadas:

Configurar en **Monitoring** → **Alerting**:
- Alerta si requests \u003e 10,000/día (10x tu uso normal)
- Alerta si tasa de error \u003e 5%

---

## 🆘 En Caso de Abuso

Si detectas uso sospechoso:

1. **Inmediatamente:** Deshabilita la API key en Cloud Console
2. Genera nueva API key con restricciones más estrictas
3. Actualiza `.env.local` con nueva key
4. Redeploy a Vercel
5. Revisa logs para identificar origen del abuso

---

## 📝 Checklist de Seguridad

- [ ] API Key restringida por dominio
- [ ] API Key restringida solo a Google Drive API
- [ ] OAuth Client ID configurado con dominios autorizados
- [ ] Monitoreo de quota configurado
- [ ] Alertas de uso configuradas
- [ ] Keys en variables de entorno (no en código)
- [ ] `.env.local` en `.gitignore`

---

## 🔗 Referencias

- [Google Drive API Security Best Practices](https://developers.google.com/drive/api/guides/security)
- [API Key Best Practices](https://cloud.google.com/docs/authentication/api-keys)
- [OAuth 2.0 for Client-side Web Applications](https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow)

---

**Última actualización:** 2025-12-01  
**Revisión recomendada:** Trimestral
