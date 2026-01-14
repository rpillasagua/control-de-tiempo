# Sistema de Análisis de Descongelado (QMS)

**Sistema de Gestión de Calidad Corporativo**  
Una plataforma web progresiva (PWA) de alto rendimiento diseñada para la estandarización, validación y trazabilidad del proceso de control de calidad en productos marinos.

## ✨ Visión General

Este sistema digitaliza integralmente el flujo de trabajo de los analistas de calidad, reemplazando registros manuales con una interfaz moderna, validación de reglas de negocio en tiempo real y almacenamiento seguro en la nube. Diseñado para operar en entornos industriales con conectividad intermitente, garantiza la integridad de los datos y la evidencia fotográfica.

## 🚀 Capacidades Principales

### 🏭 Gestión de Producción Multi-Escenario
Soporte nativo para flujos de trabajo especializados:
- **Camarón Entero & Cola:** Validación automática de tallas y defectos específicos.
- **Valor Agregado:** Control de procesos complejos.
- **Control de Pesos:** Monitoreo estadístico de pesos brutos y netos.
- **Remuestreo & Auditoría:** Protocolos de verificación secundaria.

### 🛡️ Calidad & Compliance (Validación en Tiempo Real)
El motor de validación `Validations Engine` asegura el cumplimiento normativo al instante:
- **Base de Datos Técnica:** Integración con **455 fichas técnicas** digitalizadas.
- **Validación de Defectos:** Comparación automática contra límites porcentuales y absolutos (e.g., "Melanosis: 0%").
- **Tolerancias de Peso:** Alertas visuales inmediatas para desviaciones en Peso Neto y Glaseo.
- **Normalización de Datos:** Mapeo inteligente de defectos y tallas (`defect-normalization.ts`).

### 📸 Gestión de Evidencia Digital
Sistema robusto de captura y gestión de activos digitales:
- **Resiliencia de Red:** Cola de subida con reintentos automáticos (Exponential Backoff).
- **Compresión Inteligente:** Optimización de imágenes (WebP/JPEG) en el cliente para conservar ancho de banda.
- **Organización Automática:** Estructura jerárquica en Google Drive (`/CODIGO/LOTE/TALLA`).
- **Respaldo Local:** Persistencia temporal en IndexedDB para prevenir pérdida de datos.

### ⚡ Experiencia de Usuario (UX) Industrial
Interfaz diseñada para eficiencia y reducción de errores cognitivos:
- **Diseño "Glassmorphism":** UI moderna, limpia y de alto contraste.
- **Identidad de Analista:** Sistema de codificación por color para trazabilidad de operadores.

- **PWA Offline-First:** Funcionalidad continua sin conexión a internet.

## 🛠️ Stack Tecnológico

Estructura moderna basada en React y servicios Cloud:

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS.
- **Backend/Database:** Firebase Firestore (NoSQL), Google Cloud Platform.
- **Almacenamiento:** Google Drive API v3.
- **State Management:** React Context + Hooks personalizados.
- **PWA:** Service Workers, Manifest, IndexedDB.

## 📂 Arquitectura del Proyecto

El código sigue una arquitectura modular y escalable:

```
Analisis_Descongelado/
├── app/
│   ├── api/                    # Endpoints Server-side (Drive, Specs Parser)
│   ├── dashboard/              # Módulos de la aplicación
│   └── globals.css             # Design System & Glassmorphism Theme
├── components/
│   ├── ui/                     # Componentes base reutilizables
│   ├── AnalysisDashboard.tsx   # Core Logic de la vista principal
│   ├── PhotoCapture.tsx        # Módulo de cámara y procesamiento
│   └── TechnicalSpecsViewer.tsx# Visor de fichas técnicas
├── lib/
│   ├── validations/            # Lógica pura de validación de negocio
│   ├── firebase.ts             # Cliente Singleton de Firebase
│   ├── googleDriveService.ts   # Abstracción de Drive API
│   ├── technical-specs.ts      # Base de conocimiento (455 Productos)
│   └── product-data.ts         # Catálogo maestro normalizado
├── hooks/
│   ├── useAutoSave.ts          # Lógica de persistencia optimista
│   ├── usePhotoUpload.ts       # Gestor de cola de subida
│   └── useWeightValidation.ts  # Hooks de reglas de negocio
└── public/                     # Assets estáticos y Manifest PWA
```

## 🔒 Seguridad y Control de Acceso

- **Autenticación Federada:** Inicio de sesión exclusivo mediante Google Workspace corporativo.
- **RBAC (Role-Based Access Control):** Reglas de seguridad en Firestore (`firestore.rules`) para segregación de datos.
- **Trazabilidad:** Logs de auditoría para cada transacción crítica (creación, edición, borrado).

## 📊 Métricas del Proyecto

| Indicador | Estado | Detalle |
|-----------|:------:|---------|
| **Productos Catalogados** | ✅ | **455** Fichas Técnicas Activas |
| **Cobertura de Tipos** | ✅ | Entero, Cola, Valor Agregado, etc. |
| **Seguridad de Tipos** | ✅ | 100% TypeScript Strict Mode |
| **Performance** | ✅ | PWA Score > 90 (Lighthouse) |
| **Bundle Size** | ✅ | Optimizado con Code Splitting |

## 🚀 Despliegue

La aplicación está optimizada para despliegue en Vercel con soporte Edge Functions.

```bash
# Instalación de dependencias
npm install --legacy-peer-deps

# Servidor de Desarrollo
npm run dev

# Compilación de Producción
npm run build
```

---
**Desarrollado para Excelencia Operativa**
*Última actualización: Enero 2026*