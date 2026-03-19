# Bitácora Técnica

**Registro de visitas y evidencia de trabajo para técnicos**  
Una PWA (Progressive Web App) Offline-First diseñada para que técnicos de campo registren sus visitas a clientes, con control de tiempos, captura GPS, actividades con fotos y generación automática de reportes profesionales en PDF, **incluso sin conexión a internet**.

---

## ✨ ¿Qué hace esta app?

El técnico abre la app, selecciona o crea un cliente, inicia la visita y el sistema registra automáticamente:
- **Hora y coordenadas GPS de llegada** (verificable en Google Maps)
- **Actividades realizadas** con descripción y fotos
- **Hora y coordenadas GPS de salida**
- **Tiempo total de atención**

Al finalizar, se genera un **Reporte Técnico de Visita en PDF** que puede compartirse directamente por WhatsApp.

---

## 🚀 Funcionalidades Principales

### 📶 Modo Offline (Sin Internet)
- Crear visitas, registrar clientes y capturar fotos en zonas sin cobertura celular.
- Los datos y fotos se guardan en la memoria interna del celular (IndexedDB / LocalStorage).
- Sincronización automática de fotos a Firebase y actualización de bases de datos cuando el dispositivo recupera la conexión.

### 📋 Gestión de Visitas
- Listado de visitas del día con estado (En Progreso / Finalizada).
- Prevención estricta de visitas duplicadas concurrentes.
- Buscador y filtros instantáneos soportados por una caché masiva local.

### 📍 Control GPS Automático
- Captura de coordenadas al llegar y al salir con indicador de precisión (`±Xm`).
- Enlace directo a Google Maps desde el reporte para verificar la ubicación.

### 🛠️ Registro de Actividades
- Agregar actividades con descripción durante la visita.
- Módulo de compresión inteligente de imágenes integrado (ahorro masivo de datos 4G).
- Subida de imágenes a **Firebase Storage** de forma centralizada.

### 📄 Reportes Profesionales
- Generación nativa de PDFs perfectos a todo color (incluso en iOS y Safari).
- El perfil empresarial del técnico (logo, RUC, teléfono) figura en el encabezado.
- Botones de acción rápida: WhatsApp e Imprimir.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 15, TypeScript, Tailwind CSS v4 |
| **Generación PDF** | html2canvas-pro + jsPDF |
| **Base de datos** | Firebase Firestore (con persistencia IndexedDB) |
| **Almacenamiento de fotos** | Firebase Storage |
| **PWA** | @ducanh2912/next-pwa (Service Workers, app manifest) |

---

## 📂 Estructura del Proyecto Crítica

```
bitacora-tecnica/
├── app/
│   ├── page.tsx              # Dashboard principal
│   ├── visita/               # Lógica de inicio de visita y reportes
│   ├── historial/            # Buscador en memoria RAM de miles de visitas
│   └── api/                  # (No usado en Static Export)
├── components/               # OfflineBanner, OfflinePhotoSync, ServiceWorkerManager
└── lib/
    ├── visitService.ts       # CRUD de visitas en Firestore (+ LocalStorage guards)
    ├── clientService.ts      # CRUD de clientes con Caché Local
    ├── storageService.ts     # Módulo de Firebase Storage
    ├── idb.ts                # Gestión manual de fotos offline (IndexedDB)
    └── imageCompression.ts   # Optimizador de peso de imágenes
```

---

## 🔒 Seguridad

- **Autenticación:** Login exclusivo mediante cuenta Google (OAuth).
- **Aislamiento de datos:** Reglas de Firestore estrictas: los técnicos no pueden robar la titularidad de reportes de otros técnicos ni acceder a clientes ajenos.

---

## 🚀 Instalación y Despliegue

El proyecto está configurado para exportarse como un **Static HTML Export (SPA)** para máxima compatibilidad con PWA y Firebase Hosting.

```bash
# 1. Instalar dependencias
npm install

# 2. Configurar variables de entorno
cp .env.local.example .env.local
# Llenar .env.local con las llaves de Firebase

# 3. Servidor de desarrollo
npm run dev

# 4. Construcción para Producción (Static Export)
npm run build
```

Una vez ejecutado el build, la carpeta `out/` contiene toda la app lista para ser servida por Apache, Nginx o Firebase Hosting. Usa `npm run start` para probarla localmente.

---
*Última actualización: Marzo 2026*