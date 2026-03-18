# Bitácora Técnica

**Registro de visitas y evidencia de trabajo para técnicos**  
Una PWA (Progressive Web App) diseñada para que técnicos de campo registren sus visitas a clientes de forma ordenada, con control de tiempos, captura GPS, actividades con fotos y generación automática de reportes profesionales.

---

## ✨ ¿Qué hace esta app?

El técnico abre la app, selecciona o crea un cliente, inicia la visita y el sistema registra automáticamente:
- **Hora y coordenadas GPS de llegada** (verificable en Google Maps)
- **Actividades realizadas** con descripción y fotos
- **Hora y coordenadas GPS de salida**
- **Tiempo total de atención**

Al finalizar, se genera un **Reporte Técnico de Visita** que puede imprimirse o compartirse directamente por WhatsApp.

---

## 🚀 Funcionalidades Principales

### 📋 Gestión de Visitas
- Crear una nueva visita seleccionando un cliente
- Banner de visita activa con cronómetro en tiempo real
- Listado de visitas del día con estado (En Progreso / Finalizada)
- Historial completo de visitas anteriores

### 📍 Control GPS Automático
- Captura de coordenadas al llegar y al salir
- Enlace directo a Google Maps desde el reporte para verificar la ubicación
- Muestra precisión de la señal GPS (`±Xm`)

### 🛠️ Registro de Actividades
- Agregar actividades con descripción libre durante la visita
- Adjuntar fotos a cada actividad (con compresión automática de imágenes)
- Subida de imágenes a **Firebase Storage** de forma organizada y centralizada

### 📄 Reportes Profesionales
- Reporte formal con datos del cliente, del técnico y registro de tiempos
- Perfil empresarial (nombre de empresa, RUC, teléfono) en el encabezado
- Compartir por **WhatsApp** con enlace o **imprimir** directamente
- URL pública por visita (accesible sin login)

### 👤 Perfil del Técnico
- Configurar nombre, empresa, RUC y teléfono
- Datos visibles automáticamente en todos los reportes generados

### 🏢 Gestión de Clientes
- Registrar clientes con nombre y dirección
- Acceso rápido desde el dashboard principal

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS |
| **Base de datos** | Firebase Firestore |
| **Autenticación** | Google OAuth (sesión persistente) |
| **Almacenamiento de fotos** | Firebase Storage |
| **PWA** | Service Workers, Web App Manifest |
| **Geolocalización** | Browser Geolocation API |

---

## 📂 Estructura del Proyecto

```
bitacora-tecnica/
├── app/
│   ├── page.tsx              # Dashboard principal (visitas del día)
│   ├── visita/
│   │   ├── nueva/            # Crear nueva visita
│   │   └── [id]/
│   │       ├── page.tsx      # Detalle de visita + registro de actividades
│   │       └── reporte/      # Reporte imprimible / compartible
│   ├── clientes/             # Listado y creación de clientes
│   ├── historial/            # Historial de visitas anteriores
│   ├── perfil/               # Configuración del perfil del técnico
│   └── reporte/[id]/         # Reporte público (acceso sin login)
├── components/               # Componentes reutilizables (auth, toasts, etc.)
├── hooks/
│   ├── useAuth.ts            # Autenticación con Google
│   ├── useGeolocation.ts     # Captura de coordenadas GPS
│   └── useNetworkStatus.ts   # Detección de conectividad
└── lib/
    ├── visitService.ts       # CRUD de visitas en Firestore
    ├── clientService.ts      # CRUD de clientes
    ├── profileService.ts     # Perfil del técnico
    ├── driveService.ts       # Subida de fotos a Google Drive
    ├── types.ts              # Tipos TypeScript compartidos
    └── firebase.ts           # Configuración Firebase
```

---

## 🔒 Seguridad

- **Autenticación:** Login exclusivo mediante cuenta Google (OAuth)
- **Aislamiento de datos:** Cada técnico solo ve sus propias visitas y clientes (reglas Firestore)
- **Credenciales privadas:** Las claves de Firebase Admin y archivos `.env` están excluidos del repositorio

---

## 🚀 Instalación y Desarrollo

```bash
# 1. Clonar el repo
git clone https://github.com/rpillasagua/control-de-tiempo.git
cd control-de-tiempo

# 2. Instalar dependencias
npm install --legacy-peer-deps

# 3. Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Firebase y Google

# 4. Servidor de desarrollo
npm run dev
```

La app estará disponible en `http://localhost:3000`.

---

## ☁️ Despliegue

La aplicación está optimizada para despliegue en **Vercel** con soporte para Edge Functions.

```bash
npm run build
```

---

*Última actualización: Marzo 2026*