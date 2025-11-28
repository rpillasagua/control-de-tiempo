# Sistema de Análisis de Descongelado

**Sistema de Gestión de Calidad** - Aplicación web moderna para análisis de calidad del proceso de descongelado de productos marinos con gestión avanzada de fotos y análisis múltiples.

## ✨ Características Principales

Este sistema especializado ofrece:

- 🦐 **Tipos de Producto** - Entero, Cola, Valor Agregado, Control de Pesos Brutos
- 📸 **Sistema de Fotos Avanzado** - Captura con retry automático y gestión de uploads fallidos
- 💾 **Google Drive** - Almacenamiento organizado de fotos por código/lote con URLs compartibles
- 📊 **Análisis Múltiples** - Múltiples análisis (sub-análisis) para el mismo lote/código/talla
- 🎨 **Colores de Analista** - Identificación visual por analista (máx. 4 por turno)
- ⏰ **Turnos Automáticos** - Día (7:10 AM - 7:10 PM) y Noche (7:10 PM - 7:10 AM)
- 🔢 **Control de Pesos Brutos** - Registro múltiple de pesos con fotos por talla
- 📈 **Reportes por Turno** - Excel agrupado por turno con subtotales y links a fotos
- 🔄 **Auto-guardado Inteligente** - Guardado automático con indicador visual
- 🔓 **Sin Bloqueos** - Edita análisis sin restricciones
- 🔐 **Google Auth** - Autenticación segura con cuenta de Google
- 🎨 **UI Moderna** - Glassmorphism + Diseño responsive optimizado

## 📋 Características Destacadas

### 🔄 Sistema de Reintentos de Upload

✅ **Banner de Uploads Fallidos** - Alerta visual cuando hay fotos pendientes  
✅ **Panel de Gestión** - Panel deslizante con lista de fotos fallidas  
✅ **Retry Individual** - Reintentar subida de cada foto por separado  
✅ **Retry Masivo** - Reintentar todas las fotos fallidas de una vez  
✅ **Validación de Contexto** - Previene uploads a análisis/campos incorrectos  
✅ **Almacenamiento Local** - Photos guardadas localmente hasta subida exitosa  

### 📊 Sistema de Análisis Múltiples

✅ **Sub-Análisis** - Crear múltiples análisis para un mismo lote/código/talla  
✅ **Pestañas Dinámicas** - Navegar entre análisis con pestañas numeradas  
✅ **Agregar/Eliminar** - Gestión flexible de análisis individuales  
✅ **Datos Independientes** - Cada análisis tiene sus propios pesos, defectos y fotos  

### 🎨 Identificación por Analista

✅ **4 Colores** - Rojo, Azul, Verde, Amarillo  
✅ **Selector Visual** - Selector circular de colores en formulario  
✅ **Franja de Color** - Borde lateral en cards del dashboard  
✅ **Organización** - Facilita identificar quién hizo cada análisis  

### 📸 Gestión de Fotos

✅ **Captura con Cámara** - Acceso directo a cámara del dispositivo  
✅ **Selección de Archivo** - Upload desde galería o archivos  
✅ **Compresión Automática** - Reduce tamaño sin perder calidad  
✅ **Vista Previa** - Thumbnail con zoom en modal  
✅ **URLs Compartibles** - Links directos de Google Drive  
✅ **Retry Automático** - Reintento automático en caso de fallo  
✅ **Indicador de Estado** - Visual feedback del estado de upload  

### 📁 Control de Pesos Brutos

✅ **Registros Múltiples** - Agregar tantos pesos como sea necesario  
✅ **Foto por Registro** - Cada peso puede tener su foto  
✅ **Talla Opcional** - Especificar talla para cada registro  
✅ **Mini/Compacto** - Dos modos de vista para optimizar espacio  
✅ **Gestión Individual** - Editar o eliminar registros individuales  

### 🔍 Búsqueda y Dashboard

✅ **Dos Pestañas** - "En Progreso" (por defecto) y "Completados"  
✅ **Búsqueda Instantánea** - Por código o lote  
✅ **Indicador de Completado** - Checkmark verde en análisis terminados  
✅ **Identificación Visual** - Color del analista en borde lateral  
✅ **Paginación Infinita** - Carga más análisis al hacer scroll  

## 🏗️ Arquitectura del Proyecto

```
resistencias-app/
├── app/
│   ├── api/
│   │   ├── firestore/          # API REST de Firestore
│   │   └── drive/              # API REST de Google Drive
│   ├── dashboard/
│   │   └── tests/
│   │       ├── new/            # Crear nuevo análisis
│   │       └── edit/           # Editar análisis existente
│   ├── globals.css             # Estilos globales + Glassmorphism
│   ├── layout.tsx              # Layout con header de usuario
│   └── page.tsx                # Login con Google OAuth
├── lib/
│   ├── firebase.ts             # Configuración Firebase
│   ├── googleAuthService.ts    # Autenticación Google OAuth2
│   ├── googleDriveService.ts   # Gestión de fotos en Google Drive
│   ├── analysisService.ts      # CRUD de análisis de calidad
│   ├── reportService.ts        # Generación de reportes Excel
│   ├── photoStorageService.ts  # Almacenamiento local de fotos
│   ├── retryUploadService.ts   # Sistema de reintentos
│   ├── product-data.ts         # Catálogo de productos (5900+ códigos)
│   ├── types.ts                # Tipos TypeScript completos
│   ├── utils.ts                # Utilidades (turnos, fechas, IDs)
│   ├── validation.ts           # Validaciones de datos
│   └── logger.ts               # Sistema de logging
├── components/
│   ├── AnalysisDashboard.tsx   # Dashboard principal
│   ├── AnalysisTabs.tsx        # Pestañas de sub-análisis
│   ├── AnalystColorSelector.tsx # Selector de color de analista
│   ├── PhotoCapture.tsx        # Captura de fotos con retry
│   ├── ControlPesosBrutos.tsx  # Control de múltiples pesos
│   ├── WeightInputRow.tsx      # Row de peso con foto
│   ├── DefectSelector.tsx      # Selector de defectos con búsqueda
│   ├── FailedUploadsBanner.tsx # Banner de fotos fallidas
│   ├── PendingUploadsPanel.tsx # Panel de gestión de reintentos
│   ├── DailyReportCard.tsx     # Card de reporte diario
│   ├── GoogleLoginButton.tsx   # Botón de login
│   └── InitialForm.tsx         # Formulario inicial (lote/código)
├── hooks/
│   └── useAnalysisSave.ts      # Hook de guardado automático
├── public/
│   ├── manifest.json           # PWA manifest
│   └── sw.js                   # Service Worker
├── android/                    # Configuración Android (Capacitor)
├── .env.local                  # Variables de entorno (NO en Git)
├── .env.local.example          # Ejemplo de configuración
├── next.config.mjs             # Configuración Next.js
├── capacitor.config.json       # Configuración Capacitor
├── firebase.json               # Config Firebase
├── firestore.indexes.json      # Índices de Firestore
├── package.json
└── tsconfig.json
```

## 🚀 Instalación y Desarrollo

### 1. Requisitos Previos

- Node.js >= 18.0.0
- npm o yarn
- Cuenta de Google Cloud (para Drive API)
- Proyecto de Firebase

### 2. Clonar e Instalar

```bash
git clone https://github.com/rpillasagua/Analisis_Descongelado.git
cd resistencias-app
npm install --legacy-peer-deps
```

> ⚠️ **Nota**: Se usa `--legacy-peer-deps` debido a compatibilidad entre React 19 y algunas dependencias.

### 3. Configurar Variables de Entorno

```bash
copy .env.local.example .env.local
```

Editar `.env.local`:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=tu_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=tu_proyecto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=tu_proyecto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=tu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=tu_app_id

# Google Drive API
NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID=tu_client_id.apps.googleusercontent.com
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=tu_api_key
```

### 4. Configurar Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Crea un proyecto
3. Activa **Firestore Database**
4. Crea la colección: `quality_analyses`
5. Configura reglas de seguridad:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /quality_analyses/{analysisId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Configurar Google Drive API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Habilita **Google Drive API**
3. Crea credenciales OAuth 2.0:
   - Tipo: Aplicación web
   - Orígenes autorizados: `http://localhost:8080`, `https://tu-dominio.com`
   - URIs de redirección: `http://localhost:8080`, `https://tu-dominio.com`
4. Permisos: `userinfo.profile`, `userinfo.email`, `drive.file`

### 6. Iniciar Desarrollo

```bash
npm run dev
# Servidor inicia en: http://localhost:8080
```

### 7. Build para Producción

```bash
npm run build
```

## 📂 Estructura de Datos

### Colección: `quality_analyses`

```typescript
{
  id: "qa-1234567890",
  productType: "ENTERO" | "COLA" | "VALOR_AGREGADO" | "CONTROL_PESOS",
  lote: "0003540-25",
  codigo: "CAM-2025-001",
  talla?: "16/20",
  analystColor?: "red" | "blue" | "green" | "yellow",
  
  // Análisis múltiples (sub-análisis)
  analyses: [
    {
      numero: 1,
      pesoBruto?: { valor?: 1000, fotoUrl?: "https://..." },
      pesoCongelado?: { valor?: 850, fotoUrl?: "https://..." },
      pesoNeto?: { valor?: 800, fotoUrl?: "https://..." },
      conteo?: 50,
      uniformidad?: {
        grandes?: { valor?: 600, fotoUrl?: "https://..." },
        pequenos?: { valor?: 200, fotoUrl?: "https://..." }
      },
      defectos?: { MELANOSIS: 5, QUEBRADOS: 2 },
      fotoCalidad?: "https://...",
      observations?: "Observaciones"
    }
    // ... más análisis
  ],
  
  // Solo para CONTROL_PESOS
  pesosBrutos?: [
    {
      id: "pb-123",
      talla?: "16/20",
      peso: 950,
      fotoUrl?: "https://...",
      timestamp: "2025-11-27T10:00:00Z"
    }
  ],
  
  // Metadata
  createdAt: "2025-11-27T08:00:00Z",
  updatedAt?: "2025-11-27T09:00:00Z",
  completedAt?: "2025-11-27T10:00:00Z",
  createdBy: "user@example.com",
  shift: "DIA" | "NOCHE",

1. Click en **"+ Nuevo"**
2. Completar formulario inicial:
   - Seleccionar tipo de producto
   - Ingresar código (con autocompletado de 5900+ códigos)
   - Ingresar lote
   - Ingresar talla (opcional)
   - Seleccionar color de analista
3. Click **"Crear Análisis"**
4. Sistema automáticamente:
   - Detecta turno según hora
   - Crea estructura de carpetas en Google Drive
   - Crea primer sub-análisis (#1)

### Registrar Datos

1. **Pesos con fotos**:
   - Ingresar valor numérico
   - Click en ícono de cámara
   - Capturar/seleccionar foto
   - Sistema sube automáticamente a Google Drive
   - Si falla, se guarda localmente para retry

2. **Uniformidad**:
   - Grandes: peso + foto opcional
   - Pequeños: peso + foto opcional

3. **Defectos**:
   - Buscar defecto por nombre
   - Click para agregar
   - Configurar cantidad
   - Click "Edit" para eliminar defectos

4. **Auto-guardado**:
   - Guarda automáticamente cada 2 segundos
   - Indicador visual muestra estado

### Sistema de Retry de Fotos

1. **Cuando falla un upload**:
   - Foto se guarda en almacenamiento local
   - Aparece banner rojo en la parte superior
   - Se marca como "Pendiente" en el campo

2. **Reintentar uploads**:
   - Click en banner rojo → abre panel lateral
   - Ver lista de fotos pendientes con vista previa
   - **Retry Individual**: Click en botón "Reintentar" de cada foto
   - **Retry Masivo**: Click en "Reintentar Todas"

3. **Validación de contexto**:
   - Sistema verifica que el retry sea para el análisis correcto
   - Previene uploads a campos/análisis equivocados
   - Alerta si hay inconsistencia

### Análisis Múltiples

1. **Agregar sub-análisis**:
   - Click en botón **"+"** en las pestañas
   - Se crea nuevo análisis con número siguiente
   - Navegar con pestañas numeradas

2. **Eliminar sub-análisis**:
   - Ir a la pestaña del análisis a eliminar
   - Click en **"Eliminar Análisis"** (botón rojo)
   - Confirmar eliminación

3. **Navegar**:
   - Click en pestañas numeradas (#1, #2, #3...)
   - Cada análisis es independiente

### Control de Pesos Brutos

1. Click en **"+ Agregar Peso"**
2. Completar:
   - Talla (opcional)
   - Peso (gramos)
   - Foto (opcional)
3. Repetir para más registros
4. Cambiar entre vista **Mini** y **Compacta**
5. Eliminar registros individuales si es necesario

### Completar Análisis

1. Completar todos los campos requeridos
2. Click en **"Marcar como Completado"**
3. Sistema:
   - Marca `status = "COMPLETADO"`
   - Guarda timestamp `completedAt`
   - Muestra checkmark verde en dashboard

### Generar Reporte

1. En dashboard, click en **"Reporte"**
2. Seleccionar:
   - Fecha
   - Turno (Día/Noche/Todos)
3. Click en **"Generar Reporte"**
4. Excel se descarga con:
   - Análisis agrupados por turno
   - Subtotales
   - Links a fotos en Google Drive

## 🔐 Seguridad

- ✅ Autenticación obligatoria con Google OAuth2
- ✅ Reglas de seguridad en Firestore
- ✅ Tokens de acceso gestionados por Google
- ✅ Datos encriptados en tránsito y en reposo
- ✅ APIs REST protegidas
- ✅ Fotos con permisos restringidos en Drive

## 🐛 Solución de Problemas

### Fotos no se suben

**Solución**:
1. Verificar permisos de Google Drive en Google Cloud Console
2. Asegurarse de que el token de acceso sea válido
3. Revisar que la API esté habilitada
4. Si persiste, usar el sistema de retry:
   - Click en banner rojo
   - Reintentar foto individual o todas

### Panel de Reintentos no aparece

**Solución**:
1. Asegurarse de que haya fotos pendientes
2. Click en el banner rojo de "Uploads Fallidos"
3. Verificar consola del navegador para errores

### Análisis no se completa

**Solución**:
1. Verificar que todos los campos obligatorios estén llenos
2. Esperar que todas las fotos terminen de subir
3. Revisar que no haya fotos pendientes en el panel de retry

### Error al agregar sub-análisis

**Solución**:
1. Guardar el análisis actual primero
2. Verificar conexión a internet
3. Refrescar página si es necesario

## 📱 Instalar como PWA

### Android/iOS
1. Abrir en Chrome/Safari
2. Menú → "Agregar a pantalla de inicio"
3. ¡Funciona como app nativa!

### Windows/Mac
1. Abrir en Chrome/Edge
2. Ícono de instalación en barra de direcciones
3. Click "Instalar"

## 🚀 Deployment

### Vercel (Recomendado)

```bash
npm install -g vercel
vercel login
vercel --prod
```

Configurar variables de entorno en Vercel Dashboard.

### Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
npm run build
firebase deploy --only hosting
```

## 📊 Métricas de Rendimiento

| Métrica | Valor | Estado |
|---------|-------|--------|
| TypeScript Errors | 0 | ✅ |
| Build Success | 100% | ✅ |
| Códigos de Producto | 5900+ | ✅ |
| Analistas Simultáneos | 4 | ✅ |
| PWA Compatible | Sí | ✅ |

## 🎯 Próximos Pasos

- [ ] Notificaciones push cuando se completa análisis
- [ ] Tests unitarios (Jest + React Testing Library)
- [ ] Dashboard de estadísticas avanzadas
- [ ] Gráficos de tendencias
- [ ] Exportación a PDF
- [ ] App móvil nativa con Capacitor

---

**Repositorio:** [github.com/rpillasagua/Analisis_Descongelado](https://github.com/rpillasagua/Analisis_Descongelado)