# CLAUDE.md — Protel (futuro: Hotar)

> Documentación extendida del proyecto en Obsidian: `~/Documents/Protel/`
> Leé las notas de esa carpeta para contexto completo de producto, decisiones y clientes.

## Qué es este proyecto
PMS (Property Management System) SaaS multi-tenant para hoteles en Argentina.
Cada hotel tiene su propio login, datos aislados, y módulos activables.

## Stack
- **Framework:** Next.js 14 App Router + TypeScript
- **DB:** PostgreSQL en Railway — ORM: Prisma
- **Auth:** NextAuth.js con CredentialsProvider, sesiones JWE, bcrypt 12 rounds
- **Deploy:** Railway — proyecto `heroic-friendship` (auto-deploy en push a main)
- **URL producción:** https://protel-production.up.railway.app
- **Pagos:** MercadoPago Checkout Pro (SDK server-side)
- **Facturación:** AFIP — pantalla lista, esperando primer hotel con certificado real

## Arquitectura multi-tenant
- **REGLA #1:** Todos los queries DEBEN estar scopeados por `session.user.hotelId`
- Un usuario nunca puede ver datos de otro hotel
- El `hotelId` viene siempre de la sesión del servidor, NUNCA del cliente

## Seguridad — reglas que no se rompen
- **Precios MercadoPago:** siempre recalcular server-side (`nights × room.pricePerNight`). Nunca confiar en `monto` del body del cliente
- **CRON_SECRET:** si no está seteado en env, retornar 401 siempre (fail-closed)
- **Passwords:** bcrypt 12 rounds (no bajar)
- **Anti-brute-force:** LoginAttempt model — 5 intentos fallidos = 15 min lockout
- **Webhook MP:** validar x-signature con MP_WEBHOOK_SECRET siempre
- **RBAC:** HOTEL_ADMIN requerido para escribir rooms e invoices

## Modelos Prisma clave
```
Hotel          → slug (único), activo, 1:1 HotelModules
HotelModules   → mercadopago, afip, grupos, mucama, calendario, reservas (todos Boolean)
Reservation    → email?, phone?, status (PENDING/CONFIRMED/CANCELLED/CHECKED_IN/CHECKED_OUT)
LoginAttempt   → anti-brute-force
AfipConfig     → certificado cifrado AES-256-GCM con NEXTAUTH_SECRET
```

## Variables de entorno requeridas
```
DATABASE_URL          # URL pública de Railway (tokaido.proxy.rlwy.net:36336)
NEXTAUTH_SECRET       # Secret JWE
MP_WEBHOOK_SECRET     # Validación webhooks MercadoPago
CRON_SECRET           # Protección endpoints cron
SEED_ADMIN_PASSWORD   # Password admin hotel (seed)
SEED_SUPER_PASSWORD   # Password super admin (seed)
```

## Estructura src/
```
src/
├── app/
│   ├── api/              # API routes
│   │   ├── super-admin/  # Solo SUPER_ADMIN
│   │   ├── mercadopago/  # create-preference (precio siempre desde DB)
│   │   ├── public/       # Motor de reservas público (sin auth)
│   │   └── cron/         # Reset limpieza (protegido con CRON_SECRET)
│   ├── dashboard/        # App protegida por auth
│   │   └── super-admin/  # Panel super admin
│   └── reservar/[slug]/  # Motor público de reservas (sin auth)
├── components/
│   └── dashboard/        # AppSidebar, etc.
└── lib/
    ├── auth.ts           # NextAuth config + brute-force
    ├── prisma.ts         # Prisma client singleton
    └── format-date.ts    # SIEMPRE usar timeZone: "UTC"
```

## Convenciones importantes
- **Fechas:** siempre `timeZone: "UTC"` en formatters (evita el bug de "día anterior")
- **Sidebar nav:** los items se ocultan según HotelModules — módulos pasan server-side desde layout
- **Motor público:** rate limit 5 req/IP/hora (in-memory Map), PENDING expiran a 30 min
- **Reservas públicas:** crear UUID → crear preferencia MP → si MP ok, crear reserva en DB (nunca al revés)

## Cron jobs
- **`/api/cron/reset-limpieza`** — reset diario de estado de limpieza de habitaciones
- Lo dispara **cron-job.org** (externo) haciendo un request al endpoint con el header/`CRON_SECRET`, todos los días a las 08:00
- Ya no se usa Vercel Cron (se eliminó `vercel.json` en la migración a Railway)
- Fail-closed: si `CRON_SECRET` no está seteado en env, el endpoint retorna 401 siempre

## Roles
- `SUPER_ADMIN` — acceso a todos los hoteles, panel super-admin
- `HOTEL_ADMIN` — admin del hotel, puede crear rooms/invoices
- `RECEPTIONIST` — operaciones del día a día

## Comandos
```bash
# Migraciones
npx prisma db push
npx prisma db seed

# Deploy
git add . && git commit -m "mensaje" && git push
# Railway despliega automático (push a main)

# Abrir con Claude Code
cd ~/Proyectos/protel
claude
```

## Pendiente (no tocar sin confirmar con usuario)
- Rename Protel → Hotar (pendiente confirmar dominio, ver Decisiones en Obsidian)
- MercadoPago Connect OAuth (cada hotel conecta su propia cuenta)
- AFIP emisión real (esperando hotel con certificado)
