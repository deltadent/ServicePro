"use client";
import React, { createContext, ReactNode, useContext, useState } from "react";

interface JobCreationContextType {
  customerId: string;
  setCustomerId: (id: string) => void;
  serviceType: string;
  setServiceType: (type: string) => void;
  sessionLength: number;
  setSessionLength: (length: number) => void;
}

const JobCreationContext = createContext<JobCreationContextType | undefined>(undefined);

export const useJobCreation = () => {
  const context = useContext(JobCreationContext);
  if (!context) {
    throw new Error("useJobCreation must be used within a JobCreationProvider");
  }
  return context;
};

export const JobCreationProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [customerId, setCustomerId] = useState("");
  const [serviceType, setServiceType] = useState("");
  const [sessionLength, setSessionLength] = useState(60);

  return (
    <JobCreationContext.Provider
      value={{
        customerId,
        setCustomerId,
        serviceType,
        setServiceType,
        sessionLength,
        setSessionLength,
      }}
    >
      {children}
    </JobCreationContext.Provider>
  );
};
