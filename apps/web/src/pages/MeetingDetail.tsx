import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  ArrowLeft,
  FileAudio,
  Calendar,
  Clock,
  Users,
  CheckSquare,
  FileText,
  Mic,
  Edit2,
  Check,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { PageLoading } from '../components/ui/LoadingSpinner';
import {
  getMeeting,
  updateActionItem,
  updateSpeakerName,
  type Meeting,
  type ActionItem,
  type TranscriptSegment,
} from '../lib/api';
import { formatDate, formatDuration, formatTime, cn } from '../lib/utils';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function MeetingDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    async function loadMeeting() {
      if (!id) return;
      try {
        setLoading(true);
        const data = await getMeeting(id);
        setMeeting(data);
      } catch (err) {
        console.error('Error loading meeting:', err);
        // Mock data for demo
        setMeeting({
          id: id!,
          title: 'Reunión de Ejemplo',
          status: 'completed',
          duration: 2400,
          speakers: ['María García', 'Juan Pérez', 'Ana López'],
          createdAt: new Date().toISOString(),
          summary: 'Esta reunión cubrió los avances del proyecto Q2, incluyendo la revisión de objetivos y la asignación de nuevas tareas. Se discutieron los principales bloqueos y se establecieron las prioridades para las próximas dos semanas.',
          actionItems: [
            { id: '1', text: 'Preparar presentación para el cliente', assignee: 'María García', dueDate: '2024-04-15', completed: false },
            { id: '2', text: 'Revisar presupuesto del proyecto', assignee: 'Juan Pérez', dueDate: '2024-04-10', completed: true },
            { id: '3', text: 'Coordinar con equipo de desarrollo', assignee: 'Ana López', dueDate: '2024-04-12', completed: false },
          ],
          transcript: [
            { id: '1', speaker: 'María García', text: 'Buenos días a todos. Vamos a comenzar la reunión de planificación del Q2.', startTime: 0, endTime: 8 },
            { id: '2', speaker: 'Juan Pérez', text: 'Perfecto. Tengo preparado el informe de avances del mes pasado.', startTime: 8, endTime: 15 },
            { id: '3', speaker: 'María García', text: 'Excelente. Antes de eso, quisiera revisar los objetivos que nos propusimos.', startTime: 15, endTime: 23 },
            { id: '4', speaker: 'Ana López', text: 'Claro. En desarrollo hemos completado el 80% de las tareas planificadas.', startTime: 23, endTime: 30 },
            { id: '5', speaker: 'Juan Pérez', text: 'El presupuesto está en línea con lo esperado. Solo tenemos un 5% de variación.', startTime: 30, endTime: 38 },
          ],
        });
      } finally {
        setLoading(false);
      }
    }
    loadMeeting();
  }, [id]);

  if (loading) {
    return <PageLoading message="Cargando reunión..." />;
  }

  if (!meeting) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">No se encontró la reunión</p>
        <Button variant="outline" onClick={() => navigate('/dashboard/meetings')} className="mt-4">
          Volver a reuniones
        </Button>
      </div>
    );
  }

  const statusColors = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'error',
  } as const;

  const statusLabels = {
    pending: 'Pendiente',
    processing: 'Procesando',
    completed: 'Completado',
    failed: 'Error',
  };

  // Calculate participation data
  const participationData = meeting.transcript
    ? meeting.speakers.map((speaker, index) => {
        const speakerSegments = meeting.transcript!.filter((s) => s.speaker === speaker);
        const totalTime = speakerSegments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
        return {
          name: speaker,
          value: totalTime,
          percentage: Math.round((totalTime / meeting.duration) * 100),
          color: COLORS[index % COLORS.length],
        };
      })
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Button variant="ghost" onClick={() => navigate('/dashboard/meetings')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver a reuniones
        </Button>

        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-primary/10 p-3">
              <FileAudio className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{meeting.title}</h1>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {formatDate(meeting.createdAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {formatDuration(meeting.duration)}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {meeting.speakers.length} participantes
                </span>
              </div>
            </div>
          </div>
          <Badge variant={statusColors[meeting.status]} className="self-start">
            {statusLabels[meeting.status]}
          </Badge>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="summary" className="gap-2">
              <FileText className="h-4 w-4" />
              Resumen
            </TabsTrigger>
            <TabsTrigger value="transcript" className="gap-2">
              <Mic className="h-4 w-4" />
              Transcripción
            </TabsTrigger>
            <TabsTrigger value="actions" className="gap-2">
              <CheckSquare className="h-4 w-4" />
              Action Items
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <Users className="h-4 w-4" />
              Oratoria
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <SummaryTab meeting={meeting} participationData={participationData} />
          </TabsContent>

          <TabsContent value="transcript">
            <TranscriptTab
              meeting={meeting}
              onSpeakerUpdate={(oldName, newName) => {
                if (id) {
                  updateSpeakerName(id, oldName, newName).catch(console.error);
                  setMeeting((prev) =>
                    prev
                      ? {
                          ...prev,
                          speakers: prev.speakers.map((s) => (s === oldName ? newName : s)),
                          transcript: prev.transcript?.map((t) =>
                            t.speaker === oldName ? { ...t, speaker: newName } : t
                          ),
                        }
                      : prev
                  );
                }
              }}
            />
          </TabsContent>

          <TabsContent value="actions">
            <ActionItemsTab
              meeting={meeting}
              onToggle={(itemId, completed) => {
                if (id) {
                  updateActionItem(id, itemId, { completed }).catch(console.error);
                  setMeeting((prev) =>
                    prev
                      ? {
                          ...prev,
                          actionItems: prev.actionItems?.map((item) =>
                            item.id === itemId ? { ...item, completed } : item
                          ),
                        }
                      : prev
                  );
                }
              }}
            />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsTab meeting={meeting} participationData={participationData} />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}

function SummaryTab({
  meeting,
  participationData,
}: {
  meeting: Meeting;
  participationData: any[];
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Resumen de la Reunión</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">
            {meeting.summary || 'No hay resumen disponible aún.'}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Participantes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {meeting.speakers.map((speaker, index) => {
              const data = participationData.find((p) => p.name === speaker);
              return (
                <div key={speaker} className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="flex-1">{speaker}</span>
                  {data && (
                    <span className="text-sm text-muted-foreground">{data.percentage}%</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {meeting.actionItems && meeting.actionItems.length > 0 && (
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Compromisos Destacados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {meeting.actionItems.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    'p-4 rounded-lg border',
                    item.completed && 'bg-green-50 border-green-200'
                  )}
                >
                  <p className={cn('font-medium', item.completed && 'line-through text-muted-foreground')}>
                    {item.text}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {item.assignee && <span>{item.assignee}</span>}
                    {item.dueDate && <span>• {formatDate(item.dueDate)}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function TranscriptTab({
  meeting,
  onSpeakerUpdate,
}: {
  meeting: Meeting;
  onSpeakerUpdate: (oldName: string, newName: string) => void;
}) {
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [playingSegment, setPlayingSegment] = useState<string | null>(null);

  const handleEditSpeaker = (speaker: string) => {
    setEditingSpeaker(speaker);
    setNewSpeakerName(speaker);
  };

  const handleSaveSpeaker = () => {
    if (editingSpeaker && newSpeakerName.trim() && newSpeakerName !== editingSpeaker) {
      onSpeakerUpdate(editingSpeaker, newSpeakerName.trim());
    }
    setEditingSpeaker(null);
    setNewSpeakerName('');
  };

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!meeting.transcript || meeting.transcript.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No hay transcripción disponible aún.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Speaker legend */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4">
            {meeting.speakers.map((speaker, index) => (
              <div key={speaker} className="flex items-center gap-2">
                {editingSpeaker === speaker ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <Input
                      value={newSpeakerName}
                      onChange={(e) => setNewSpeakerName(e.target.value)}
                      className="h-8 w-40"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={handleSaveSpeaker}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingSpeaker(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{speaker}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={() => handleEditSpeaker(speaker)}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Transcript */}
      <Card>
        <CardContent className="p-0 max-h-[600px] overflow-y-auto">
          <div className="divide-y">
            {meeting.transcript.map((segment, index) => {
              const speakerIndex = meeting.speakers.indexOf(segment.speaker);
              const isPlaying = playingSegment === segment.id;

              return (
                <motion.div
                  key={segment.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.02 }}
                  className="p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col items-center gap-1">
                      <button
                        className="text-muted-foreground hover:text-primary transition-colors"
                        onClick={() => setPlayingSegment(isPlaying ? null : segment.id)}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </button>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(segment.startTime)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: COLORS[speakerIndex % COLORS.length] || COLORS[0],
                          }}
                        />
                        <span className="font-medium text-sm">{segment.speaker}</span>
                      </div>
                      <p className="text-muted-foreground">{segment.text}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActionItemsTab({
  meeting,
  onToggle,
}: {
  meeting: Meeting;
  onToggle: (itemId: string, completed: boolean) => void;
}) {
  const actionItems = meeting.actionItems || [];
  const completedCount = actionItems.filter((item) => item.completed).length;

  if (actionItems.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No se identificaron action items en esta reunión.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Progress */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso</span>
            <span className="text-sm text-muted-foreground">
              {completedCount}/{actionItems.length} completados
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${(completedCount / actionItems.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardContent className="p-0 divide-y">
          {actionItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 flex items-start gap-4"
            >
              <button
                onClick={() => onToggle(item.id, !item.completed)}
                className={cn(
                  'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                  item.completed
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'border-gray-300 hover:border-primary'
                )}
              >
                {item.completed && <Check className="h-3 w-3" />}
              </button>
              <div className="flex-1">
                <p className={cn('font-medium', item.completed && 'line-through text-muted-foreground')}>
                  {item.text}
                </p>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  {item.assignee && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {item.assignee}
                    </span>
                  )}
                  {item.dueDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AnalyticsTab({
  meeting,
  participationData,
}: {
  meeting: Meeting;
  participationData: any[];
}) {
  // Calculate speaking stats
  const speakingStats = meeting.transcript
    ? meeting.speakers.map((speaker, index) => {
        const segments = meeting.transcript!.filter((s) => s.speaker === speaker);
        const totalWords = segments.reduce((acc, s) => acc + s.text.split(' ').length, 0);
        const totalTime = segments.reduce((acc, s) => acc + (s.endTime - s.startTime), 0);
        const wordsPerMinute = totalTime > 0 ? Math.round((totalWords / totalTime) * 60) : 0;

        return {
          name: speaker,
          words: totalWords,
          time: totalTime,
          wpm: wordsPerMinute,
          color: COLORS[index % COLORS.length],
        };
      })
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Participation pie chart */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución del Tiempo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={participationData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                >
                  {participationData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDuration(data.value)} ({data.percentage}%)
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Speaking speed chart */}
      <Card>
        <CardHeader>
          <CardTitle>Velocidad de Habla (palabras/min)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={speakingStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg shadow-lg p-3">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-sm text-muted-foreground">{data.wpm} palabras/min</p>
                          <p className="text-sm text-muted-foreground">{data.words} palabras totales</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="wpm" radius={[0, 4, 4, 0]}>
                  {speakingStats.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Stats summary */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Métricas por Participante</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Participante</th>
                  <th className="text-right py-3 px-4 font-medium">Tiempo</th>
                  <th className="text-right py-3 px-4 font-medium">Participación</th>
                  <th className="text-right py-3 px-4 font-medium">Palabras</th>
                  <th className="text-right py-3 px-4 font-medium">Velocidad</th>
                </tr>
              </thead>
              <tbody>
                {speakingStats.map((stat, index) => {
                  const participation = participationData.find((p) => p.name === stat.name);
                  return (
                    <tr key={stat.name} className="border-b last:border-0">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: stat.color }}
                          />
                          {stat.name}
                        </div>
                      </td>
                      <td className="text-right py-3 px-4 text-muted-foreground">
                        {formatDuration(stat.time)}
                      </td>
                      <td className="text-right py-3 px-4 text-muted-foreground">
                        {participation?.percentage || 0}%
                      </td>
                      <td className="text-right py-3 px-4 text-muted-foreground">{stat.words}</td>
                      <td className="text-right py-3 px-4 text-muted-foreground">{stat.wpm} p/m</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
