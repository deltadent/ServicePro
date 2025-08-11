
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'worker';
}

const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  console.log('ProtectedRoute check:', { 
    user: user?.email, 
    profile, 
    requiredRole, 
    loading,
    hasAccess: !requiredRole || profile?.role === requiredRole
  });

  useEffect(() => {
    if (!loading) {
      if (!user) {
        console.log('No user, redirecting to auth');
        navigate('/auth');
        return;
      }
      
      if (!profile) {
        console.log('No profile found');
        return;
      }
      
      if (requiredRole && profile?.role !== requiredRole) {
        console.log('Role mismatch:', { required: requiredRole, actual: profile?.role });
        navigate('/unauthorized');
        return;
      }
    }
  }, [user, profile, loading, navigate, requiredRole]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
