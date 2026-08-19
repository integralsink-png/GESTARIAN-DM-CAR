# FICHA TÉCNICA Y ARQUITECTURA DEL SISTEMA: GESTARIAN DM CAR

**Versión del Sistema:** 0.1.0  
**Entorno de Producción:** [https://gestarian2.web.app](https://gestarian2.web.app)  
**Repositorio Oficial:** [GitHub: integralsink-png/GESTARIAN-DM-CAR](https://github.com/integralsink-png/GESTARIAN-DM-CAR.git)  
**Propósito:** ERP / Software Integral de Gestión de Talleres Mecánicos, Citas, Clientes, Vehículos, Presupuestos A4, Facturación, Expedientes Fotográficos e Inteligencia Artificial Asistida (METIS).

---

## 1. STACK TECNOLÓGICO Y HERRAMIENTAS DE DESARROLLO

### A. Frontend (Interfaz y Experiencia de Usuario)
- **Lenguaje Principal:** TypeScript 5.7.3 & JavaScript ECMAScript Moderno.
- **Framework React:** React 19 (`react` & `react-dom` 19.0.0).
- **Enrutamiento SPA:** React Router DOM v7 (`react-router-dom` 7.1.1).
- **Motor de Animaciones:** Framer Motion 12 (`framer-motion` 12.43.0) para dropdowns escalonados, modales fluidos y transiciones micro-animadas.
- **Diseño y Estilos:** TailwindCSS 3.4.17 + Vanilla CSS personalizado, sistema de diseño Glassmorphism oscuro / Dark Mode de alta gama con componentes responsivos (móvil, tablet y escritorio).
- **Iconografía Vectorial:** Lucide React (`lucide-react` 0.469.0) y componentes SVG vectoriales propios (`CustomIcons.tsx`).
- **Visualización y Gráficos:** Recharts (`recharts` 3.10.1) para paneles de balance, ingresos y analítica financiera.

### B. Backend, Base de Datos y Autenticación
- **BaaS (Backend as a Service):** Supabase (`@supabase/supabase-js` 2.49.4).
- **Base de Datos:** PostgreSQL en la nube con Row Level Security (RLS) habilitado.
- **Almacenamiento de Archivos:** Supabase Storage (para fotos de vehículos, peritajes, fotos de averías y archivos adjuntos).
- **Control de Acceso:** Claves de API anónimas y de servicio, autenticación multi-usuario con asignación de talleres.

### C. Inteligencia Artificial, OCR y Procesamiento de Lenguaje
- **Asistente Virtual METIS:** Motor autónomo de acciones (`metisAiEngine.ts`, `executeMetisAction.ts`).
- **Modelos IA Integrados:**
  - Google Gemini AI (`@google/generative-ai` 0.24.1).
  - OpenAI GPT (`openai` 7.2.0).
- **Reconocimiento Óptico de Caracteres (OCR):** Tesseract.js 7.0.0 (`tesseract.js`) para lectura automatizada de facturas de proveedores, albaranes y fichas técnicas.
- **Dictado por Voz y Procesamiento de Audio:** Web Speech API + analizador léxico (`useVoice.ts`) para autocompletado de presupuestos mediante dictado en tiempo real.

### D. Generación de Documentos y Comunicación
- **Generación PDF A4:** jsPDF 4.2.1 (`jspdf`) y `html2pdf.js` para presupuestos y facturas en formato vectorial listo para imprimir o enviar.
- **Integración de Comunicaciones:**
  - **WhatsApp API / Web:** Compartición directa de documentos y enlace de seguimiento al cliente (`documentShareService.ts`).
  - **Email:** Envío directo de PDFs por correo electrónico corporativo.

---

## 2. FLUJO DE TRABAJO: DISEÑO, DESARROLLO, BUILD Y DESPLIEGUE

```
+------------------+      +-------------------+      +--------------------+
|     DISEÑO       | ---> |    DESARROLLO     | ---> |    COMPILACIÓN     |
| Tailwind + Icons |      | React 19 + TS 5.7 |      | Vite 5.4.11 Bundle |
+------------------+      +-------------------+      +--------------------+
                                                                |
                                                                v
+------------------+      +-------------------+      +--------------------+
|  PRODUCCIÓN WEB  | <--- |   FIREBASE HOST   | <--- |    GIT CONTROL     |
| gestarian2.web   |      |  Deploy Hosting   |      |   GitHub origin    |
+------------------+      +-------------------+      +--------------------+
```

1. **Entorno Local de Desarrollo:** Servidor de alta velocidad Vite (`npm run dev`) con soporte multi-dispositivo vía red local WiFi (`http://192.168.100.14:5173/`).
2. **Control de Versiones:** Git con repositorio centralizado en GitHub.
3. **Build de Producción:** Rollup / Vite (`npm run build`) generando paquetes optimizados y divididos por chunks (`dist/`).
4. **Despliegue Continuo:** Firebase Hosting (`firebase deploy --only hosting`) con soporte HTTPS global, caché optimizada y enrutamiento SPA automático (`rewrites` hacia `index.html`).

---

## 3. ESPECIFICACIÓN DE MÓDULOS PRINCIPALES

| Módulo | Ruta | Funcionalidades Clave |
| :--- | :--- | :--- |
| **Clientes** | `/clientes` | Ficha técnica, vehículos asociados, historial de presupuestos con borde de estado de 3px, acceso a fotos. |
| **Citas** | `/citas` | Calendario interactivo, estado de citas, asignación rápida de cliente y vehículo. |
| **Reparaciones** | `/reparaciones` | Órdenes de trabajo, estado de reparación en tiempo real, enlace directo a presupuestos A4 (botón P). |
| **Presupuestos** | `/presupuestos` | Hoja A4 interactiva, dictado por voz, cálculo de IVA, historial por cliente con borde inteligente (azul > naranja > verde), envío por Email y WhatsApp sin demoras. |
| **Facturas** | `/facturas` | Facturación oficial con serie, desglose fiscal, control de cobros y abonos, escáner OCR de facturas. |
| **Expedientes** | `/expedientes` | Visualizador fotográfico global antes/después del trabajo mecánico y peritaje. |
| **Balances** | `/balances` | Analítica económica, gráficas de facturación, gastos e impuestos calculados. |
| **Metis (IA)** | Flotante | Asistente conversacional para ejecución de comandos, búsqueda y automatización de tareas. |
