import { WifiOff } from 'lucide-react';

const OfflinePage = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 text-center p-4">
      <WifiOff className="h-16 w-16 text-gray-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">You're Offline</h1>
      <p className="text-gray-600">
        It looks like you've lost your connection. Please check your network settings and try again.
      </p>
    </div>
  );
};

export default OfflinePage;
