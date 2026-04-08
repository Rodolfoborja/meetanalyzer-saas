import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  FileAudio,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Users,
  MoreVertical,
  Trash2,
  Eye,
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { PageLoading, EmptyState } from '../components/ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Modal';
import { getMeetings, deleteMeeting, type Meeting, type MeetingsPaginated } from '../lib/api';
import { formatDate, formatDuration, cn } from '../lib/utils';

const statusFilters = [
  { value: '', label: 'Todos' },
  { value: 'completed', label: 'Completados' },
  { value: 'processing', label: 'Procesando' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'failed', label: 'Fallidos' },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, x: -20 },
};

export default function Meetings() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData] = useState<MeetingsPaginated | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 10;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Load meetings
  useEffect(() => {
    async function loadMeetings() {
      try {
        setLoading(true);
        const result = await getMeetings({
          page,
          limit,
          search: debouncedSearch || undefined,
          status: statusFilter || undefined,
          sort: '-createdAt',
        }).catch(() => ({
          data: [],
          total: 0,
          page: 1,
          limit,
          totalPages: 0,
        }));
        setData(result);
      } catch (err) {
        console.error('Error loading meetings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadMeetings();
  }, [page, debouncedSearch, statusFilter]);

  // Update URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set('search', debouncedSearch);
    if (statusFilter) params.set('status', statusFilter);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [debouncedSearch, statusFilter, page, setSearchParams]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const handleDelete = async () => {
    if (!meetingToDelete) return;
    try {
      setDeleting(true);
      await deleteMeeting(meetingToDelete.id);
      setData((prev) =>
        prev
          ? {
              ...prev,
              data: prev.data.filter((m) => m.id !== meetingToDelete.id),
              total: prev.total - 1,
            }
          : prev
      );
      setDeleteModalOpen(false);
      setMeetingToDelete(null);
    } catch (err) {
      console.error('Error deleting meeting:', err);
    } finally {
      setDeleting(false);
    }
  };

  const meetings = data?.data || [];
  const totalPages = data?.totalPages || 0;
  const total = data?.total || 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold">Reuniones</h1>
          <p className="text-muted-foreground">
            {total > 0 ? `${total} reuniones en total` : 'Gestiona tus grabaciones'}
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/meetings/new')}>
          <Plus className="h-4 w-4" />
          Nueva Reunión
        </Button>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar reuniones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.value)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {loading ? (
        <PageLoading message="Cargando reuniones..." />
      ) : meetings.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <EmptyState
              icon={debouncedSearch || statusFilter ? 'search' : 'meetings'}
              title={
                debouncedSearch || statusFilter
                  ? 'Sin resultados'
                  : 'No hay reuniones aún'
              }
              description={
                debouncedSearch || statusFilter
                  ? 'Intenta con otros filtros o términos de búsqueda.'
                  : 'Sube tu primera grabación para comenzar a analizar.'
              }
              actionLabel={!debouncedSearch && !statusFilter ? 'Nueva Reunión' : undefined}
              onAction={
                !debouncedSearch && !statusFilter
                  ? () => navigate('/dashboard/meetings/new')
                  : undefined
              }
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {meetings.map((meeting) => (
                <MeetingCard
                  key={meeting.id}
                  meeting={meeting}
                  onDelete={() => {
                    setMeetingToDelete(meeting);
                    setDeleteModalOpen(true);
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-between"
            >
              <p className="text-sm text-muted-foreground">
                Mostrando {(page - 1) * limit + 1}-{Math.min(page * limit, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                    }
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setPage(pageNum)}
                        className="w-9"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Delete Modal */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar reunión</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar "{meetingToDelete?.title}"? Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} loading={deleting}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface MeetingCardProps {
  meeting: Meeting;
  onDelete: () => void;
}

function MeetingCard({ meeting, onDelete }: MeetingCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

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
    <motion.div
      variants={itemVariants}
      layout
      className="group"
    >
      <Card className="hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden">
        <CardContent className="p-0">
          {/* Status indicator bar */}
          <div
            className={cn(
              'h-1 w-full',
              meeting.status === 'completed' && 'bg-green-500',
              meeting.status === 'processing' && 'bg-blue-500',
              meeting.status === 'pending' && 'bg-yellow-500',
              meeting.status === 'failed' && 'bg-red-500'
            )}
          />
          <div
            className="p-4"
            onClick={() => navigate(`/dashboard/meetings/${meeting.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <FileAudio className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold truncate max-w-[180px]">{meeting.title}</h3>
                  <Badge variant={statusColors[meeting.status]} className="mt-1">
                    {statusLabels[meeting.status]}
                  </Badge>
                </div>
              </div>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                {menuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border py-1 z-20 min-w-[140px]">
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted w-full"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/dashboard/meetings/${meeting.id}`);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                        Ver detalle
                      </button>
                      <button
                        className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted w-full text-red-600"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onDelete();
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(meeting.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatDuration(meeting.duration)}</span>
              </div>
              {meeting.speakers && meeting.speakers.length > 0 && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{meeting.speakers.length} participantes</span>
                </div>
              )}
            </div>

            {meeting.summary && (
              <p className="mt-3 text-sm text-muted-foreground line-clamp-2">{meeting.summary}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
