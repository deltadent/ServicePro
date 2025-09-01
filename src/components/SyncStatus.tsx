import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useNetwork } from '@/hooks/useNetwork';
import { runSync, SyncResult } from '@/lib/sync';
import { getPendingActions } from '@/lib/queue';

export function SyncStatus() {
  const online = useNetwork();
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  useEffect(() => {
    updatePendingCount();
    
    const handleSyncCompleted = (event: Event) => {
      const customEvent = event as CustomEvent<SyncResult>;
      if (customEvent.detail.success) {
        setLastSync(new Date());
      }
      updatePendingCount();
    };

    window.addEventListener('syncCompleted', handleSyncCompleted);
    
    return () => {
      window.removeEventListener('syncCompleted', handleSyncCompleted);
    };
  }, []);

  const updatePendingCount = async () => {
    const actions = await getPendingActions();
    setPendingCount(actions.length);
  };

  const handleSync = async () => {
    if (syncing) return;
    setSyncing(true);
    await runSync();
    setSyncing(false);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 mr-4">
            {online ? (
              <Wifi className="h-5 w-5 text-green-600" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            {pendingCount > 0 && (
              <Badge variant="destructive">{pendingCount}</Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={syncing || !online}
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {online ? 'Online' : 'Offline'}
            {pendingCount > 0 && ` - ${pendingCount} pending actions`}
          </p>
          {lastSync && (
            <p className="text-xs text-muted-foreground">
              Last sync: {lastSync.toLocaleTimeString()}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
