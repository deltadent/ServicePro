
import { useState, useCallback } from 'react';

interface OptimisticUpdate<T> {
  id: string;
  optimisticData: Partial<T>;
}

export const useOptimisticUpdates = <T extends { id: string }>(
  initialData: T[],
  updateFunction: (id: string, data: Partial<T>) => Promise<void>
) => {
  const [data, setData] = useState<T[]>(initialData);
  const [pendingUpdates, setPendingUpdates] = useState<OptimisticUpdate<T>[]>([]);

  const optimisticUpdate = useCallback(async (id: string, updateData: Partial<T>) => {
    // Apply optimistic update
    setData(prevData => 
      prevData.map(item => 
        item.id === id ? { ...item, ...updateData } : item
      )
    );

    setPendingUpdates(prev => [...prev, { id, optimisticData: updateData }]);

    try {
      // Perform actual update
      await updateFunction(id, updateData);
      
      // Remove from pending updates on success
      setPendingUpdates(prev => prev.filter(update => update.id !== id));
    } catch (error) {
      // Revert optimistic update on failure
      setData(prevData => 
        prevData.map(item => {
          if (item.id === id) {
            const pendingUpdate = pendingUpdates.find(update => update.id === id);
            if (pendingUpdate) {
              // Revert the optimistic changes
              const revertedItem = { ...item };
              Object.keys(pendingUpdate.optimisticData).forEach(key => {
                delete revertedItem[key as keyof T];
              });
              return revertedItem;
            }
          }
          return item;
        })
      );
      
      setPendingUpdates(prev => prev.filter(update => update.id !== id));
      throw error;
    }
  }, [updateFunction, pendingUpdates]);

  const refreshData = useCallback((newData: T[]) => {
    setData(newData);
    setPendingUpdates([]);
  }, []);

  return {
    data,
    optimisticUpdate,
    refreshData,
    hasPendingUpdates: pendingUpdates.length > 0
  };
};
