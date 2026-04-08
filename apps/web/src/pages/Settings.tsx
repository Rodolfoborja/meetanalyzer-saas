import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Building2,
  Key,
  CreditCard,
  Eye,
  EyeOff,
  Copy,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Crown,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/Modal';
import { useToast } from '../components/ui/Toast';
import { useAuthStore } from '../stores/auth';
import {
  updateProfile,
  getOrganization,
  updateOrganization,
  getApiKeys,
  createApiKey,
  deleteApiKey,
  type ApiKey,
  type Organization,
} from '../lib/api';
import { formatDate, cn } from '../lib/utils';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: ['60 minutos/mes', '1 usuario', 'Análisis básico'],
    current: true,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 19,
    features: ['300 minutos/mes', '5 usuarios', 'Email reports', 'API access'],
    popular: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 49,
    features: ['1000 minutos/mes', '20 usuarios', 'Todo en Starter', 'Soporte prioritario'],
  },
];

export default function Settings() {
  const { user, setUser } = useAuthStore();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Organization state
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [orgName, setOrgName] = useState('');
  const [savingOrg, setSavingOrg] = useState(false);

  // API Keys state
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [creatingKey, setCreatingKey] = useState(false);
  const [showNewKeyModal, setShowNewKeyModal] = useState(false);
  const [newKeySecret, setNewKeySecret] = useState('');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deleteKeyId, setDeleteKeyId] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    async function loadData() {
      try {
        const [org, keys] = await Promise.all([
          getOrganization().catch(() => null),
          getApiKeys().catch(() => []),
        ]);
        if (org) {
          setOrganization(org);
          setOrgName(org.name);
        }
        setApiKeys(keys);
      } catch (err) {
        console.error('Error loading settings:', err);
      }
    }
    loadData();
  }, []);

  // Handlers
  const handleSaveProfile = async () => {
    try {
      setSavingProfile(true);
      const updated = await updateProfile({ name: name.trim() });
      setUser({ ...user!, name: updated.name });
      toast({ title: 'Perfil actualizado', variant: 'success' });
    } catch (err) {
      toast({ title: 'Error al guardar', description: 'Intenta de nuevo', variant: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveOrg = async () => {
    if (!organization) return;
    try {
      setSavingOrg(true);
      const updated = await updateOrganization({ name: orgName.trim() });
      setOrganization(updated);
      toast({ title: 'Organización actualizada', variant: 'success' });
    } catch (err) {
      toast({ title: 'Error al guardar', description: 'Intenta de nuevo', variant: 'error' });
    } finally {
      setSavingOrg(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      setCreatingKey(true);
      const { key, secret } = await createApiKey(newKeyName.trim());
      setApiKeys((prev) => [key, ...prev]);
      setNewKeySecret(secret);
      setShowNewKeyModal(true);
      setNewKeyName('');
    } catch (err) {
      toast({ title: 'Error al crear API key', variant: 'error' });
    } finally {
      setCreatingKey(false);
    }
  };

  const handleDeleteApiKey = async () => {
    if (!deleteKeyId) return;
    try {
      await deleteApiKey(deleteKeyId);
      setApiKeys((prev) => prev.filter((k) => k.id !== deleteKeyId));
      setDeleteKeyId(null);
      toast({ title: 'API Key eliminada', variant: 'success' });
    } catch (err) {
      toast({ title: 'Error al eliminar', variant: 'error' });
    }
  };

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const currentPlan = plans.find((p) => p.id === (user?.organization?.plan || 'free'));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">Administra tu cuenta y preferencias</p>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Perfil
            </TabsTrigger>
            <TabsTrigger value="organization" className="gap-2">
              <Building2 className="h-4 w-4" />
              Organización
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="gap-2">
              <Key className="h-4 w-4" />
              API Keys
            </TabsTrigger>
            <TabsTrigger value="billing" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Plan
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Información Personal</CardTitle>
                <CardDescription>Actualiza tu información de perfil</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 mb-6">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="h-16 w-16 rounded-full" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                      {user?.name?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-medium">{user?.name || 'Usuario'}</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                </div>

                <Input
                  label="Nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre completo"
                />

                <Input
                  label="Email"
                  value={email}
                  disabled
                  className="bg-muted"
                />

                <div className="pt-4">
                  <Button onClick={handleSaveProfile} loading={savingProfile}>
                    Guardar cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Organization Tab */}
          <TabsContent value="organization">
            <Card>
              <CardHeader>
                <CardTitle>Organización</CardTitle>
                <CardDescription>Configura tu espacio de trabajo</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="Nombre de la organización"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Mi Empresa"
                />

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">Slug de la organización</p>
                  <p className="font-mono text-sm">{organization?.slug || user?.organization?.slug}</p>
                </div>

                <div className="pt-4">
                  <Button onClick={handleSaveOrg} loading={savingOrg}>
                    Guardar cambios
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Keys Tab */}
          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Genera claves para acceder a la API de MeetAnalyzer
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Create new key */}
                <div className="flex gap-2 mb-6">
                  <Input
                    placeholder="Nombre de la API key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button onClick={handleCreateApiKey} loading={creatingKey}>
                    <Plus className="h-4 w-4" />
                    Crear
                  </Button>
                </div>

                {/* Keys list */}
                {apiKeys.length === 0 ? (
                  <div className="text-center py-8">
                    <Key className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No tienes API keys aún</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {apiKeys.map((key) => (
                      <div
                        key={key.id}
                        className="flex items-center gap-4 p-4 border rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{key.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-sm text-muted-foreground font-mono">
                              {visibleKeys.has(key.id) ? key.prefix + '...' : '••••••••••••'}
                            </code>
                            <button
                              onClick={() => toggleKeyVisibility(key.id)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              {visibleKeys.has(key.id) ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Creada: {formatDate(key.createdAt)}
                            {key.lastUsedAt && ` • Último uso: ${formatDate(key.lastUsedAt)}`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteKeyId(key.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <div className="space-y-6">
              {/* Current plan */}
              <Card>
                <CardHeader>
                  <CardTitle>Plan Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      {currentPlan?.id === 'free' ? (
                        <Zap className="h-6 w-6 text-primary" />
                      ) : (
                        <Crown className="h-6 w-6 text-primary" />
                      )}
                    </div>
                    <div>
                      <p className="text-xl font-bold">{currentPlan?.name || 'Free'}</p>
                      <p className="text-muted-foreground">
                        ${currentPlan?.price || 0}/mes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Plans grid */}
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan) => {
                  const isCurrent = plan.id === (user?.organization?.plan || 'free');
                  return (
                    <Card
                      key={plan.id}
                      className={cn(
                        'relative',
                        plan.popular && 'border-primary',
                        isCurrent && 'bg-primary/5'
                      )}
                    >
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge>Popular</Badge>
                        </div>
                      )}
                      <CardContent className="pt-6">
                        <h3 className="text-xl font-bold">{plan.name}</h3>
                        <p className="text-3xl font-bold mt-2">
                          ${plan.price}
                          <span className="text-lg font-normal text-muted-foreground">/mes</span>
                        </p>
                        <ul className="mt-4 space-y-2">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full mt-6"
                          variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'outline'}
                          disabled={isCurrent}
                        >
                          {isCurrent ? 'Plan actual' : 'Cambiar a ' + plan.name}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* New Key Modal */}
      <Dialog open={showNewKeyModal} onOpenChange={setShowNewKeyModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Creada</DialogTitle>
            <DialogDescription>
              Copia tu API key ahora. No podrás verla de nuevo.
            </DialogDescription>
          </DialogHeader>
          <div className="my-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <code className="flex-1 text-sm font-mono break-all">{newKeySecret}</code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(newKeySecret, 'new')}
              >
                {copiedKey === 'new' ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 text-amber-600 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>Guarda esta key en un lugar seguro</span>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowNewKeyModal(false)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Key Modal */}
      <Dialog open={!!deleteKeyId} onOpenChange={() => setDeleteKeyId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar API Key</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas eliminar esta API key? Las aplicaciones que la usen
              dejarán de funcionar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteKeyId(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDeleteApiKey}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
