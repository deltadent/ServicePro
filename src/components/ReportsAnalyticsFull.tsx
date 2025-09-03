
import { useState, useEffect } from 'react';
import { ModernCard, StatsCard } from "@/components/ui/modern-card";
import { ModernButton } from "@/components/ui/modern-button";
import { MotionDiv, MotionContainer, AnimatedPage } from "@/components/ui/motion";
import { ModernSkeleton } from "@/components/ui/modern-skeleton";
import { AppShell, PageHeader, ContentArea } from "@/components/layout/AppShell";
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
      <AnimatedPage>
        <PageHeader 
          title="Reports & Analytics" 
          description="Comprehensive business insights and performance metrics"
        />
        <ContentArea>
          <MotionContainer className="space-y-8">
            {/* Summary Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <MotionDiv key={i} variant="scaleIn" delay={i * 0.1}>
                  <ModernCard variant="glass" className="p-6">
                    <ModernSkeleton className="h-16 w-full" />
                  </ModernCard>
                </MotionDiv>
              ))}
            </div>
            
            {/* Chart Skeletons */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <MotionDiv key={i} variant="fadeInUp" delay={i * 0.15}>
                  <ModernCard variant="glass" className="p-6">
                    <ModernSkeleton className="h-80 w-full" />
                  </ModernCard>
                </MotionDiv>
              ))}
            </div>
          </MotionContainer>
        </ContentArea>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage>
      <PageHeader 
        title="Reports & Analytics"
        description="Comprehensive business insights and performance metrics"
        actions={
          <div className="flex items-center space-x-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-48 bg-white/80 backdrop-blur-sm border-white/20 shadow-sm">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white/95 backdrop-blur-md border-white/20">
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 3 months</SelectItem>
                <SelectItem value="365">Last year</SelectItem>
              </SelectContent>
            </Select>
            <ModernButton 
              variant="gradient" 
              onClick={generateReport}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Download Report
            </ModernButton>
          </div>
        }
      />
      
      <ContentArea>
        <MotionContainer className="space-y-8">

          {/* Modern Summary Cards */}
          <MotionDiv variant="fadeInUp" delay={0.1}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <MotionDiv variant="scaleIn" delay={0.2}>
                <StatsCard
                  label="Total Jobs"
                  value={reportData.summary.totalJobs}
                  icon={<FileText className="w-6 h-6" />}
                  className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200 hover:shadow-lg transition-all duration-300"
                  variant="elevated"
                />
              </MotionDiv>
              
              <MotionDiv variant="scaleIn" delay={0.3}>
                <StatsCard
                  label="Total Revenue"
                  value={`$${reportData.summary.totalRevenue.toFixed(2)}`}
                  icon={<DollarSign className="w-6 h-6" />}
                  trend={{ value: 12, isPositive: true }}
                  className="bg-gradient-to-br from-green-50 to-emerald-100 border-green-200 hover:shadow-lg transition-all duration-300"
                  variant="elevated"
                />
              </MotionDiv>
              
              <MotionDiv variant="scaleIn" delay={0.4}>
                <StatsCard
                  label="Completion Rate"
                  value={`${reportData.summary.completionRate}%`}
                  icon={<TrendingUp className="w-6 h-6" />}
                  trend={{ value: reportData.summary.completionRate > 80 ? 5 : -2, isPositive: reportData.summary.completionRate > 80 }}
                  className="bg-gradient-to-br from-purple-50 to-violet-100 border-purple-200 hover:shadow-lg transition-all duration-300"
                  variant="elevated"
                />
              </MotionDiv>
              
              <MotionDiv variant="scaleIn" delay={0.5}>
                <StatsCard
                  label="Avg Duration"
                  value={`${reportData.summary.avgJobDuration}m`}
                  icon={<Clock className="w-6 h-6" />}
                  className="bg-gradient-to-br from-orange-50 to-amber-100 border-orange-200 hover:shadow-lg transition-all duration-300"
                  variant="elevated"
                />
              </MotionDiv>
            </div>
          </MotionDiv>

          {/* Modern Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Job Status Chart */}
            <MotionDiv variant="fadeInUp" delay={0.6}>
              <ModernCard variant="glass" className="bg-gradient-to-br from-white/80 to-blue-50/50 backdrop-blur-xl border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Job Status Distribution</h3>
                    <p className="text-gray-600">Breakdown of jobs by current status</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={reportData.jobStats} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                        <XAxis dataKey="status" tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '12px',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                          }} 
                        />
                        <Bar 
                          dataKey="count" 
                          fill="url(#blueGradient)" 
                          radius={[8, 8, 0, 0]}
                        />
                        <defs>
                          <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ModernCard>
            </MotionDiv>

            {/* Revenue Trend */}
            <MotionDiv variant="fadeInUp" delay={0.7}>
              <ModernCard variant="glass" className="bg-gradient-to-br from-white/80 to-green-50/50 backdrop-blur-xl border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Revenue Trend</h3>
                    <p className="text-gray-600">Daily revenue over selected period</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={reportData.revenueData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0f2fe" />
                        <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                        <Tooltip 
                          formatter={(value) => [`$${value}`, 'Revenue']}
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '12px',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="url(#greenGradient)" 
                          strokeWidth={3}
                          dot={{ fill: '#10b981', strokeWidth: 2, r: 6 }}
                          activeDot={{ r: 8, fill: '#059669' }}
                        />
                        <defs>
                          <linearGradient id="greenGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#10b981" />
                            <stop offset="100%" stopColor="#059669" />
                          </linearGradient>
                        </defs>
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ModernCard>
            </MotionDiv>

            {/* Customer Types */}
            <MotionDiv variant="fadeInUp" delay={0.8}>
              <ModernCard variant="glass" className="bg-gradient-to-br from-white/80 to-purple-50/50 backdrop-blur-xl border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Customer Types</h3>
                    <p className="text-gray-600">Distribution of residential vs commercial customers</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={reportData.customerTypes}
                          dataKey="count"
                          nameKey="type"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={40}
                          label={({ type, percentage }) => `${type}: ${percentage}%`}
                          labelLine={false}
                        >
                          {reportData.customerTypes.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={COLORS[index % COLORS.length]}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                            border: 'none', 
                            borderRadius: '12px',
                            backdropFilter: 'blur(8px)',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </ModernCard>
            </MotionDiv>

            {/* Technician Performance */}
            <MotionDiv variant="fadeInUp" delay={0.9}>
              <ModernCard variant="glass" className="bg-gradient-to-br from-white/80 to-orange-50/50 backdrop-blur-xl border-white/30 shadow-xl hover:shadow-2xl transition-all duration-500">
                <div className="p-6">
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-800 mb-2">Technician Performance</h3>
                    <p className="text-gray-600">Job completion and revenue by technician</p>
                  </div>
                  <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-white/40">
                    <div className="space-y-4 max-h-80 overflow-y-auto">
                      {reportData.technicianPerformance.slice(0, 5).map((tech: any, index) => (
                        <MotionDiv key={index} variant="slideInLeft" delay={index * 0.1}>
                          <div className="flex justify-between items-center p-4 bg-white/80 rounded-xl border border-white/40 hover:shadow-md transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                                <Users className="w-6 h-6 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800">{tech.name}</p>
                                <p className="text-sm text-gray-600">{tech.jobs} jobs completed</p>
                              </div>
                            </div>
                            <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 font-bold px-3 py-1">
                              ${tech.revenue.toFixed(2)}
                            </Badge>
                          </div>
                        </MotionDiv>
                      ))}
                      {reportData.technicianPerformance.length === 0 && (
                        <div className="text-center py-12">
                          <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-gray-400" />
                          </div>
                          <p className="text-gray-500 font-medium">No performance data available</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </ModernCard>
            </MotionDiv>
          </div>
        </MotionContainer>
      </ContentArea>
    </AnimatedPage>
  );
};

export default ReportsAnalyticsFull;
