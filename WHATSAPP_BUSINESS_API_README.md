# WhatsApp Business API Integration

Este módulo está preparado para integración con WhatsApp Business API, permitiendo enviar mensajes con archivos adjuntos directamente desde la aplicación.

## Estado Actual
**DESACTIVADO** - El módulo está preparado pero no activo. La aplicación usa actualmente la alternativa de WhatsApp Web (sin adjuntos automáticos).

## Archivos del Módulo

### 1. `src/services/whatsappBusinessService.ts`
Servicio principal con funciones para:
- Enviar mensajes de texto
- Enviar documentos (PDF) adjuntos
- Enviar presupuestos y facturas con PDF
- Utilidades de configuración y formateo

### 2. `.env.whatsapp.example`
Archivo de ejemplo con las variables de entorno necesarias para configurar la API.

## Cómo Activar la Integración

### Paso 1: Obtener Credenciales de WhatsApp Business API

1. Ve a [Meta for Developers](https://developers.facebook.com/apps/)
2. Crea una nueva aplicación o selecciona una existente
3. Añade el producto "WhatsApp" a tu aplicación
4. Configura tu número de teléfono de WhatsApp Business
5. Obtén el **Phone Number ID** y genera un **Access Token**
6. Asegúrate de que el Access Token tenga permisos de envío de mensajes

### Paso 2: Configurar Variables de Entorno

1. Copia `.env.whatsapp.example` a `.env`
2. Rellena los valores reales:
   ```env
   VITE_USE_WHATSAPP_BUSINESS_API=true
   VITE_WHATSAPP_PHONE_NUMBER_ID=tu_phone_number_id
   VITE_WHATSAPP_ACCESS_TOKEN=tu_access_token
   ```

### Paso 3: Modificar el Código de Envío

En `PresupuestosPage.tsx` y `FacturasPage.tsx`, reemplaza la lógica actual de WhatsApp:

**Código actual (WhatsApp Web):**
```typescript
// Generar y descargar el PDF primero
await downloadPresupuestoPDF(p, c, veh, config);
// Abrir WhatsApp con el mensaje
window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
```

**Código nuevo (WhatsApp Business API):**
```typescript
import { sendPresupuestoWhatsApp, isWhatsAppBusinessApiEnabled } from '../services/whatsappBusinessService';

if (isWhatsAppBusinessApiEnabled()) {
  // Usar WhatsApp Business API con adjunto
  const pdfUrl = await uploadPDFAndGetUrl(p, c, veh, config);
  await sendPresupuestoWhatsApp(phone, p.numero, c?.nombre, matricula, p.total, pdfUrl);
} else {
  // Usar alternativa de WhatsApp Web (sin adjunto)
  await downloadPresupuestoPDF(p, c, veh, config);
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
}
```

### Paso 4: Implementar Servidor de Archivos (Opcional)

Para usar la función de adjuntos, necesitas un servidor para almacenar los PDFs y generar URLs públicas. El servicio incluye una función `uploadFileForWhatsApp` que requiere implementación de backend.

Alternativa: Usa un servicio de almacenamiento en la nube como:
- AWS S3
- Google Cloud Storage
- Firebase Storage
- Supabase Storage

## Funciones Disponibles

### `isWhatsAppBusinessApiEnabled()`
Verifica si la integración está activada y configurada correctamente.

### `sendWhatsAppMessage(message)`
Envía un mensaje genérico (texto o documento).

### `sendPresupuestoWhatsApp(...)`
Envía un presupuesto con PDF adjunto.

### `sendFacturaWhatsApp(...)`
Envía una factura con PDF adjunto.

### `formatPhoneNumber(phone)`
Formatea números de teléfono al formato internacional.

### `checkWhatsAppBusinessConfig()`
Verifica la configuración y reporta variables faltantes.

## Costos y Limitaciones

- **Costos**: WhatsApp Business API puede tener costos según el volumen de mensajes enviados
- **Límites**: Hay límites de velocidad y restricciones de uso según el tipo de cuenta
- **Requisitos**: El número de teléfono debe estar verificado como WhatsApp Business

## Soporte

Para más información sobre WhatsApp Business API:
- [Documentación oficial](https://developers.facebook.com/docs/whatsapp/)
- [Consola de desarrolladores](https://developers.facebook.com/apps/)

## Nota de Seguridad

**IMPORTANTE**: Nunca commits el archivo `.env` con credenciales reales. Usa `.env.example` para las plantillas y añade `.env` a `.gitignore`.
