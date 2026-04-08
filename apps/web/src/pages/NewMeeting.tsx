import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileAudio,
  Check,
  ArrowLeft,
  ArrowRight,
  X,
  Loader2,
  AlertCircle,
  Clock,
  File,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { createMeeting } from '../lib/api';
import { cn, formatDuration } from '../lib/utils';

const steps = [
  { id: 'upload', title: 'Subir Archivo', description: 'Selecciona tu grabación' },
  { id: 'details', title: 'Detalles', description: 'Información de la reunión' },
  { id: 'review', title: 'Revisar', description: 'Confirma y procesa' },
];

const ACCEPTED_FORMATS = {
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'audio/webm': ['.webm'],
  'audio/ogg': ['.ogg'],
  'video/mp4': ['.mp4'],
  'video/webm': ['.webm'],
  'video/quicktime': ['.mov'],
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

export default function NewMeeting() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError('El archivo excede el límite de 500MB');
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Formato de archivo no soportado');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));

      // Get audio duration
      const url = URL.createObjectURL(selectedFile);
      const audio = new Audio(url);
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(Math.round(audio.duration));
        URL.revokeObjectURL(url);
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FORMATS,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  });

  const handleNext = () => {
    if (currentStep === 0 && !file) {
      setError('Por favor selecciona un archivo');
      return;
    }
    if (currentStep === 1 && !title.trim()) {
      setError('Por favor ingresa un título');
      return;
    }
    setError(null);
    setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
  };

  const handleBack = () => {
    setError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!file || !title.trim()) return;

    try {
      setUploading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title.trim());

      const meeting = await createMeeting(formData, (progress) => {
        setUploadProgress(progress);
      });

      navigate(`/dashboard/meetings/${meeting.id}`);
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.response?.data?.message || 'Error al subir el archivo');
      setUploading(false);
    }
  };

  const removeFile = () => {
    setFile(null);
    setAudioDuration(null);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Button variant="ghost" onClick={() => navigate('/dashboard/meetings')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
        <h1 className="text-3xl font-bold">Nueva Reunión</h1>
        <p className="text-muted-foreground">Sube una grabación para analizar</p>
      </motion.div>

      {/* Stepper */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between relative">
          {/* Progress line */}
          <div className="absolute left-0 top-5 h-0.5 bg-muted w-full -z-10" />
          <div
            className="absolute left-0 top-5 h-0.5 bg-primary transition-all -z-10"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />

          {steps.map((step, index) => (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all',
                  index < currentStep
                    ? 'bg-primary text-white'
                    : index === currentStep
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {index < currentStep ? <Check className="h-5 w-5" /> : index + 1}
              </div>
              <div className="mt-2 text-center">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground hidden sm:block">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {currentStep === 0 && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Subir Archivo de Audio/Video</CardTitle>
                </CardHeader>

                {!file ? (
                  <div
                    {...getRootProps()}
                    className={cn(
                      'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors',
                      isDragActive
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-muted-foreground/50'
                    )}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium mb-2">
                      {isDragActive ? 'Suelta el archivo aquí' : 'Arrastra tu archivo aquí'}
                    </p>
                    <p className="text-muted-foreground mb-4">o haz clic para seleccionar</p>
                    <p className="text-sm text-muted-foreground">
                      Formatos: MP3, WAV, WebM, OGG, MP4, MOV • Máximo 500MB
                    </p>
                  </div>
                ) : (
                  <div className="border rounded-xl p-6">
                    <div className="flex items-center gap-4">
                      <div className="rounded-full bg-primary/10 p-3">
                        <FileAudio className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                          {audioDuration && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(audioDuration)}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={removeFile}>
                        <X className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {currentStep === 1 && (
              <motion.div
                key="details"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Detalles de la Reunión</CardTitle>
                </CardHeader>

                <div className="space-y-4">
                  <Input
                    label="Título de la reunión"
                    placeholder="Ej: Reunión de planificación Q2"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    error={error && !title.trim() ? 'El título es requerido' : undefined}
                  />

                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2">Archivo seleccionado</h4>
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm truncate">{file?.name}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="review"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CardHeader className="px-0 pt-0">
                  <CardTitle>Revisar y Procesar</CardTitle>
                </CardHeader>

                {uploading ? (
                  <div className="py-12 text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Subiendo archivo...</p>
                    <div className="max-w-xs mx-auto mb-2">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-primary"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                    </div>
                    <p className="text-muted-foreground">{uploadProgress}%</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-xl p-6 space-y-4">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Título</span>
                        <span className="font-medium">{title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Archivo</span>
                        <span className="font-medium truncate max-w-[200px]">{file?.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tamaño</span>
                        <span className="font-medium">
                          {((file?.size || 0) / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                      {audioDuration && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duración</span>
                          <span className="font-medium">{formatDuration(audioDuration)}</span>
                        </div>
                      )}
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
                      <AlertCircle className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">¿Qué sucede después?</p>
                        <p className="text-sm text-blue-700">
                          Tu archivo será procesado automáticamente. Esto puede tomar algunos
                          minutos dependiendo de la duración. Te notificaremos cuando esté listo.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700"
            >
              <AlertCircle className="h-5 w-5" />
              <span className="text-sm">{error}</span>
            </motion.div>
          )}

          {/* Navigation */}
          {!uploading && (
            <div className="flex justify-between mt-6 pt-6 border-t">
              <Button variant="outline" onClick={handleBack} disabled={currentStep === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Anterior
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext}>
                  Siguiente
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit}>
                  <Upload className="h-4 w-4 mr-2" />
                  Procesar Reunión
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
