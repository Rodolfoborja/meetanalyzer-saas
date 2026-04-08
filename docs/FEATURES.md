# 🚀 Romelly AI - Feature Overview

## Core Features

### 📝 Transcripción Inteligente (Gemini 1.5)
- **Audio directo a texto** - Sin servicios externos
- **Detección de hablantes** - Identifica quién dijo qué
- **Multilenguaje** - Español, inglés y más
- **Alta precisión** - Powered by Gemini 1.5 Pro

### 🧠 Análisis con IA
- **Resumen ejecutivo** - Esencia de la reunión en segundos
- **Puntos clave** - Lo más importante, estructurado
- **Decisiones** - Acuerdos tomados, explícitos e implícitos
- **Follow-ups** - Temas pendientes para la próxima

---

## 🆕 Innovaciones 2026

### 🤖 AI Meeting Assistant
> "Chatear con tu reunión"

Haz preguntas sobre cualquier reunión:
- "¿Qué dijo Juan sobre el deadline?"
- "¿Cuáles fueron las objeciones al plan B?"
- "Resume solo lo que dijo María"

**Incluye citas** con timestamp exacto.

```
POST /meetings/:id/chat
{
  "question": "¿Qué compromisos asumió cada persona?"
}
```

### 🎯 Action Item Tracking
> "De la reunión al tablero en segundos"

- **Extracción automática** de tareas mencionadas
- **Asignación** de responsables detectada por IA
- **Estados**: Pending → In Progress → Completed
- **Prioridades**: Urgent, High, Medium, Low
- **Fechas límite** extraídas del contexto
- **Sincronización** con Linear, Notion, Jira

```
GET /action-items?status=PENDING&priority=HIGH
GET /action-items/mine
GET /action-items/overdue
```

### 💬 Sentiment Analysis
> "El pulso emocional de tu equipo"

- **Score general** de la reunión (-1 a 1)
- **Tendencia**: Improving, Declining, Stable
- **Por participante** - Quién está frustrado, motivado
- **Momentos clave** - Detecta picos emocionales

```json
{
  "overall": 0.3,
  "trend": "improving",
  "bySpeaker": {
    "María": 0.6,
    "Pedro": -0.2
  },
  "keyMoments": [{
    "timestamp": 847,
    "sentiment": -0.7,
    "trigger": "discusión sobre retrasos"
  }]
}
```

### 🔍 Semantic Search
> "Encuentra cualquier cosa que se haya dicho"

- **Vector embeddings** con Gemini
- **Búsqueda por significado**, no solo keywords
- **Cross-meeting** - Busca en todas tus reuniones
- **Filtros** por fecha, participante, tema

```
GET /search?q=preocupaciones+sobre+el+presupuesto
GET /search/trending?days=30
```

### 📊 AI Coaching
> "Mejora tu comunicación profesional"

**Reportes personalizados:**
- Participación promedio en reuniones
- Ritmo de habla (palabras/minuto)
- Uso de muletillas
- Sentimiento que proyectas

**Feedback por reunión:**
- Score de desempeño (0-100)
- Highlights y fortalezas
- Áreas de mejora
- Comparación con promedio del equipo

```
GET /coaching/report?days=30
GET /coaching/meetings/:id/feedback
GET /coaching/tips
```

### 📝 Meeting Templates
> "Reuniones con estructura"

Templates inteligentes:
- **1:1 Meeting** - Manager + direct report
- **Daily Standup** - Ayer, hoy, bloqueos
- **Sprint Planning** - Goals, estimación, capacidad
- **Retrospective** - Bien, mejorar, experimentos
- **Brainstorming** - Ideas, votación, decisión
- **Client Call** - Feedback, compromisos
- **Interview** - Evaluación de candidato

Cada template incluye:
- Agenda sugerida
- Reglas de extracción personalizadas
- Prompts optimizados para el tipo de reunión

```
GET /templates
POST /meetings { "templateId": "ONE_ON_ONE" }
```

### 🔗 Integrations

**Webhooks:**
- `MEETING_COMPLETED`
- `ACTION_ITEM_CREATED`
- `ACTION_ITEM_COMPLETED`
- `ANALYSIS_READY`

**Slack:**
- Notificaciones automáticas
- Resúmenes al canal del equipo

**Notion:**
- Exporta reuniones como páginas
- Sincroniza con tu base de datos

**Linear:**
- Crea issues desde action items
- Sincronización bidireccional

**Google Calendar:**
- (Próximamente) Auto-join a reuniones

### 📤 Export Options

- **Markdown** - Listo para docs
- **JSON** - Para integraciones
- **Notion** - Página estructurada
- **Linear** - Action items como issues
- **Share Link** - URL pública limitada

```
GET /meetings/:id/export/markdown
GET /meetings/:id/export/json
POST /meetings/:id/export/notion
POST /meetings/:id/export/linear
POST /meetings/:id/export/share
```

---

## API Highlights

### Autenticación
```bash
# Login con Google
GET /auth/google

# Obtener usuario actual
GET /users/me
```

### Reuniones
```bash
# Subir y procesar
POST /meetings (multipart/form-data)

# Listar
GET /meetings?status=COMPLETED

# Detalle con todo
GET /meetings/:id?include=transcript,analysis,actionItems
```

### Organizaciones
```bash
# Invitar usuarios
POST /organizations/invite

# Gestionar roles
PUT /organizations/members/:id/role
```

---

## Tech Stack

| Componente | Tecnología |
|------------|------------|
| Backend | NestJS + TypeScript |
| Frontend | React + Vite + Tailwind |
| Database | PostgreSQL + Prisma |
| Queue | Redis + Bull |
| AI | Gemini 1.5 Pro/Flash |
| Auth | Google OAuth + JWT |
| Billing | Stripe |
| Realtime | WebSockets |

---

## Roadmap 2026

- [ ] **Recording Bot** - Auto-join a Google Meet/Zoom
- [ ] **Mobile App** - iOS/Android nativo
- [ ] **Voice Commands** - "Hey Romelly, resume la última reunión"
- [ ] **Team Analytics** - Dashboards de equipo
- [ ] **Custom AI Training** - Fine-tuning por organización
- [ ] **Calendar Insights** - Análisis de patrones de reuniones

---

*Romelly AI - Tus reuniones trabajan. Tú decides.* 🦉
