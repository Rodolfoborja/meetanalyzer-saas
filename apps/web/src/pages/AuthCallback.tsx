import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { Loader2 } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setToken, fetchUser } = useAuthStore();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      setToken(token);
      fetchUser().then(() => {
        navigate('/dashboard');
      });
    } else {
      navigate('/login');
    }
  }, [searchParams, setToken, fetchUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-600">Autenticando...</p>
      </div>
    </div>
  );
}
