# CRM MKT BATTISTON — con agente de IA para WhatsApp

CRM para **MKT BATTISTON** (software de automatización con IA para redes sociales)
con **un** agente de Inteligencia Artificial conectable a WhatsApp que **capta leads**
y **agenda demos/reuniones** de venta.

Es *single-tenant*: un despliegue = una empresa. Está pensado para que puedas
descargarlo, ejecutarlo en tu ordenador y desplegarlo aunque no seas una persona
técnica.

> ⚠️ **Importante:** esta herramienta no tiene login. Es un panel de administración
> privado. **No la publiques en internet** sin poner una capa de autenticación
> delante. Lo único que puede estar expuesto públicamente es el webhook de WhatsApp
> (que va firmado).

---

## ✋ Antes de empezar: usa siempre `pnpm`

Este proyecto usa **pnpm** como gestor de paquetes. **No uses `npm` ni `npx`.**

Si no tienes pnpm instalado:

```bash
npm install -g pnpm
```

(Ese es el único momento en el que se usa `npm`: para instalar pnpm una vez.)

---

## 🧩 Qué necesitas instalar

1. **Node.js** versión 20 o superior — https://nodejs.org
2. **pnpm** (ver arriba).
3. **Docker Desktop** — https://www.docker.com/products/docker-desktop
   (solo se usa para la base de datos).

---

## 🚀 Arrancar en local, paso a paso

### 1. Descarga el proyecto e instala las dependencias

```bash
pnpm install
```

### 2. Prepara la configuración

Copia el archivo de ejemplo a `backend/.env`:

```bash
cp .env.example backend/.env
```

Abre `backend/.env` con un editor de texto. Para empezar a probar en local **no
necesitas tocar nada**: los valores por defecto ya funcionan. Cuando quieras conectar
WhatsApp de verdad, rellena las claves de YCloud (ver más abajo).

### 3. Arranca la base de datos

```bash
pnpm db:up
```

Esto levanta PostgreSQL en Docker (puerto **5433** de tu ordenador).

### 4. Arranca la aplicación

```bash
pnpm dev
```

Esto arranca a la vez:

- El **backend** (la parte que manda) en http://localhost:3001
- El **frontend** (lo que ves) en http://localhost:3000

### 5. Abre la app

Entra en tu navegador a 👉 **http://localhost:3000**

La primera vez, si `SEED_DEMO_DATA=true`, verás datos de ejemplo (empresa,
tipos de reunión, leads y conversaciones) para que puedas probar todo enseguida.

Para parar la base de datos cuando termines:

```bash
pnpm db:down
```

---

## 🤖 Configurar el agente de IA (desde la app)

1. Entra en la sección **Agente**.
2. Rellena la **persona de la empresa** (nombre, descripción, tono, zona horaria).
3. Define los **tipos de reunión** (nombre + duración) y los **horarios de atención**.
4. En **Modelo de IA**, pega tu **API key de OpenRouter** y elige un modelo.
   (Consigue tu clave en https://openrouter.ai)
5. Usa el **Playground** para chatear con el agente sin necesidad de WhatsApp.

---

## 💬 Conectar WhatsApp (desde `backend/.env`, no desde la app)

La conexión con WhatsApp se hace a través de **YCloud** y se configura **por archivo**,
no desde la app. En `backend/.env` rellena:

```
YCLOUD_API_KEY=...            # tu clave de API de YCloud (para ENVIAR mensajes)
YCLOUD_WEBHOOK_SECRET=...     # secreto para VERIFICAR los mensajes entrantes
YCLOUD_WHATSAPP_NUMBER=...    # tu número de WhatsApp, ej: +5493856456014
```

Luego, en el panel de YCloud, configura el webhook apuntando a:

```
POST https://TU-DOMINIO/api/webhooks/ycloud
```

> 🔒 Si no configuras `YCLOUD_WEBHOOK_SECRET`, el webhook **rechaza** todos los
> mensajes entrantes (por seguridad). Es intencionado.

---

## 🌐 Desplegar en un servidor (VPS)

Para producción usa el stack completo (base de datos + backend + frontend):

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Configura todas las claves y URLs mediante variables de entorno. Pon un proxy con
**HTTPS** (por ejemplo Caddy o Nginx) por delante. Recuerda que `NEXT_PUBLIC_API_URL`
se fija en el momento de construir el frontend.

---

## 🗂️ Estructura del proyecto

```
crm-wsp/
├── backend/                 # NestJS + TypeORM + agente Mastra (embebido)
├── frontend/                # Next.js + React + Tailwind
├── docker-compose.yml       # SOLO la base de datos (local)
├── docker-compose.prod.yml  # Stack completo (producción)
├── .env.example             # Plantilla de configuración
├── CLAUDE.md / AGENTS.md     # Convenciones técnicas del proyecto
└── README.md
```

---

## ❓ Preguntas frecuentes

**¿El agente da soporte técnico o cierra ventas solo?**
No. El agente solo **capta leads**, responde dudas sobre los productos con la
información configurada y **agenda demos**. Para precios o cerrar una compra,
ofrece agendar una reunión con tu equipo.

**¿Puedo apagar los datos de ejemplo?**
Sí. Pon `SEED_DEMO_DATA=false` en `backend/.env`.

**¿Se guardan mis claves de forma segura?**
La app nunca devuelve tus secretos: solo indica si están configurados o no.
