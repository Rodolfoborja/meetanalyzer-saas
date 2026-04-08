import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/auth';

export default function Dashboard() {
  const { user } = useAuthStore();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6"
    >
      <h1 className="text-3xl font-bold mb-2">
        Hola, {user?.name || 'Usuario'} 👋
      </h1>
      <p className="text-gray-600 mb-8">
        Bienvenido a tu dashboard de MeetAnalyzer
      </p>

      {/* Stats placeholder */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Reuniones" value="0" />
        <StatCard title="Minutos Analizados" value="0" />
        <StatCard title="Action Items" value="0" />
      </div>

      {/* Empty state */}
      <div className="bg-white rounded-xl border p-12 text-center">
        <h2 className="text-xl font-semibold mb-2">No hay reuniones aún</h2>
        <p className="text-gray-600 mb-4">
          Sube tu primera grabación para comenzar a analizar.
        </p>
        <a
          href="/dashboard/meetings/new"
          className="inline-block bg-primary text-white px-6 py-2 rounded-lg"
        >
          Nueva Reunión
        </a>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border p-6">
      <p className="text-gray-600 text-sm">{title}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}
