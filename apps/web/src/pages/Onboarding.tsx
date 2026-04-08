import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  Chrome, 
  CheckCircle, 
  ArrowRight, 
  ArrowLeft,
  Puzzle,
  Link,
  Mic,
  Sparkles,
} from 'lucide-react';
import { useAuthStore } from '../stores/auth';

const EXTENSION_DOWNLOAD_URL = '/downloads/romelly-ai-extension.zip';

interface Step {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
}

const steps: Step[] = [
  {
    id: 1,
    title: '¡Bienvenido a Romelly AI!',
    description: 'Vamos a configurar tu cuenta para transcribir reuniones automáticamente.',
    icon: <Sparkles className="h-12 w-12" />,
  },
  {
    id: 2,
    title: 'Descarga la Extensión',
    description: 'Nuestra extensión de Chrome captura el audio de tus reuniones.',
    icon: <Download className="h-12 w-12" />,
  },
  {
    id: 3,
    title: 'Instala en Chrome',
    description: 'Sigue estos pasos para instalar la extensión.',
    icon: <Chrome className="h-12 w-12" />,
  },
  {
    id: 4,
    title: 'Conecta tu Cuenta',
    description: 'Vincula la extensión con tu cuenta de Romelly AI.',
    icon: <Link className="h-12 w-12" />,
  },
  {
    id: 5,
    title: '¡Todo Listo!',
    description: 'Ya puedes empezar a transcribir tus reuniones.',
    icon: <CheckCircle className="h-12 w-12" />,
  },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(1);
  const [_extensionInstalled, setExtensionInstalled] = useState(false);
  const [extensionConnected, setExtensionConnected] = useState(false);

  useEffect(() => {
    // Check if extension is installed
    checkExtensionStatus();
  }, [currentStep]);

  const checkExtensionStatus = () => {
    // Try to communicate with extension
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      try {
        // Extension ID would be set after publishing
        chrome.runtime.sendMessage(
          'YOUR_EXTENSION_ID', // Replace with actual ID
          { type: 'ping' },
          (response: { status?: string; connected?: boolean } | undefined) => {
            if (response?.status === 'ok') {
              setExtensionInstalled(true);
              if (response.connected) {
                setExtensionConnected(true);
              }
            }
          }
        );
      } catch (e) {
        // Extension not installed
      }
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    } else {
      // Mark onboarding as complete
      localStorage.setItem('onboarding_complete', 'true');
      navigate('/dashboard');
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/dashboard');
  };

  const downloadExtension = () => {
    // Trigger download
    const link = document.createElement('a');
    link.href = EXTENSION_DOWNLOAD_URL;
    link.download = 'romelly-ai-extension.zip';
    link.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-all ${
                  step.id < currentStep
                    ? 'bg-violet-600 text-white'
                    : step.id === currentStep
                    ? 'bg-violet-600 text-white ring-4 ring-violet-200'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step.id < currentStep ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.id
                )}
              </div>
            ))}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-violet-600 to-teal-500"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Step content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-8"
          >
            {/* Step 1: Welcome */}
            {currentStep === 1 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-violet-500 to-teal-500 rounded-full text-white mb-6"
                >
                  {steps[0].icon}
                </motion.div>
                <h1 className="text-3xl font-bold mb-4">
                  ¡Hola, {user?.name?.split(' ')[0] || 'Usuario'}! 👋
                </h1>
                <p className="text-gray-600 text-lg mb-6">
                  Bienvenido a <span className="font-semibold text-violet-600">Romelly AI</span>.
                  <br />
                  Vamos a configurar todo para que puedas transcribir tus reuniones automáticamente.
                </p>
                <div className="grid grid-cols-3 gap-4 mt-8">
                  <FeatureCard
                    icon={<Mic className="h-6 w-6" />}
                    title="Transcribe"
                    description="Audio a texto con IA"
                  />
                  <FeatureCard
                    icon={<Sparkles className="h-6 w-6" />}
                    title="Analiza"
                    description="Resúmenes y action items"
                  />
                  <FeatureCard
                    icon={<CheckCircle className="h-6 w-6" />}
                    title="Organiza"
                    description="Todo en un solo lugar"
                  />
                </div>
              </div>
            )}

            {/* Step 2: Download */}
            {currentStep === 2 && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-violet-100 rounded-full text-violet-600 mb-6">
                  <Download className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Descarga la Extensión</h2>
                <p className="text-gray-600 mb-8">
                  Nuestra extensión de Chrome captura el audio de tus reuniones
                  en Google Meet, Microsoft Teams y Zoom.
                </p>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={downloadExtension}
                  className="inline-flex items-center gap-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white px-8 py-4 rounded-xl text-lg font-semibold shadow-lg shadow-violet-200 mb-6"
                >
                  <Download className="h-5 w-5" />
                  Descargar Extensión
                </motion.button>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                  <p className="text-amber-800 text-sm">
                    <strong>Nota:</strong> El archivo se descargará como ZIP.
                    En el siguiente paso te explicamos cómo instalarlo.
                  </p>
                </div>
              </div>
            )}

            {/* Step 3: Install */}
            {currentStep === 3 && (
              <div>
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-violet-100 rounded-full text-violet-600 mb-4">
                    <Puzzle className="h-10 w-10" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Instala la Extensión</h2>
                  <p className="text-gray-600">Sigue estos pasos en Chrome</p>
                </div>

                <div className="space-y-4">
                  <InstallStep
                    number={1}
                    title="Descomprime el archivo"
                    description="Extrae el ZIP descargado en una carpeta"
                  />
                  <InstallStep
                    number={2}
                    title="Abre Chrome Extensions"
                    description={
                      <span>
                        Ve a{' '}
                        <code className="bg-gray-100 px-2 py-0.5 rounded text-violet-600">
                          chrome://extensions
                        </code>
                      </span>
                    }
                  />
                  <InstallStep
                    number={3}
                    title="Activa Modo Desarrollador"
                    description="Esquina superior derecha → activar switch"
                  />
                  <InstallStep
                    number={4}
                    title="Cargar extensión"
                    description="Click en 'Cargar descomprimida' → selecciona la carpeta"
                  />
                </div>

                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-800 text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verás el icono de Romelly AI en tu barra de extensiones
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Connect */}
            {currentStep === 4 && (
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-violet-100 rounded-full text-violet-600 mb-6">
                  <Link className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold mb-4">Conecta tu Cuenta</h2>
                <p className="text-gray-600 mb-8">
                  Abre la extensión y haz clic en "Iniciar Sesión" para vincularla con tu cuenta.
                </p>

                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <img
                    src="/images/extension-login.png"
                    alt="Extension login"
                    className="rounded-lg shadow-md mx-auto max-w-xs"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="mt-4 flex items-center justify-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Chrome className="h-4 w-4" />
                      Click en icono
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      Iniciar sesión
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Conectado
                    </div>
                  </div>
                </div>

                {extensionConnected ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                    <CheckCircle className="h-5 w-5" />
                    ¡Extensión conectada!
                  </div>
                ) : (
                  <button
                    onClick={checkExtensionStatus}
                    className="text-violet-600 hover:text-violet-700 font-medium"
                  >
                    Verificar conexión
                  </button>
                )}
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && (
              <div className="text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', bounce: 0.5 }}
                  className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-green-400 to-teal-500 rounded-full text-white mb-6"
                >
                  <CheckCircle className="h-12 w-12" />
                </motion.div>
                <h2 className="text-3xl font-bold mb-4">¡Todo Listo! 🎉</h2>
                <p className="text-gray-600 text-lg mb-8">
                  Ya puedes empezar a transcribir y analizar tus reuniones.
                </p>

                <div className="bg-gradient-to-r from-violet-50 to-teal-50 rounded-xl p-6 mb-8">
                  <h3 className="font-semibold mb-4">Cómo usar Romelly AI:</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                        1
                      </div>
                      <p>Únete a tu reunión</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                        2
                      </div>
                      <p>Click en la extensión → Grabar</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mx-auto mb-2 shadow">
                        3
                      </div>
                      <p>Detener → Ver análisis</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t">
              <button
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Saltar configuración
              </button>

              <div className="flex gap-3">
                {currentStep > 1 && (
                  <button
                    onClick={handlePrev}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </button>
                )}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleNext}
                  className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-violet-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  {currentStep === steps.length ? 'Ir al Dashboard' : 'Siguiente'}
                  <ArrowRight className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <div className="text-violet-600 mb-2 flex justify-center">{icon}</div>
      <h4 className="font-medium text-sm">{title}</h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function InstallStep({ number, title, description }: { number: number; title: string; description: React.ReactNode }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-medium">
        {number}
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-gray-600 text-sm">{description}</p>
      </div>
    </div>
  );
}
