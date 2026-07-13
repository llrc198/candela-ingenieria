# Deploy — Candela Ingeniería a Cloudflare Pages

Repo listo, git inicializado localmente. Dominio y cuenta de Cloudflare ya existen — estos pasos asumen eso.

## 1. Subir el repo a GitHub

```
git remote add origin https://github.com/<tu-usuario>/candela-ingenieria.git
git branch -M main
git push -u origin main
```

(Crea el repo vacío en GitHub primero, sin README/licencia, para que el push no choque.)

## 2. Crear el proyecto en Cloudflare Pages

1. Dashboard de Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Selecciona el repo `candela-ingenieria`.
3. Build settings:
   - **Framework preset**: None
   - **Build command**: (vacío)
   - **Build output directory**: `/`
4. Deploy. Cloudflare detecta `functions/api/contact.js` automáticamente — no requiere configuración adicional.

## 3. Conectar el dominio candelaing.cl

En el proyecto Pages → **Custom domains** → **Set up a custom domain** → `candelaing.cl` (y `www.candelaing.cl` si quieres redirigir). Como el dominio ya está en Cloudflare, el DNS se configura solo.

## 4. Configurar Resend (backend del formulario)

1. Crea cuenta en [resend.com](https://resend.com) si no existe.
2. **Domains** → agrega `mail.candelaing.cl` (subdominio dedicado al envío — así queda aislado del correo normal de `contacto@candelaing.cl` y no arriesga su entregabilidad).
3. Resend te da registros DNS (TXT/CNAME para SPF/DKIM) — agrégalos en Cloudflare DNS bajo `mail.candelaing.cl`. Espera la verificación (minutos, a veces más).
4. Genera una **API key** en Resend.
5. En el proyecto Cloudflare Pages → **Settings** → **Environment variables** → **Add secret**:
   - Nombre: `RESEND_API_KEY`
   - Valor: la API key de Resend (pégala tú directamente ahí, no por chat)
   - Aplica a **Production** (y **Preview** si quieres probar en ramas).
6. Re-deploy (o el próximo push ya la toma).

La función (`functions/api/contact.js`) ya envía desde `formulario@mail.candelaing.cl` hacia `contacto@candelaing.cl`.

## 5. Verificar que todo funciona

- Abre `https://candelaing.cl` y revisa que cargue con el dominio y certificado SSL de Cloudflare (automático).
- Llena el formulario de contacto y confirma que llega el correo a `contacto@candelaing.cl`.
- `https://candelaing.cl/robots.txt`, `/sitemap.xml`, `/llms.txt` deben responder 200.
- Envía `sitemap.xml` en Google Search Console y Bing Webmaster Tools (pendiente, ver plan de SEO).

## Nota importante — falta el email del prospecto

El formulario actual no pide el email de quien completa el formulario (solo nombre, empresa, RUT opcional, servicio, mensaje — así se definió originalmente). Sin ese dato, el correo que llega a `contacto@candelaing.cl` no tiene forma de responder directamente salvo por teléfono. Si quieres, agrego un campo de email al formulario y a la función — avísame.
