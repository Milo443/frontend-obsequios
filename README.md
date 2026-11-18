# CEMCOP Entregas — Frontend Web

Aplicación web SPA desarrollada con **Angular 22 (`^22.2.6`) + PrimeNG 21 (`21.1.10`) + `@primeuix/themes` (`2.0.3`, 100% MIT Open Source / versión gratuita sin paquetes ni banners de licencia comercial)** para el **Sistema de Gestión y Entrega de Obsequios de CEMCOP**.

## Características principales

- **Arquitectura Angular Standalone + Signals:** rutas lazy-loaded protegidas por guards de autenticación, rol y cambio obligatorio de contraseña (`authGuard`, `initialPasswordGuard`, `roleGuard`).
- **Componentes 100% gratuitos (MIT):** usa `primeng@21.1.10`, `@primeuix/themes@2.0.3` y `primeicons@^7.0.0`, sin `@primeui/license-manager` ni componentes comerciales/Pro.
- **Diseño Full Responsive y personalizable en tiempo de ejecución:** cajón personalizador de paleta/tema (`theme-customizer-drawer.component.ts` + `theme.service.ts`).
- **Captura operativa en punto de entrega:** lector/parser de cédula PDF417 (`pdf417-parser.ts`) y lienzo de firma digital HiDPI (`signature-pad.component.ts`).
- **Integración transparente en desarrollo:** `proxy.conf.json` redirige las llamadas `/api` y `/api-docs` hacia `http://localhost:3000`.

---

## Requisitos previos

- **Node.js LTS:** `>= 22.22.3` (`^22.22.3 || ^24.15.0 || ^26.0.0`, verificado en `v26.13.1`) y **npm**
- **Backend CEMCOP Entregas** ejecutándose en `http://localhost:3000` (repositorio `https://github.com/Milo443/backend-regalos.git`)

---

## Inicialización paso a paso en local

### Paso 1: Clonar el repositorio e instalar dependencias

```bash
git clone https://github.com/Milo443/frontend-obsequios.git
cd frontend-obsequios
npm install
```

### Paso 2: Verificar configuración del proxy de API (`proxy.conf.json`)

El proyecto ya incluye `proxy.conf.json` configurado en `angular.json` para el comando `serve`:

```json
{
  "/api": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  },
  "/api-docs": {
    "target": "http://localhost:3000",
    "secure": false,
    "changeOrigin": true
  }
}
```

Si ejecutas el backend en otro puerto o host distinto a `http://localhost:3000`, actualiza `target` en `proxy.conf.json` y `CORS_ORIGIN` en el `.env` del backend.

### Paso 3: Iniciar el servidor de desarrollo

Asegúrate de tener el backend levantado en `http://localhost:3000` y ejecuta:

```bash
npm start
```

Abre en tu navegador:

- **URL local:** `http://localhost:4200`

### Paso 4: Ingreso inicial y cambio de contraseña

Con la base de datos inicializada desde `database/schema.sql` del backend:

1. Ingresa en `http://localhost:4200/login` con el usuario semilla:
   - **Usuario:** `admin`
   - **Contraseña temporal:** `secret`
2. Por seguridad (`debe_cambiar_clave = 1`), el guard `initialPasswordGuard` te redirigirá automáticamente a `/cambiar-clave-inicial` para establecer tu contraseña definitiva.
3. A partir de ese momento podrás gestionar sedes, usuarios, campañas activas, padrón de asociados, entregas y reportes según el rol autenticado.

### Paso 5: Compilar para producción

Para generar el bundle optimizado en `dist/cemcop-entregas`:

```bash
npm run build
```

---

## Scripts disponibles

| Script | Comando | Descripción |
| :--- | :--- | :--- |
| `start` | `npm start` | Inicia el servidor de desarrollo Angular (`ng serve`) en `http://localhost:4200` con `proxy.conf.json`. |
| `build` | `npm run build` | Compila la aplicación para producción en `dist/cemcop-entregas` (`ng build`). |
| `watch` | `npm run watch` | Compila en modo desarrollo observando cambios (`ng build --watch --configuration development`). |
| `ng` | `npm run ng -- <args>` | Ejecuta comandos directos de Angular CLI. |

---

## Módulos y rutas de la aplicación

| Ruta | Roles permitidos | Módulo |
| :--- | :--- | :--- |
| `/login` | Público | Inicio de sesión |
| `/cambiar-clave-inicial` | Usuario autenticado | Cambio obligatorio de contraseña inicial |
| `/entregar` | `REPARTIDOR` | Búsqueda / escaneo PDF417 y registro de entrega con firma |
| `/campanas` | `ADMINISTRADOR`, `SUPER_ADMIN` | Administración de campañas / actividades e inventario |
| `/asociados` | `ADMINISTRADOR`, `SUPER_ADMIN` | Gestión e importación del padrón de asociados |
| `/entregas-admin` | `ADMINISTRADOR`, `SUPER_ADMIN` | Seguimiento y anulación de entregas |
| `/reportes` | `ADMINISTRADOR`, `SUPER_ADMIN` | Generación y descarga de reportes |
| `/gobierno` | `SUPER_ADMIN` | Sedes, usuarios y auditoría global |
