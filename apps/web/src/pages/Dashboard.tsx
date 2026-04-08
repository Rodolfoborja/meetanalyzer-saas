import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  FileAudio,
  Clock,
  CheckSquare,
  Plus,
  ArrowRight,
  TrendingUp,
  Calendar,
  Mic,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { PageLoading, EmptyState } from '../components/ui';
import { getDashboardStats, getUsageHistory, getRecentMeetings, type DashboardStats, type UsageHistory, type Meeting } from '../lib/api';
import { formatDate, formatDuration } from '../lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [_error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [statsData, usageData, meetingsData] = await Promise.all([
          getDashboardStats().catch(() => ({
            totalMeetings: 0,
            minutesUsed: 0,
            minutesLimit: 60,
            actionItemsTotal: 0,
            actionItemsCompleted: 0,
          })),
          getUsageHistory().catch(() => []),
          getRecentMeetings(5).catch(() => []),
        ]);
        setStats(statsData);
        setUsageHistory(usageData);
        setRecentMeetings(meetingsData);
      } catch (err) {
        setError('Error al cargar el dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <PageLoading message="Cargando dashboard..." />;
  }

  const usagePercentage = stats ? Math.round((stats.minutesUsed / stats.minutesLimit) * 100) : 0;
  const actionItemsPercentage = stats && stats.actionItemsTotal > 0
    ? Math.round((stats.actionItemsCompleted / stats.actionItemsTotal) * 100)
    : 0;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">
            Hola, {user?.name?.split(' ')[0] || 'Usuario'} 👋
          </h1>
          <p className="text-muted-foreground">
            Bienvenido a tu dashboard de MeetAnalyzer
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/meetings/new')}>
          <Plus className="h-4 w-4" />
          Nueva Reunión
        </Button>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Reuniones Totales"
          value={stats?.totalMeetings || 0}
          icon={<FileAudio className="h-5 w-5" />}
          description="en tu cuenta"
        />
        <StatsCard
          title="Minutos Usados"
          value={`${stats?.minutesUsed || 0}/${stats?.minutesLimit || 60}`}
          icon={<Clock className="h-5 w-5" />}
          description={`${usagePercentage}% del límite`}
          progress={usagePercentage}
        />
        <StatsCard
          title="Action Items"
          value={stats?.actionItemsTotal || 0}
          icon={<CheckSquare className="h-5 w-5" />}
          description={`${stats?.actionItemsCompleted || 0} completados`}
          progress={actionItemsPercentage}
          progressColor="bg-green-500"
        />
        <StatsCard
          title="Plan Actual"
          value={user?.organization?.plan || 'Free'}
          icon={<TrendingUp className="h-5 w-5" />}
          description={
            <Link to="/dashboard/settings" className="text-primary hover:underline">
              Ver planes →
            </Link>
          }
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Usage Chart */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                Uso de Minutos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {usageHistory.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={usageHistory}>
                      <defs>
                        <linearGradient id="colorMinutes" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(221.2 83.2% 53.3%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(date) => new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                        className="text-xs"
                      />
                      <YAxis className="text-xs" />
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            return (
                              <div className="bg-background border rounded-lg shadow-lg p-3">
                                <p className="text-sm font-medium">{formatDate(payload[0].payload.date)}</p>
                                <p className="text-sm text-muted-foreground">
                                  {payload[0].value} minutos
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="minutes"
                        stroke="hsl(221.2 83.2% 53.3%)"
                        fillOpacity={1}
                        fill="url(#colorMinutes)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center">
                  <p className="text-muted-foreground">No hay datos de uso aún</p>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <CardTitle>Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <QuickActionButton
                icon={<Plus className="h-5 w-5" />}
                label="Nueva Reunión"
                description="Sube una grabación"
                onClick={() => navigate('/dashboard/meetings/new')}
              />
              <QuickActionButton
                icon={<FileAudio className="h-5 w-5" />}
                label="Ver Reuniones"
                description="Todas tus grabaciones"
                onClick={() => navigate('/dashboard/meetings')}
              />
              <QuickActionButton
                icon={<Mic className="h-5 w-5" />}
                label="Grabar en Vivo"
                description="Próximamente"
                disabled
              />
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Meetings */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Reuniones Recientes</CardTitle>
            <Link to="/dashboard/meetings">
              <Button variant="ghost" size="sm">
                Ver todas <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentMeetings.length > 0 ? (
              <div className="space-y-4">
                {recentMeetings.map((meeting) => (
                  <MeetingRow key={meeting.id} meeting={meeting} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="meetings"
                title="No hay reuniones aún"
                description="Sube tu primera grabación para comenzar a analizar."
                actionLabel="Nueva Reunión"
                onAction={() => navigate('/dashboard/meetings/new')}
              />
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description: React.ReactNode;
  progress?: number;
  progressColor?: string;
}

function StatsCard({ title, value, icon, description, progress, progressColor = 'bg-primary' }: StatsCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <p className="text-2xl font-bold mb-1">{value}</p>
        {progress !== undefined && (
          <div className="w-full bg-muted rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full transition-all ${progressColor}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        )}
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

interface QuickActionButtonProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick?: () => void;
  disabled?: boolean;
}

function QuickActionButton({ icon, label, description, onClick, disabled }: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <div className="rounded-full bg-primary/10 p-2 text-primary">{icon}</div>
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function MeetingRow({ meeting }: { meeting: Meeting }) {
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

  return (
    <Link
      to={`/dashboard/meetings/${meeting.id}`}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div className="rounded-full bg-primary/10 p-2">
        <FileAudio className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{meeting.title}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(meeting.createdAt)} • {formatDuration(meeting.duration)}
        </p>
      </div>
      <Badge variant={statusColors[meeting.status]}>{statusLabels[meeting.status]}</Badge>
    </Link>
  );
}
