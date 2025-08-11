"use client";
import { CalendarEvent } from "@/utils/data";
import React, { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Event {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date;
  color: string;
}

interface EventsContextType {
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id'> & { customer_id: string; service_type: string; sessionLength: number }) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  updateEvent: (event: CalendarEvent) => Promise<void>;
  eventViewOpen: boolean;
  setEventViewOpen: (value: boolean) => void;
  eventAddOpen: boolean;
  setEventAddOpen: (value: boolean) => void;
  eventEditOpen: boolean;
  setEventEditOpen: (value: boolean) => void;
  eventDeleteOpen: boolean;
  setEventDeleteOpen: (value: boolean) => void;
  availabilityCheckerEventAddOpen: boolean;
  setAvailabilityCheckerEventAddOpen: (value: boolean) => void;
}

const EventsContext = createContext<EventsContextType | undefined>(undefined);

export const useEvents = () => {
  const context = useContext(EventsContext);
  if (!context) {
    throw new Error("useEvents must be used within an EventsProvider");
  }
  return context;
};

export const EventsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { toast } = useToast();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventViewOpen, setEventViewOpen] = useState(false);
  const [eventAddOpen, setEventAddOpen] = useState(false);
  const [eventEditOpen, setEventEditOpen] = useState(false);
  const [eventDeleteOpen, setEventDeleteOpen] = useState(false);
  const [availabilityCheckerEventAddOpen, setAvailabilityCheckerEventAddOpen] =
    useState(false);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id, title, description, scheduled_date, end_date, priority,
          customers ( name, phone, address )
        `);

      if (error) throw error;

      const formattedEvents = data.map((job: any) => ({
        id: job.id,
        title: job.title,
        description: job.description,
        start: new Date(job.scheduled_date),
        end: job.end_date ? new Date(job.end_date) : new Date(job.scheduled_date),
        backgroundColor: getPriorityColor(job.priority),
        customerName: job.customers?.name,
        customerPhone: job.customers?.phone,
        customerAddress: job.customers?.address,
      }));
      setEvents(formattedEvents);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch events for the calendar.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const addEvent = async (event: Omit<CalendarEvent, 'id'> & { customer_id: string; service_type: string; sessionLength: number }) => {
    try {
      const endDate = new Date(event.start);
      endDate.setMinutes(endDate.getMinutes() + event.sessionLength);

      const { data, error } = await supabase
        .from('jobs')
        .insert([
          {
            title: event.title,
            description: event.description,
            scheduled_date: event.start.toISOString(),
            end_date: endDate.toISOString(),
            priority: 'medium', // default priority
            status: 'scheduled',
            customer_id: event.customer_id,
            service_type: event.service_type
          },
        ])
        .select();

      if (error) throw error;
      if (data) {
        fetchEvents();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add event.",
        variant: "destructive",
      });
    }
  };

  const updateEvent = async (event: CalendarEvent) => {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({
          title: event.title,
          description: event.description,
          scheduled_date: event.start.toISOString(),
          end_date: event.end.toISOString(),
        })
        .eq('id', event.id);

      if (error) throw error;

      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update event.",
        variant: "destructive",
      });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      fetchEvents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to delete event.",
        variant: "destructive",
      });
    }
  };
  
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f97316';
      case 'medium': return '#facc15';
      case 'low': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <EventsContext.Provider
      value={{
        events,
        addEvent,
        deleteEvent,
        updateEvent,
        eventViewOpen,
        setEventViewOpen,
        eventAddOpen,
        setEventAddOpen,
        eventEditOpen,
        setEventEditOpen,
        eventDeleteOpen,
        setEventDeleteOpen,
        availabilityCheckerEventAddOpen,
        setAvailabilityCheckerEventAddOpen,
      }}
    >
      {children}
    </EventsContext.Provider>
  );
};
