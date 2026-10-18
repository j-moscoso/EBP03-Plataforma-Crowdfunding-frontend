# Fabrica-escuela

## Integracion local

El frontend usa `VITE_API_BASE_URL` para apuntar al backend Spring Boot. La configuracion local no versionada esta en `.env.local`:

```env
VITE_API_BASE_URL=http://localhost:8080
```

`.env.example` contiene el valor de referencia sin secretos. Las solicitudes autenticadas envian la cookie `AUTH_SESSION` con `credentials: 'include'`; el frontend no guarda sesiones, contrasenas, tokens ni datos de tarjeta en almacenamiento del navegador.

Para el despliegue, configurar en Vercel `VITE_API_BASE_URL=https://<servicio-backend-en-render>.onrender.com` cuando exista la URL real. En Render, mantener las variables del backend fuera del frontend y configurar `APP_CORS_ALLOWED_ORIGINS` con el origen exacto de Vercel (sin `*` ni barra final), `AUTH_COOKIE_SECURE=true` y `AUTH_COOKIE_SAME_SITE=None` cuando frontend y backend estén en dominios distintos, además de las variables de base de datos y pagos. El backend permite `PATCH` para guardar el perfil y debe responder al origen configurado con `Access-Control-Allow-Credentials: true`. No usar `*` con credenciales. Las migraciones Flyway del backend agregan el tipo de medio de portada y mantienen las campañas existentes como imágenes.

## Verificacion

```text
npm run build
npx tsc --noEmit
```

El servidor de desarrollo de Figma Make usa el puerto definido por `PORT` (por defecto `8443`). Para una prueba local convencional puede ejecutarse `npm run dev -- --host 0.0.0.0`.