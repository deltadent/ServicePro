import { useState, useEffect, useMemo } from 'react';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import JobDetailsDialog from './JobDetailsDialog';
import { format } from 'date-fns';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';

const DraggableJob = ({ job, children }: { job: any, children: React.ReactNode }) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `job-${job.id}`,
    data: { job },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      {children}
    </div>
  );
};

const DroppableDay = ({ date, children, onDayClick }: { date: Date, children: React.ReactNode, onDayClick?: (day: Date) => void }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${format(date, 'yyyy-MM-dd')}`,
    data: { date },
  });

  const handleClick = () => {
    if (onDayClick) {
      onDayClick(date);
    }
  };

  return (
    <div ref={setNodeRef} className={`day-picker-day-container ${isOver ? 'bg-green-200' : ''}`} onClick={handleClick}>
      {children}
    </div>
  );
};

const JobScheduleCalendar = () => {
  const { toast } = useToast();
  const [jobs, setJobs] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([fetchJobs(), fetchProfiles()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*, customers(name)')
        .order('scheduled_date');

      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch jobs for calendar",
        variant: "destructive"
      });
    }
  };

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      setProfiles(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch profiles",
        variant: "destructive"
      });
    }
  };

  const jobsByDate = useMemo(() => {
    const profilesMap = new Map(profiles.map(p => [p.id, p.full_name]));
    return jobs.reduce((acc, job) => {
      const date = format(new Date(job.scheduled_date), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push({
        ...job,
        technician_name: profilesMap.get(job.technician_id)
      });
      return acc;
    }, {} as Record<string, any[]>);
  }, [jobs, profiles]);

  const selectedDayJobs = useMemo(() => {
    if (!selectedDay) return [];
    const date = format(selectedDay, 'yyyy-MM-dd');
    return jobsByDate[date] || [];
  }, [selectedDay, jobsByDate]);

  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
  };

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setIsDetailsDialogOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && active.data.current?.job) {
      const job = active.data.current.job;
      const newDate = over.data.current?.date;

      if (newDate) {
        try {
          const { error } = await supabase
            .from('jobs')
            .update({ scheduled_date: newDate.toISOString() })
            .eq('id', job.id);

          if (error) throw error;

          toast({
            title: "Success",
            description: "Job rescheduled successfully"
          });
          fetchJobs();
        } catch (error: any) {
          toast({
            title: "Error",
            description: "Failed to reschedule job",
            variant: "destructive"
          });
        }
      }
    }
  };

  const modifiers = {
    hasJobs: (date: Date) => {
      const formattedDate = format(date, 'yyyy-MM-dd');
      return jobsByDate[formattedDate] && jobsByDate[formattedDate].length > 0;
    }
  };

  const modifiersStyles = {
    hasJobs: {
      color: '#fff',
      backgroundColor: '#8B5CF6',
    },
  };

  const renderFooter = () => {
    if (!selectedDay) return <p>Please pick a day.</p>;
    return <p>You selected {format(selectedDay, 'PPP')}.</p>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-0">
            <DayPicker
              mode="single"
              selected={selectedDay}
              onSelect={setSelectedDay}
              onDayClick={handleDayClick}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              footer={renderFooter()}
              className="p-4"
              components={{
                Day: ({ date, displayMonth }) => {
                  const formattedDate = format(date, 'yyyy-MM-dd');
                  const jobsCount = jobsByDate[formattedDate]?.length || 0;
                  return (
                    <DroppableDay date={date} onDayClick={handleDayClick}>
                      <div className="relative">
                        <span>{format(date, 'd')}</span>
                        {jobsCount > 0 && (
                          <Badge variant="secondary" className="absolute -top-1 -right-1 text-xs px-1.5 py-0.5">
                            {jobsCount}
                          </Badge>
                        )}
                      </div>
                    </DroppableDay>
                  );
                }
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>
              Jobs for {selectedDay ? format(selectedDay, 'PPP') : '...'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[50vh] w-full">
              <div className="space-y-4 pr-4">
                {selectedDayJobs.length > 0 ? (
                  selectedDayJobs.map(job => (
                    <DraggableJob key={job.id} job={job}>
                      <Card className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{job.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {job.customers?.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {job.technician_name ? `Assigned to ${job.technician_name}` : 'Unassigned'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(job.scheduled_date), 'p')}
                            </p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleViewDetails(job)}>
                            View Details
                          </Button>
                        </div>
                      </Card>
                    </DraggableJob>
                  ))
                ) : (
                  <p>No jobs scheduled for this day.</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        {selectedJob && (
          <JobDetailsDialog
            job={selectedJob}
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
            onJobUpdate={fetchJobs}
          />
        )}
      </div>
    </DndContext>
  );
};

export default JobScheduleCalendar;
