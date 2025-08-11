"use client";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface CalendarDialogContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  scheduledDate: Date | undefined;
  setScheduledDate: (date: Date | undefined) => void;
}

const CalendarDialogContext = createContext<CalendarDialogContextType | undefined>(undefined);

export const useCalendarDialog = () => {
  const context = useContext(CalendarDialogContext);
  if (!context) {
    throw new Error("useCalendarDialog must be used within a CalendarDialogProvider");
  }
  return context;
};

export const CalendarDialogProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>();

  return (
    <CalendarDialogContext.Provider
      value={{
        isOpen,
        setIsOpen,
        scheduledDate,
        setScheduledDate,
      }}
    >
      {children}
    </CalendarDialogContext.Provider>
  );
};
