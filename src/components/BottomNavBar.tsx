import { Home, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BottomNavBarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNavBar = ({ activeTab, setActiveTab }: BottomNavBarProps) => {
  return (
    <div className="fixed inset-x-0 bottom-0 bg-background border-t z-50">
      <div className="flex justify-around items-center h-16">
        <Button
          variant="ghost"
          onClick={() => setActiveTab('current')}
          className={`flex flex-col items-center gap-1 h-full rounded-none text-xs w-full ${activeTab === 'current' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <Home className="w-5 h-5" />
          <span>Current</span>
        </Button>
        <Button
          variant="ghost"
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 h-full rounded-none text-xs w-full ${activeTab === 'history' ? 'text-primary' : 'text-muted-foreground'}`}
        >
          <History className="w-5 h-5" />
          <span>History</span>
        </Button>
      </div>
    </div>
  );
};

export default BottomNavBar;
