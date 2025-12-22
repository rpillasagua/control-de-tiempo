# Sistema de Análisis de Descongelado

**Sistema de Gestión de Calidad** - Aplicación web moderna para análisis de calidad del proceso de descongelado de productos marinos con gestión avanzada de fotos y análisis múltiples.

## ✨ Características Principales

Este sistema especializado ofrece:

- 🦐 **Tipos de Producto** - Entero, Cola, Valor Agregado, Control de Pesos Brutos, Remuestreo
- 📸 **Sistema de Fotos Avanzado** - Captura con retry automático y gestión de uploads fallidos
- 💾 **Google Drive** - Almacenamiento organizado de fotos por código/lote con URLs compartibles
- 📊 **Análisis Múltiples** - Múltiples análisis (sub-análisis) para el mismo lote/código/talla
- 🎨 **Colores de Analista** - Identificación visual por analista (máx. 4 por turno)
- ⏰ **Turnos Automáticos** - Día (7:10 AM - 7:10 PM) y Noche (7:10 PM - 7:10 AM)
- 🔢 **Control de Pesos Brutos** - Registro múltiple de pesos con fotos por talla
- 📈 **Reportes por Turno** - Excel agrupado por turno con subtotales y links a fotos
- 🔄 **Auto-guardado Inteligente** - Guardado automático con indicador visual
- 📋 **Fichas Técnicas** - Gestión de especificaciones técnicas personalizadas
- ⚖️ **Validación de Pesos** - Validación en tiempo real de peso bruto y neto contra especificaciones
- 🐛 **Validación de Defectos** - Validación en tiempo real contra límites de la ficha técnica
- 🔐 **Google Auth** - Autenticación segura con cuenta de Google
- 🎨 **UI Moderna** - Glassmorphism + Diseño responsive optimizado

## 🆕 Funcionalidades Principales

### 📋 Sistema de Fichas Técnicas y Validación

✅ **Validación de Defectos en Tiempo Real** - Cada defecto se valida automáticamente contra los límites de la ficha técnica  
✅ **Cálculo Automático de Porcentajes** - Calcula `(cantidad × peso promedio / peso neto) × 100`  
✅ **Alertas Visuales** - Indicadores rojos cuando un defecto excede el límite permitido  
✅ **Normalización de Nombres** - Mapeo automático entre nombres de defectos del sistema y fichas técnicas (`defect-normalization.ts`)  
✅ **Visor de Fichas Técnicas** - Modal con vista completa de especificaciones del producto (`TechnicalSpecsViewer.tsx`)  
✅ **Formulario de Especificaciones** - Crear y editar fichas técnicas personalizadas (`TechnicalSpecForm.tsx`)  
✅ **Parser de PDFs** - Extracción automática de especificaciones desde PDFs (API `/api/parse-spec`)  
✅ **Constantes Centralizadas** - Tallas estándar y defectos conocidos en `spec-constants.ts`  
✅ **Fichas PDF Incluidas** - 9 fichas técnicas preconfiguradas (códigos 67, 341, 479, 496, 539, 544, 547, 548, 549)

### ⚖️ Sistema de Validación de Pesos

✅ **Validación Peso Bruto** - Valida contra `PESO_BRUTO_PRODUCCION` de la ficha técnica  
✅ **Validación Peso Neto** - Valida contra `PESO_NETO_DECLARADO` con tolerancia de sobrepeso  
✅ **Cálculo de Glaseo** - Calcula automáticamente el glaseo para productos con ≥3 unidades  
✅ **Soporte Multi-Unidad** - Detecta automáticamente Kg vs Lb según el tipo de producto  
✅ **Mensajes Claros** - Muestra "Valor (Límite)" para identificar fácilmente desviaciones  
✅ **Hook Dedicado** - `useWeightValidation.ts` para validaciones consistentes

### � Sistema de Cálculo de Defectos

✅ **Hook `useDefectCalculation`** - Cálculo centralizado de validación de defectos  
✅ **Detección Automática Cola/Entero** - Detecta tipo por formato de talla (16-20 = Cola, 10-20 = Entero)  
✅ **Validación Total de Defectos** - Suma y valida el total contra límite de `DEFECTOS_TOTALES`  
✅ **Defectos Prohibidos** - Detecta defectos que no están permitidos (limit = "NO")  
✅ **Porcentajes Individuales** - Calcula porcentaje de cada defecto vs límite

### 🔑 Autenticación y Seguridad

✅ **AuthInitializer** - Componente global para restaurar sesión automáticamente  
✅ **Persistencia de Sesión** - Sesión de Google se mantiene entre recargas  
✅ **Reglas de Firestore** - Nuevas reglas de seguridad configuradas (`firestore.rules`)  
✅ **Token Expiry Notifier** - Notificación cuando el token de Google está por expirar

### 📊 Base de Datos Técnicos

✅ **3.7 MB de especificaciones** - Archivo `technical-specs.ts` con datos completos  
✅ **490+ productos** - Catálogo ampliado en `product-data.ts`  
✅ **Productos Personalizados** - Sistema para agregar productos no existentes (`customProductService.ts`)  
✅ **Scripts de Análisis** - Múltiples scripts Python para validación y extracción de datos

### � Validación Completa de Reportes

✅ **Validación de Talla** - Verifica si la talla existe en la ficha técnica del producto  
✅ **Validación de Conteo** - Compara el conteo contra rangos permitidos de la ficha técnica  
✅ **Validación de Uniformidad** - Verifica ratio grandes/pequeños contra límite de uniformidad  
✅ **Hoja de Validaciones** - Genera hoja "Lotes con Novedades" mostrando solo análisis con problemas  
✅ **Mensajes Descriptivos** - Formato "⚠️ CONTEO alto (55) (Límite: 30-50)" en reportes

### ✏️ Edición y Gestión de Datos

✅ **Edición de Metadata** - Modal para editar código, lote, y talla de análisis existentes  
✅ **Normalización de Código** - Agrega ceros a la izquierda automáticamente (ej: 123 → 00123)  
✅ **Normalización de Lote** - Formatea lote según tipo de producto automáticamente  
✅ **Búsqueda de Análisis** - Buscar análisis existentes por código o lote con autocompletado  
✅ **Selección de Análisis** - Seleccionar análisis existente para continuar editando

## �📋 Más Características

### 🔄 Auto-Guardado Inteligente

✅ **Debounce Dinámico** - Ajusta tiempo de guardado según velocidad de conexión (4G: 1s, 3G: 2s, 2G: 3s)  
✅ **Backup Local** - Guarda en localStorage antes de intentar Firestore  
✅ **Recuperación Automática** - Recupera datos de backup si el guardado falla  
✅ **Guardado al Cerrar** - Guarda automáticamente antes de cerrar pestaña/ventana  
✅ **Guardado al Cambiar Tab** - Sincroniza al cambiar visibilidad de la pestaña  
✅ **Indicador de Estado** - Muestra "Guardando...", "Guardado", "Error" con animaciones  
✅ **Modo Offline** - Detecta cuando no hay conexión y guarda localmente

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
✅ **Suscripción en Tiempo Real** - Los cambios de otros dispositivos se reflejan automáticamente

### 🎨 Identificación por Analista

✅ **4 Colores** - Rojo, Azul, Verde, Amarillo  
✅ **Selector Visual** - Selector circular de colores en formulario  
✅ **Franja de Color** - Borde lateral en cards del dashboard  
✅ **Organización** - Facilita identificar quién hizo cada análisis  

### 📸 Gestión de Fotos

✅ **Captura con Cámara** - Acceso directo a cámara del dispositivo  
✅ **Selección de Archivo** - Upload desde galería o archivos  
✅ **Compresión Inteligente** - Compresión a 800KB máx, 1920px, 85% calidad  
✅ **Soporte HEIC** - Convierte automáticamente fotos HEIC de iPhone a JPEG  
✅ **Timeout de Compresión** - 10s timeout con fallback sin WebWorker  
✅ **Thumbnails Mejorados** - Vista previa de fotos optimizada  
✅ **Upload a Google Drive** - Almacenamiento persistente en la nube  
✅ **Carpetas Organizadas** - Estructura: `descongelado/CODIGO/LOTE/`

### 🔐 Transacciones Seguras

✅ **Protección Multi-Dispositivo** - Verifica timestamp antes de sobrescribir  
✅ **Transacciones Firestore** - Operaciones atómicas con `runTransaction`  
✅ **Retry Automático** - Reintentos con backoff exponencial (`retry-utils.ts`)  
✅ **Renovar Permisos** - Función para renovar permisos de fotos expirados
### 📈 Sistema de Reportes

✅ **Generación de Excel** - Reportes exportables con todos los datos del análisis  
✅ **Agrupación por Turno** - Día/Noche con subtotales  
✅ **Links a Fotos** - URLs de Google Drive incluidas en el reporte  
✅ **Validación Incluida** - Muestra errores de validación en el reporte  
✅ **Servicio Dedicado** - `reportService.ts` con lógica completa

## 📂 Estructura del Proyecto

```
Analisis_Descongelado/
├── app/
│   ├── api/
│   │   ├── firestore/          # API REST de Firestore
│   │   ├── drive/              # API REST de Google Drive
│   │   └── parse-spec/         # Parser de fichas técnicas PDF
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
│   ├── customProductService.ts # Gestión de productos personalizados
│   ├── product-data.ts         # Catálogo de productos (490+ códigos)
│   ├── technical-specs.ts      # Especificaciones técnicas (8241+ líneas)
│   ├── spec-constants.ts       # Constantes: tallas, defectos, patrones
│   ├── types.ts                # Tipos TypeScript completos
│   ├── utils.ts                # Utilidades (turnos, fechas, IDs)
│   ├── validation.ts           # Validaciones de datos
│   └── logger.ts               # Sistema de logging
├── components/
│   ├── AnalysisDashboard.tsx   # Dashboard principal
│   ├── AnalysisTabs.tsx        # Pestañas de sub-análisis
│   ├── AnalystColorSelector.tsx# Selector de color de analista
│   ├── AuthInitializer.tsx     # Inicializador global de autenticación
│   ├── PhotoCapture.tsx        # Captura de fotos con retry
│   ├── PhotoThumbnail.tsx      # Vista previa de fotos
│   ├── ControlPesosBrutos.tsx  # Control de múltiples pesos
│   ├── TechnicalSpecForm.tsx   # Formulario de fichas técnicas
│   └── NewProductModal.tsx     # Modal para productos nuevos
├── hooks/
│   ├── useTechnicalSpecs.ts    # Hook para especificaciones técnicas
│   ├── usePhotoUpload.ts       # Hook para subida de fotos
│   └── useWeightValidation.ts  # Hook para validación de pesos
├── fichas/                     # PDFs de fichas técnicas
│   ├── 67.pdf, 341.pdf, 479.pdf, 496.pdf
│   ├── 539.pdf, 544.pdf, 547.pdf, 548.pdf, 549.pdf
├── scripts/
│   └── extract_new_specs.js    # Extracción de especificaciones
├── firestore.rules             # Reglas de seguridad Firestore
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
cd Analisis_Descongelado
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
5. Configura reglas de seguridad (ver `firestore.rules`)

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
  productType: "ENTERO" | "COLA" | "VALOR_AGREGADO" | "CONTROL_PESOS" | "REMUESTREO",
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
  shift: "DIA" | "NOCHE"
}
```

## 📖 Guía de Uso

### Crear un Nuevo Análisis

1. Click en **"+ Nuevo"**
2. Completar formulario inicial:
   - Seleccionar tipo de producto
   - Ingresar código (con autocompletado)
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

### Análisis Múltiples

1. **Agregar sub-análisis**:
   - Click en botón **"+"** en las pestañas
   - Se crea nuevo análisis con número siguiente
   - Navegar con pestañas numeradas

2. **Eliminar sub-análisis**:
   - Ir a la pestaña del análisis a eliminar
   - Click en **"Eliminar Análisis"** (botón rojo)
   - Confirmar eliminación

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
- ✅ Reglas de seguridad en Firestore (`firestore.rules`)
- ✅ Tokens de acceso gestionados por Google
- ✅ Datos encriptados en tránsito y en reposo
- ✅ APIs REST protegidas
- ✅ Fotos con permisos restringidos en Drive

## 🐛 Solución de Problemas

### Fotos no se suben

1. Verificar permisos de Google Drive en Google Cloud Console
2. Asegurarse de que el token de acceso sea válido
3. Revisar que la API esté habilitada
4. Si persiste, usar el sistema de retry

### Sesión no se mantiene

1. Verificar que `AuthInitializer` esté en `layout.tsx`
2. Revisar consola del navegador para errores
3. Limpiar cookies y volver a autenticarse

### Análisis no se completa

1. Verificar que todos los campos obligatorios estén llenos
2. Esperar que todas las fotos terminen de subir
3. Revisar que no haya fotos pendientes en el panel de retry

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

## 📊 Métricas del Proyecto

| Métrica | Valor | Estado |
|---------|-------|--------|
| TypeScript Errors | 0 | ✅ |
| Build Success | 100% | ✅ |
| Especificaciones Técnicas | 8,241+ líneas | ✅ |
| Productos en Catálogo | 490+ | ✅ |
| Fichas PDF Incluidas | 9 | ✅ |
| Componentes | 42 | ✅ |
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

**Última Actualización:** Diciembre 2024