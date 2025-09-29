# Guía para configurar Meta WhatsApp Cloud en Finnegans Chatbots

Esta guía explica, paso a paso, cómo preparar la cuenta de WhatsApp Cloud y cómo conectar el webhook de **Finnegans Chatbots**. Al finalizar, los mensajes entrantes de WhatsApp se procesarán automáticamente por los flujos del dashboard y podrás disparar flujos manualmente mediante un webhook seguro por flujo.

## 1. Requisitos previos

1. Acceso a [Meta for Developers](https://developers.facebook.com/) con un negocio verificado y permisos para administrar el producto **WhatsApp**.
2. Un número de teléfono registrado en WhatsApp Cloud.
3. Acceso al panel de administración de Finnegans Chatbots (o variables de entorno si trabajas en modo single-tenant).
4. Un dominio público accesible por Meta (por ejemplo, una app desplegada en Vercel o un túnel HTTPS).

## 2. Crear la app y obtener las credenciales

1. En Meta for Developers crea (o abre) una app y agrega el producto **WhatsApp**.
2. En la sección **Getting Started** copia los datos siguientes:
   - **App Secret** → variable `META_APP_SECRET`.
   - **Permanent Token** o token a largo plazo → variable `META_ACCESS_TOKEN`.
   - **Phone Number ID** → variable `META_PHONE_NUMBER_ID`.
   - **WhatsApp Business Account ID** → variable `META_BUSINESS_ACCOUNT_ID` (opcional pero recomendable para métricas).
3. Define un **Verify token** propio (por ejemplo, `finnegans-2025`) y configúralo tanto en la consola de Meta como en Finnegans Chatbots:
   - Variable `META_VERIFY_TOKEN`, o bien, en el dashboard en **Dashboard → Settings → WhatsApp Cloud**.
4. Si el despliegue es multi-usuario, cada usuario puede cargar sus propias credenciales desde el dashboard; las variables de entorno funcionan como _fallback_ global.

## 3. Configurar las variables de entorno en la plataforma

En el servidor donde corre Finnegans Chatbots agrega/actualiza el archivo `.env` (o las variables del proveedor) con las claves anteriores:

```bash
META_VERIFY_TOKEN="tu-verify-token"
META_APP_SECRET="app-secret"
META_ACCESS_TOKEN="access-token"
META_PHONE_NUMBER_ID="numero-id"
META_BUSINESS_ACCOUNT_ID="waba-id"
```

> **Nota:** También existen alias heredados para facilitar migraciones: `WHATSAPP_VERIFY_TOKEN` o `VERIFY_TOKEN` para el verify token, `WHATSAPP_APP_SECRET` o `APP_SECRET_KEY` para el app secret, `WHATSAPP_KEY` o `ACCESS_TOKEN` para el access token, `WHATSAPP_NUMBER_ID` para el phone number ID y `ACCOUNT_NUMBER_ID` para el WhatsApp Business Account ID.

## 4. Apuntar el webhook y verificarlo

1. Despliega la aplicación y anota la URL pública, por ejemplo `https://mi-app.vercel.app`.
2. En Meta, dentro del producto **WhatsApp → Configuration**, establece la URL del webhook a `https://mi-app.vercel.app/api/webhook`.
3. Introduce el verify token que definiste en el paso 2 y presiona **Verify and Save**.
   - Finnegans Chatbots responde al reto (`hub.challenge`) y valida el token de manera automática.
4. Una vez verificado, activa los eventos **messages**, **message_template_status_update** y **message_status_update** (o cualquier otro que necesites). Estos eventos son los que dispara Finnegans Chatbots para mensajes entrantes y estados de plantillas/broadcasts.

## 5. Probar mensajes entrantes

1. Desde el panel de Meta envía un mensaje de prueba (o escribe desde un número real al número de WhatsApp Cloud).
2. Verifica en el dashboard → **Contacts** o **Logs** que aparezca el contacto y que el flujo activo haya procesado el mensaje.
3. Si no aparece, revisa:
   - Que el `META_APP_SECRET` coincida (de lo contrario la firma HMAC fallará y el webhook devolverá 401).
   - Que exista al menos un flujo en estado **Active** con un nodo **Trigger** que coincida con el texto recibido.
   - Los registros del servidor (`Webhook processing error`) para detalles adicionales.

## 6. Webhook seguro por flujo (opcional)

Cada nodo **Trigger** del constructor muestra un enlace de webhook con formato:

```
https://mi-app.vercel.app/api/webhook?flowId=FLOW_ID
```

Este endpoint permite iniciar un flujo de manera programada (por ejemplo, desde un formulario o un CRM externo). Para protegerlo se debe enviar el mismo verify token del paso 2, ya sea en el encabezado `X-Webhook-Token`, en el query string `?token=...` o en el campo `token` del cuerpo.

Ejemplo de petición `curl`:

```bash
curl -X POST "https://mi-app.vercel.app/api/webhook?flowId=FLOW_ID" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Token: finnegans-2025" \
  -d '{
    "from": "+5491100000000",
    "name": "Juan Pérez",
    "message": "soporte",
    "variables": {
      "ordenId": "A1234",
      "origen": "Landing"
    }
  }'
```

- `from` (requerido): número de WhatsApp del contacto en formato internacional.
- `message` (requerido): texto que debe coincidir con un **Trigger** del flujo.
- `name` y `variables` son opcionales; las variables se fusionan con el contexto de la sesión antes de ejecutar el flujo.
- La respuesta incluye `sessionId` y `contactId` para trazabilidad.

## 7. Resolución de problemas frecuentes

| Síntoma | Posibles causas | Solución |
| --- | --- | --- |
| Meta muestra `403 Forbidden` al verificar | Verify token distinto | Asegúrate de que el valor en Meta y en `META_VERIFY_TOKEN` sea idéntico |
| Webhook recibe `401 Missing signature` | Meta no envió la cabecera `x-hub-signature-256` (ej: petición manual) | Usa el endpoint con `flowId` para pruebas manuales o incluye la cabecera generada con el `META_APP_SECRET` |
| Los mensajes no disparan el flujo correcto | No existe flujo activo o el trigger no coincide | Activa el flujo en el dashboard y revisa el nodo Trigger (texto en minúsculas y sin espacios extra) |
| Los estados de broadcasts no se reflejan | Eventos `message_status_update` no suscritos | Habilita el evento en la consola de Meta |
| El webhook por flujo responde 403 | Token ausente o incorrecto | Envía el verify token mediante `X-Webhook-Token`, `?token=` o el campo `token` |

Con estos pasos la cuenta de WhatsApp Cloud quedará conectada a Finnegans Chatbots y lista para operar en producción.
