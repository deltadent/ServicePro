import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Customer } from './CustomerColumns';
import { DataTable } from './ui/DataTable';
import { columns, JobOrder } from './JobOrderColumns';
import { Button } from './ui/button';
import { Plus } from 'lucide-react';
import JobCreationDialog from './JobCreationDialog';
import { JobCreationProvider } from '@/context/JobCreationContext';
import { CalendarDialogProvider } from '@/context/CalendarDialogContext';

const JobOrders = ({ customer }: { customer: Customer }) => {
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select(`
          id,
          job_number,
          created_at,
          status,
          profiles ( full_name ),
          customers ( name )
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = data.map((job: any) => ({
        id: job.id,
        job_number: job.job_number,
        created_at: job.created_at,
        technician_name: job.profiles?.full_name || 'N/A',
        status: job.status,
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

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <CalendarDialogProvider>
          <JobCreationProvider>
            <JobCreationDialog onJobCreated={handleJobCreated} />
          </JobCreationProvider>
        </CalendarDialogProvider>
      </div>
      <DataTable columns={columns} data={jobs} />
    </div>
  );
};

export default JobOrders;
