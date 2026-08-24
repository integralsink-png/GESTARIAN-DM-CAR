/**
 * WhatsApp Business API Service
 * 
 * Este servicio está preparado para integración con WhatsApp Business API
 * para enviar mensajes con archivos adjuntos directamente.
 * 
 * REQUISITOS PARA ACTIVACIÓN:
 * 1. Cuenta de WhatsApp Business API (Meta for Developers)
 * 2. Phone number ID y Access Token
 * 3. Configurar las variables de entorno en .env
 * 4. Instalar dependencias necesarias (si se requiere backend)
 * 
 * NOTA: Este servicio está DESACTIVADO por defecto. Para activarlo,
 * establecer USE_WHATSAPP_BUSINESS_API=true en las variables de entorno
 * y configurar las credenciales correspondientes.
 */

interface WhatsAppBusinessConfig {
  phoneNumberId: string;
  accessToken: string;
  apiVersion: string;
  baseUrl: string;
}

interface WhatsAppMessage {
  to: string;
  text?: string;
  documentUrl?: string;
  documentFilename?: string;
  documentCaption?: string;
}

interface WhatsAppResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Configuración por defecto (desactivada)
const DEFAULT_CONFIG: WhatsAppBusinessConfig = {
  phoneNumberId: '',
  accessToken: '',
  apiVersion: 'v18.0',
  baseUrl: 'https://graph.facebook.com',
};

/**
 * Verifica si la integración de WhatsApp Business API está activada
 */
export function isWhatsAppBusinessApiEnabled(): boolean {
  return process.env.VITE_USE_WHATSAPP_BUSINESS_API === 'true' && 
         !!process.env.VITE_WHATSAPP_PHONE_NUMBER_ID && 
         !!process.env.VITE_WHATSAPP_ACCESS_TOKEN;
}

/**
 * Obtiene la configuración de WhatsApp Business API desde variables de entorno
 */
function getWhatsAppConfig(): WhatsAppBusinessConfig {
  return {
    phoneNumberId: process.env.VITE_WHATSAPP_PHONE_NUMBER_ID || DEFAULT_CONFIG.phoneNumberId,
    accessToken: process.env.VITE_WHATSAPP_ACCESS_TOKEN || DEFAULT_CONFIG.accessToken,
    apiVersion: process.env.VITE_WHATSAPP_API_VERSION || DEFAULT_CONFIG.apiVersion,
    baseUrl: process.env.VITE_WHATSAPP_BASE_URL || DEFAULT_CONFIG.baseUrl,
  };
}

/**
 * Envía un mensaje de texto a través de WhatsApp Business API (o simula en consola)
 */
export async function enviarMensajeWhatsApp(numero: string, mensaje: string): Promise<WhatsAppResponse> {
  console.log(`💬 [WHATSAPP BUSINESS - PREPARADO]: Enviando a ${numero}\nMensaje: ${mensaje}`)
  return {
    success: true,
    messageId: `wa_mock_${Date.now()}`
  }
}

/**
 * Envía un mensaje de texto a través de WhatsApp Business API (Implementación completa)
 */
export async function sendWhatsAppMessage(message: WhatsAppMessage): Promise<WhatsAppResponse> {
  if (!isWhatsAppBusinessApiEnabled()) {
    return {
      success: false,
      error: 'WhatsApp Business API no está configurado. Use la alternativa de WhatsApp Web.',
    };
  }

  const config = getWhatsAppConfig();

  try {
    const payload: any = {
      messaging_product: 'whatsapp',
      to: message.to,
      type: message.documentUrl ? 'document' : 'text',
    };

    if (message.text) {
      payload.text = { body: message.text };
    }

    if (message.documentUrl) {
      payload.document = {
        link: message.documentUrl,
        filename: message.documentFilename || 'documento.pdf',
        caption: message.documentCaption || message.text || '',
      };
    }

    const response = await fetch(
      `${config.baseUrl}/${config.apiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (response.ok) {
      return {
        success: true,
        messageId: data.messages?.[0]?.id,
      };
    } else {
      return {
        success: false,
        error: data.error?.message || 'Error desconocido al enviar mensaje',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error de conexión',
    };
  }
}

/**
 * Envía un presupuesto por WhatsApp con el PDF adjunto
 */
export async function sendPresupuestoWhatsApp(
  phoneNumber: string,
  presupuestoNumero: string,
  clienteNombre: string,
  matricula: string,
  total: number,
  pdfUrl: string
): Promise<WhatsAppResponse> {
  const message = `Hola ${clienteNombre}, le informamos que su presupuesto ${presupuestoNumero} para el vehículo ${matricula} está disponible por un importe de ${total.toFixed(2)}€. Adjunto el PDF del presupuesto. Puede contactarnos para cualquier duda. Saludos, DM CAR`;

  return sendWhatsAppMessage({
    to: phoneNumber,
    text: message,
    documentUrl: pdfUrl,
    documentFilename: `Presupuesto_${presupuestoNumero}.pdf`,
    documentCaption: message,
  });
}

/**
 * Envía una factura por WhatsApp con el PDF adjunto
 */
export async function sendFacturaWhatsApp(
  phoneNumber: string,
  facturaNumero: string,
  clienteNombre: string,
  matricula: string,
  total: number,
  pendiente: number,
  pdfUrl: string
): Promise<WhatsAppResponse> {
  const message = `Hola ${clienteNombre}, le informamos que su factura ${facturaNumero} para el vehículo ${matricula} ha sido emitida. Importe total: ${total.toFixed(2)}€. Importe pendiente: ${pendiente.toFixed(2)}€. Adjunto el PDF de la factura. Puede realizar el pago contactándonos. Saludos, DM CAR`;

  return sendWhatsAppMessage({
    to: phoneNumber,
    text: message,
    documentUrl: pdfUrl,
    documentFilename: `Factura_${facturaNumero}.pdf`,
    documentCaption: message,
  });
}

/**
 * Sube un archivo a un servidor temporal para obtener una URL pública
 * (Requiere implementación de backend para almacenamiento de archivos)
 */
export async function uploadFileForWhatsApp(file: File): Promise<string> {
  // Esta función requiere un backend para almacenar el archivo y devolver una URL pública
  // Por ahora, devuelve una URL placeholder
  console.warn('uploadFileForWhatsApp requiere implementación de backend');
  return 'https://example.com/temp-file-url';
}

/**
 * Convierte un PDF a base64 para envío (alternativa si no hay servidor de archivos)
 */
export function pdfToBase64(pdfBlob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(pdfBlob);
  });
}

/**
 * Función de utilidad para formatear números de teléfono
 */
export function formatPhoneNumber(phone: string): string {
  // Eliminar espacios y caracteres especiales
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  
  // Asegurar que tenga el código de país (ej: +34 para España)
  if (!cleaned.startsWith('+')) {
    // Asumir código de país español si no está presente
    return cleaned.startsWith('34') ? `+${cleaned}` : `+34${cleaned}`;
  }
  
  return cleaned;
}

/**
 * Verifica la configuración de WhatsApp Business API
 */
export function checkWhatsAppBusinessConfig(): {
  enabled: boolean;
  config: Partial<WhatsAppBusinessConfig>;
  missing: string[];
} {
  const missing: string[] = [];
  
  if (!process.env.VITE_WHATSAPP_PHONE_NUMBER_ID) {
    missing.push('VITE_WHATSAPP_PHONE_NUMBER_ID');
  }
  if (!process.env.VITE_WHATSAPP_ACCESS_TOKEN) {
    missing.push('VITE_WHATSAPP_ACCESS_TOKEN');
  }
  
  return {
    enabled: isWhatsAppBusinessApiEnabled(),
    config: getWhatsAppConfig(),
    missing,
  };
}
