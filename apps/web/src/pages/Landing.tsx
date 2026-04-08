import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Mic,
  ArrowRight,
  CheckCircle,
  Zap,
  BarChart3,
  FileText,
  Clock,
  Shield,
  Star,
  ChevronDown,
  Play,
  Sparkles,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useState } from 'react';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Landing() {
  const { scrollYProgress } = useScroll();
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <Mic className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold">MeetAnalyzer</span>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <Link to="/login" className="text-gray-600 hover:text-gray-900 hidden sm:block">
                Iniciar sesión
              </Link>
              <Link to="/login">
                <Button>Comenzar gratis</Button>
              </Link>
            </motion.div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 relative">
        {/* Background decoration */}
        <motion.div
          style={{ y }}
          className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
        />
        <motion.div
          style={{ y: useTransform(scrollYProgress, [0, 1], [0, -100]) }}
          className="absolute top-40 right-10 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl"
        />

        <div className="container mx-auto px-4 text-center relative">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={containerVariants}
          >
            <motion.div variants={itemVariants} className="mb-6">
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Sparkles className="h-4 w-4" />
                Potenciado por IA avanzada
              </span>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight"
            >
              Transforma tus reuniones en
              <br />
              <span className="text-primary bg-clip-text">insights accionables</span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
            >
              Transcribe automáticamente, identifica hablantes, genera resúmenes
              inteligentes y extrae compromisos de todas tus reuniones virtuales.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-col sm:flex-row gap-4 justify-center mb-12"
            >
              <Link to="/login">
                <Button size="lg" className="text-lg px-8">
                  Empezar gratis <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8">
                <Play className="h-5 w-5 mr-2" /> Ver demo
              </Button>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="flex items-center justify-center gap-8 text-sm text-gray-500"
            >
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Sin tarjeta de crédito
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                60 minutos gratis/mes
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Cancela cuando quieras
              </span>
            </motion.div>
          </motion.div>

          {/* Hero image placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-16 relative"
          >
            <div className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl shadow-2xl p-2 max-w-4xl mx-auto">
              <div className="bg-gray-900 rounded-lg p-4">
                <div className="flex gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="aspect-video bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                  <div className="text-center text-white/70">
                    <Mic className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg">Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Todo lo que necesitas</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Herramientas potentes para transformar cómo trabajas con tus reuniones
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={containerVariants}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="Transcripción Automática"
              description="IA avanzada que identifica quién habla y transcribe con alta precisión en múltiples idiomas."
              color="blue"
            />
            <FeatureCard
              icon={<CheckCircle className="h-8 w-8" />}
              title="Action Items"
              description="Extrae automáticamente tareas, asignados y deadlines. Nunca pierdas un compromiso."
              color="green"
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Métricas de Oratoria"
              description="Analiza participación, velocidad de habla y patrones de comunicación del equipo."
              color="purple"
            />
            <FeatureCard
              icon={<FileText className="h-8 w-8" />}
              title="Resúmenes Inteligentes"
              description="Obtén el contexto clave de cualquier reunión en segundos con resúmenes generados por IA."
              color="orange"
            />
            <FeatureCard
              icon={<Clock className="h-8 w-8" />}
              title="Timeline Interactivo"
              description="Navega la transcripción con timestamps. Salta a cualquier momento de la conversación."
              color="pink"
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Seguridad Empresarial"
              description="Tus datos están encriptados y nunca se comparten. Cumplimos con GDPR y SOC2."
              color="teal"
            />
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Cómo funciona</h2>
            <p className="text-xl text-gray-600">Tres simples pasos para mejores reuniones</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                step: '1',
                title: 'Sube tu grabación',
                description: 'Arrastra tu archivo de audio o video. Soportamos MP3, WAV, MP4 y más.',
              },
              {
                step: '2',
                title: 'Procesamiento IA',
                description: 'Nuestra IA transcribe, identifica hablantes y extrae información clave.',
              },
              {
                step: '3',
                title: 'Obtén insights',
                description: 'Revisa el resumen, action items y métricas de participación.',
              },
            ].map((item, index) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Lo que dicen nuestros usuarios</h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                quote: 'MeetAnalyzer ha transformado cómo documentamos nuestras reuniones. Ahorramos horas cada semana.',
                author: 'María García',
                role: 'Product Manager, TechCorp',
                avatar: 'M',
              },
              {
                quote: 'La identificación de speakers es increíblemente precisa. Ya no necesito tomar notas manualmente.',
                author: 'Carlos Rodríguez',
                role: 'CEO, StartupXYZ',
                avatar: 'C',
              },
              {
                quote: 'Los action items automáticos son un game-changer. Ningún compromiso se pierde.',
                author: 'Ana López',
                role: 'Team Lead, AgenciaDigital',
                avatar: 'A',
              },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className="bg-gray-50 p-6 rounded-xl"
              >
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className="font-medium">{testimonial.author}</p>
                    <p className="text-sm text-gray-500">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Planes simples y transparentes</h2>
            <p className="text-xl text-gray-600">Comienza gratis, escala cuando lo necesites</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              features={['60 min/mes', '1 usuario', 'Análisis básico', 'Soporte por email']}
            />
            <PricingCard
              name="Starter"
              price="$19"
              features={['300 min/mes', '5 usuarios', 'Email reports', 'API access', 'Integraciones']}
              popular
            />
            <PricingCard
              name="Pro"
              price="$49"
              features={[
                '1000 min/mes',
                '20 usuarios',
                'Todo en Starter',
                'Soporte prioritario',
                'SSO',
              ]}
            />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">Preguntas Frecuentes</h2>
          </motion.div>

          <div className="max-w-3xl mx-auto">
            <FAQItem
              question="¿Qué formatos de audio/video soportan?"
              answer="Soportamos MP3, WAV, WebM, OGG para audio y MP4, MOV, WebM para video. El límite de archivo es 500MB."
            />
            <FAQItem
              question="¿Qué tan precisa es la transcripción?"
              answer="Nuestra IA logra +95% de precisión en español e inglés. La identificación de speakers funciona mejor con audio de buena calidad."
            />
            <FAQItem
              question="¿Mis datos están seguros?"
              answer="Absolutamente. Todos los datos están encriptados en tránsito y en reposo. No compartimos ni usamos tu información para entrenar modelos."
            />
            <FAQItem
              question="¿Puedo cancelar en cualquier momento?"
              answer="Sí, puedes cancelar tu suscripción cuando quieras. Tendrás acceso hasta el final del período pagado."
            />
            <FAQItem
              question="¿Tienen API para integrar?"
              answer="Sí, ofrecemos una API REST completa disponible en los planes Starter y Pro. Documentación completa incluida."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-r from-primary to-blue-600">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl font-bold text-white mb-4">
              ¿Listo para transformar tus reuniones?
            </h2>
            <p className="text-xl text-white/80 mb-8 max-w-2xl mx-auto">
              Únete a miles de equipos que ya usan MeetAnalyzer para ser más productivos.
            </p>
            <Link to="/login">
              <Button size="lg" variant="secondary" className="text-lg px-8">
                Comenzar gratis <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Mic className="h-6 w-6 text-primary" />
                <span className="font-bold">MeetAnalyzer</span>
              </div>
              <p className="text-sm text-gray-600">
                Transforma tus reuniones en insights accionables con IA.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Producto</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-primary">Características</a></li>
                <li><a href="#" className="hover:text-primary">Precios</a></li>
                <li><a href="#" className="hover:text-primary">API</a></li>
                <li><a href="#" className="hover:text-primary">Integraciones</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-primary">Sobre nosotros</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
                <li><a href="#" className="hover:text-primary">Carreras</a></li>
                <li><a href="#" className="hover:text-primary">Contacto</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><a href="#" className="hover:text-primary">Privacidad</a></li>
                <li><a href="#" className="hover:text-primary">Términos</a></li>
                <li><a href="#" className="hover:text-primary">Cookies</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-gray-600">
            <p>© 2024 MeetAnalyzer. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal';
}

const colorClasses = {
  blue: 'bg-blue-100 text-blue-600',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-600',
  pink: 'bg-pink-100 text-pink-600',
  teal: 'bg-teal-100 text-teal-600',
};

function FeatureCard({ icon, title, description, color }: FeatureCardProps) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-white p-6 rounded-xl border shadow-sm hover:shadow-md transition-shadow"
    >
      <div className={`inline-flex p-3 rounded-lg mb-4 ${colorClasses[color]}`}>{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </motion.div>
  );
}

function PricingCard({
  name,
  price,
  features,
  popular,
}: {
  name: string;
  price: string;
  features: string[];
  popular?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -5 }}
      className={`bg-white p-6 rounded-xl border-2 ${popular ? 'border-primary shadow-lg' : 'border-gray-200'}`}
    >
      {popular && (
        <span className="bg-primary text-white text-xs px-3 py-1 rounded-full">
          Más popular
        </span>
      )}
      <h3 className="text-2xl font-bold mt-4">{name}</h3>
      <p className="text-4xl font-bold my-4">
        {price}
        <span className="text-lg text-gray-500 font-normal">/mes</span>
      </p>
      <ul className="space-y-3 mb-6">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link to="/login">
        <Button className="w-full" variant={popular ? 'default' : 'outline'}>
          Comenzar
        </Button>
      </Link>
    </motion.div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      className="border-b"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 flex items-center justify-between text-left"
      >
        <span className="font-medium text-lg">{question}</span>
        <ChevronDown
          className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <motion.div
        initial={false}
        animate={{ height: isOpen ? 'auto' : 0, opacity: isOpen ? 1 : 0 }}
        className="overflow-hidden"
      >
        <p className="pb-5 text-gray-600">{answer}</p>
      </motion.div>
    </motion.div>
  );
}
