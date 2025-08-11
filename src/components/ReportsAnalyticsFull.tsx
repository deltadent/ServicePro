
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, Download, TrendingUp, Users, DollarSign, Clock, FileText } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

const ReportsAnalyticsFull = () => {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');
  const [reportData, setReportData] = useState({
    jobStats: [],
    revenueData: [],
    technicianPerformance: [],
    customerTypes: [],
    summary: {
      totalJobs: 0,
      totalRevenue: 0,
      completionRate: 0,
      avgJobDuration: 0
    }
  });
  const { toast } = useToast();

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - parseInt(dateRange));

      // Fetch jobs data
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customers(name, customer_type),
          profiles(full_name)
        `)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (jobsError) throw jobsError;

      // Process job statistics
      const jobsByStatus = jobs?.reduce((acc: any, job) => {
        acc[job.status] = (acc[job.status] || 0) + 1;
        return acc;
      }, {}) || {};

      const jobStatsData = Object.entries(jobsByStatus).map(([status, count]) => ({
        status: status.replace('_', ' '),
        count
      }));

      // Process revenue data by day
      const revenueByDay = jobs?.reduce((acc: any, job) => {
        const date = new Date(job.created_at).toLocaleDateString();
        acc[date] = (acc[date] || 0) + (job.total_cost || 0);
        return acc;
      }, {}) || {};

      const revenueData = Object.entries(revenueByDay)
        .slice(-7)
        .map(([date, revenue]) => ({
          date,
          revenue
        }));

      // Process technician performance
      const techPerformance = jobs?.reduce((acc: any, job) => {
        if (job.profiles?.full_name) {
          const tech = job.profiles.full_name;
          if (!acc[tech]) {
            acc[tech] = { name: tech, jobs: 0, revenue: 0 };
          }
          acc[tech].jobs += 1;
          acc[tech].revenue += job.total_cost || 0;
        }
        return acc;
      }, {}) || {};

      const technicianPerformance = Object.values(techPerformance);

      // Process customer types
      const customerTypeData = jobs?.reduce((acc: any, job) => {
        const type = job.customers?.customer_type || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {}) || {};

      const customerTypes = Object.entries(customerTypeData).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count as number / jobs?.length) * 100)
      }));

      // Calculate summary
      const totalJobs = jobs?.length || 0;
      const totalRevenue = jobs?.reduce((sum, job) => sum + (job.total_cost || 0), 0) || 0;
      const completedJobs = jobs?.filter(job => job.status === 'completed').length || 0;
      const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
      const completedJobsWithDuration = jobs?.filter(job => job.status === 'completed' && job.actual_duration) || [];
      const avgJobDuration = completedJobsWithDuration.length > 0 
        ? Math.round(completedJobsWithDuration.reduce((sum, job) => sum + (job.actual_duration || 0), 0) / completedJobsWithDuration.length)
        : 0;

      setReportData({
        jobStats: jobStatsData,
        revenueData,
        technicianPerformance,
        customerTypes,
        summary: {
          totalJobs,
          totalRevenue,
          completionRate,
          avgJobDuration
        }
      });

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch report data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    const reportContent = `
Field Service Report
Generated: ${new Date().toLocaleDateString()}
Date Range: Last ${dateRange} days

SUMMARY:
- Total Jobs: ${reportData.summary.totalJobs}
- Total Revenue: $${reportData.summary.totalRevenue.toFixed(2)}
- Completion Rate: ${reportData.summary.completionRate}%
- Average Job Duration: ${reportData.summary.avgJobDuration} minutes

JOB STATUS BREAKDOWN:
${reportData.jobStats.map(stat => `- ${stat.status}: ${stat.count}`).join('\n')}

TECHNICIAN PERFORMANCE:
${reportData.technicianPerformance.map((tech: any) => 
  `- ${tech.name}: ${tech.jobs} jobs, $${tech.revenue.toFixed(2)} revenue`
).join('\n')}
    `;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `field-service-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Success",
      description: "Report downloaded successfully"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Analytics</h2>
          <p className="text-gray-600">Comprehensive business insights and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 3 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={generateReport}>
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold">{reportData.summary.totalJobs}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold">${reportData.summary.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-2xl font-bold">{reportData.summary.completionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Duration</p>
                <p className="text-2xl font-bold">{reportData.summary.avgJobDuration}m</p>
              </div>
              <Clock className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Job Status Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Job Status Distribution</CardTitle>
            <CardDescription>Breakdown of jobs by current status</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={reportData.jobStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over selected period</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={reportData.revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Customer Types */}
        <Card>
          <CardHeader>
            <CardTitle>Customer Types</CardTitle>
            <CardDescription>Distribution of residential vs commercial customers</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={reportData.customerTypes}
                  dataKey="count"
                  nameKey="type"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ type, percentage }) => `${type}: ${percentage}%`}
                >
                  {reportData.customerTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Technician Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Technician Performance</CardTitle>
            <CardDescription>Job completion and revenue by technician</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {reportData.technicianPerformance.slice(0, 5).map((tech: any, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <p className="font-medium">{tech.name}</p>
                    <p className="text-sm text-gray-600">{tech.jobs} jobs completed</p>
                  </div>
                  <Badge variant="outline">
                    ${tech.revenue.toFixed(2)}
                  </Badge>
                </div>
              ))}
              {reportData.technicianPerformance.length === 0 && (
                <p className="text-gray-500 text-center py-4">No performance data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ReportsAnalyticsFull;
