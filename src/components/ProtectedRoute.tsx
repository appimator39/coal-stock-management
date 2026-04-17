import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import type { ReactNode } from 'react';
import type { Role } from '@/lib/auth';

interface Props {
  children: ReactNode;
  role?: Role;
}

export function ProtectedRoute({ children, role }: Props) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (role && user.role !== role) {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <h1 className="font-heading font-bold text-lg mb-2">Not authorized</h1>
        <p className="text-sm text-muted-foreground">
          This page is for {role}s only. You are signed in as <b>{user.role}</b>.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
