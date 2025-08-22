import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from './CustomerColumns';
import { DataTable } from './ui/DataTable';
import { getColumns, JobOrder } from './JobOrderColumns';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Plus } from 'lucide-react';
import JobCreationDialog from './JobCreationDialog';
import { JobCreationProvider } from '@/context/JobCreationContext';
import { CalendarDialogProvider } from '@/context/CalendarDialogContext';
import JobDetailsDialog from './JobDetailsDialog';

const JobOrders = ({ customer }: { customer: Customer }) => {
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<JobOrder | null>(null);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          *,
          profiles ( full_name ),
          customers ( * )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((job: any) => ({
        ...job,
        technician_name: job.profiles?.full_name || 'N/A',
        ordered_by: job.customers?.name || 'N/A',
      }));

      setJobs(formattedData as JobOrder[] || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [customer.id]);

  const handleJobCreated = () => {
    fetchJobs();
  };

  const handleViewDetails = (jobOrder: JobOrder) => {
    setSelectedJob(jobOrder);
  };

  const columns = getColumns(handleViewDetails);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Job Orders</CardTitle>
          <CalendarDialogProvider>
            <JobCreationProvider>
              <JobCreationDialog onJobCreated={handleJobCreated} />
            </JobCreationProvider>
          </CalendarDialogProvider>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={jobs} />
      </CardContent>
      {selectedJob && (
        <JobDetailsDialog
          job={selectedJob}
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          onJobUpdate={fetchJobs}
        />
      )}
    </Card>
  );
};

export default JobOrders;
