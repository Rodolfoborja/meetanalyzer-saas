import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mic, ArrowRight, CheckCircle, Zap, Users, BarChart3 } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">MeetAnalyzer</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-gray-600 hover:text-gray-900">
              Iniciar sesión
            </Link>
            <Link
              to="/login"
              className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90 transition"
            >
              Comenzar gratis
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Transforma tus reuniones en
            <span className="text-primary"> insights accionables</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Transcribe automáticamente, identifica hablantes, genera resúmenes
            inteligentes y extrae compromisos de todas tus reuniones virtuales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-primary text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-primary/90 transition flex items-center justify-center gap-2"
            >
              Empezar gratis <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="grid md:grid-cols-3 gap-8"
        >
          <FeatureCard
            icon={<Zap className="h-8 w-8" />}
            title="Transcripción Automática"
            description="IA que identifica quién habla y transcribe con precisión."
          />
          <FeatureCard
            icon={<CheckCircle className="h-8 w-8" />}
            title="Action Items"
            description="Extrae automáticamente tareas, asignados y deadlines."
          />
          <FeatureCard
            icon={<BarChart3 className="h-8 w-8" />}
            title="Métricas de Oratoria"
            description="Analiza participación, velocidad y claridad."
          />
        </motion.div>
      </section>

      {/* Pricing */}
      <section className="bg-gray-50 py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Planes</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              features={['60 min/mes', '1 usuario', 'Análisis básico']}
            />
            <PricingCard
              name="Starter"
              price="$19"
              features={['300 min/mes', '5 usuarios', 'Email reports', 'API access']}
              popular
            />
            <PricingCard
              name="Pro"
              price="$49"
              features={['1000 min/mes', '20 usuarios', 'Todo en Starter', 'Soporte prioritario']}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>© 2024 MeetAnalyzer. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white p-6 rounded-xl border shadow-sm"
    >
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}

function PricingCard({ name, price, features, popular }: { name: string; price: string; features: string[]; popular?: boolean }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-white p-6 rounded-xl border-2 ${popular ? 'border-primary' : 'border-gray-200'}`}
    >
      {popular && (
        <span className="bg-primary text-white text-xs px-2 py-1 rounded-full">Popular</span>
      )}
      <h3 className="text-2xl font-bold mt-4">{name}</h3>
      <p className="text-4xl font-bold my-4">{price}<span className="text-lg text-gray-500">/mes</span></p>
      <ul className="space-y-2 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" /> {f}
          </li>
        ))}
      </ul>
      <Link
        to="/login"
        className={`block text-center py-2 rounded-lg ${popular ? 'bg-primary text-white' : 'border border-gray-300'}`}
      >
        Comenzar
      </Link>
    </motion.div>
  );
}
