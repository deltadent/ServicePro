
import { useAuth } from '@/hooks/useAuth';
import AdminDashboard from './AdminDashboard';
import WorkerDashboard from './WorkerDashboard';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  
  return isAdmin ? <AdminDashboard /> : <WorkerDashboard />;
};

export default Dashboard;
