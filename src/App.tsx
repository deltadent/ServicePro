
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./styles/calendar.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import AuthPage from "@/components/AuthPage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import AdminDashboard from "@/components/AdminDashboard";
import WorkerDashboard from "@/components/WorkerDashboard";
import JobManagement from "@/components/JobManagement";
import { CalendarDialogProvider } from "@/context/CalendarDialogContext";
import TechnicianProfile from "@/components/TechnicianProfile";
import InventoryPage from "@/components/InventoryPage";
import FinancialTracking from "@/components/FinancialTracking";
import CustomerManagementFull from "@/components/CustomerManagementFull";
import TechnicianManagementFull from "@/components/TechnicianManagementFull";
import ReportsAnalyticsFull from "@/components/ReportsAnalyticsFull";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const isAdmin = profile?.role === 'admin';

  return (
    <Layout>
      <Routes>
        <Route 
          path="/" 
          element={
            <Navigate to={isAdmin ? '/admin' : '/worker'} replace />
          } 
        />

        {/* Admin Routes */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/jobs" 
          element={
            <ProtectedRoute requiredRole="admin">
              <CalendarDialogProvider>
                <JobManagement />
              </CalendarDialogProvider>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/technicians" 
          element={
            <ProtectedRoute requiredRole="admin">
              <TechnicianManagementFull />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/customers" 
          element={
            <ProtectedRoute requiredRole="admin">
              <CustomerManagementFull />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/inventory" 
          element={
            <ProtectedRoute requiredRole="admin">
              <InventoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/financial" 
          element={
            <ProtectedRoute requiredRole="admin">
              <FinancialTracking />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/reports" 
          element={
            <ProtectedRoute requiredRole="admin">
              <ReportsAnalyticsFull />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/profile" 
          element={
            <ProtectedRoute requiredRole="admin">
              <TechnicianProfile />
            </ProtectedRoute>
          } 
        />

        {/* Worker Routes */}
        <Route 
          path="/worker" 
          element={
            <ProtectedRoute requiredRole="worker">
              <WorkerDashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/worker/jobs" 
          element={
            <ProtectedRoute requiredRole="worker">
              <CalendarDialogProvider>
                <JobManagement />
              </CalendarDialogProvider>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/worker/inventory" 
          element={
            <ProtectedRoute requiredRole="worker">
              <InventoryPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/worker/profile" 
          element={
            <ProtectedRoute requiredRole="worker">
              <TechnicianProfile />
            </ProtectedRoute>
          } 
        />

        {/* Common Routes */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <div className="text-center py-8">
                <h2 className="text-2xl font-bold mb-4">Settings</h2>
                <p className="text-gray-600">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/unauthorized" 
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-red-600 mb-4">403</h1>
                <h2 className="text-2xl font-bold mb-4">Unauthorized Access</h2>
                <p className="text-gray-600 mb-4">You don't have permission to access this resource.</p>
                <p className="text-sm text-gray-500 mb-4">
                  Current role: {profile?.role || 'No role assigned'}
                </p>
                <button 
                  onClick={() => window.history.back()}
                  className="text-blue-600 hover:underline"
                >
                  Go Back
                </button>
              </div>
            </div>
          } 
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
