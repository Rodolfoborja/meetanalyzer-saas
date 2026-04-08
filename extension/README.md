# 🎙️ Romelly AI - Chrome Extension

Extensión de Chrome para transcribir y analizar reuniones en tiempo real.

## ✨ Características

- 🎤 Captura audio de Google Meet, Teams, Zoom
- 📝 Transcripción automática con Gemini
- 🤖 Análisis con IA (resumen, action items)
- ⚡ Procesamiento en tiempo real via WebSocket

## 📦 Instalación (Desarrollo)

1. Abre Chrome y ve a `chrome://extensions/`
2. Activa "Modo desarrollador" (esquina superior derecha)
3. Click "Cargar descomprimida"
4. Selecciona la carpeta `extension/`

## 🚀 Uso

1. Abre una reunión en Google Meet, Teams o Zoom
2. Click en el icono de Romelly AI
3. Inicia sesión si es necesario
4. Click "Iniciar Grabación"
5. La extensión captura el audio de la reunión
6. Click "Detener y Analizar" cuando termine
7. Ve los resultados en el dashboard

## 🔧 Configuración

Edita `src/popup.js` para cambiar:
- `API_URL`: URL de tu backend
- `WS_URL`: URL del WebSocket

## 📁 Estructura

```
extension/
├── manifest.json      # Configuración de la extensión
├── popup.html         # UI del popup
├── src/
│   ├── popup.js       # Lógica del popup
│   ├── background.js  # Service worker
│   └── content.js     # Script en páginas de meeting
└── icons/             # Iconos de la extensión
```

## 🔐 Permisos

- `tabCapture`: Capturar audio del tab
- `storage`: Guardar token de autenticación
- `activeTab`: Acceder al tab actual

## 📝 Notas

- Requiere Chrome 88+
- El audio se envía a tu servidor via WebSocket
- No se almacena audio localmente
