
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Receipt,
  CreditCard,
  PieChart
} from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";

const FinancialTracking = () => {
  const { toast } = useToast();
  const [financialData, setFinancialData] = useState({
    monthlyRevenue: 0,
    monthlyExpenses: 0,
    monthlyProfit: 0,
    profitMargin: 0,
    jobsCompleted: 0,
    averageJobValue: 0,
    outstandingInvoices: 0,
    paidInvoices: 0
  });
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      // Fetch completed jobs for current month
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      
      const { data: jobs, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          *,
          customers(name)
        `)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (jobsError) throw jobsError;

      // Filter jobs for current month
      const monthlyJobs = jobs?.filter(job => {
        const jobDate = new Date(job.completed_at || job.created_at);
        return jobDate.getMonth() === currentMonth && jobDate.getFullYear() === currentYear;
      }) || [];

      const monthlyRevenue = monthlyJobs.reduce((sum, job) => sum + (job.total_cost || 0), 0);
      const jobsCompleted = monthlyJobs.length;
      const averageJobValue = jobsCompleted > 0 ? monthlyRevenue / jobsCompleted : 0;

      // For this demo, we'll calculate expenses as 60% of revenue
      const monthlyExpenses = monthlyRevenue * 0.6;
      const monthlyProfit = monthlyRevenue - monthlyExpenses;
      const profitMargin = monthlyRevenue > 0 ? (monthlyProfit / monthlyRevenue) * 100 : 0;

      // Calculate outstanding vs paid invoices
      const paidInvoices = monthlyRevenue;
      const outstandingInvoices = monthlyRevenue * 0.15; // Assume 15% outstanding

      setFinancialData({
        monthlyRevenue,
        monthlyExpenses,
        monthlyProfit,
        profitMargin,
        jobsCompleted,
        averageJobValue,
        outstandingInvoices,
        paidInvoices
      });

      // Set recent transactions from completed jobs
      const recentJobTransactions = monthlyJobs.slice(0, 4).map(job => ({
        id: job.id,
        type: 'Invoice',
        customer: job.customers?.name || 'Unknown Customer',
        amount: job.total_cost || 0,
        status: 'Paid',
        date: new Date(job.completed_at || job.created_at).toLocaleDateString()
      }));

      setRecentTransactions(recentJobTransactions);

    } catch (error: any) {
      console.error('Error fetching financial data:', error);
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
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
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Tracking</h2>
        <p className="text-gray-600">Monitor revenue, expenses, and profitability</p>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Monthly Revenue</p>
                <p className="text-2xl font-bold">${financialData.monthlyRevenue.toFixed(0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Monthly Expenses</p>
                <p className="text-2xl font-bold">${financialData.monthlyExpenses.toFixed(0)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Net Profit</p>
                <p className="text-2xl font-bold">${financialData.monthlyProfit.toFixed(0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Profit Margin</p>
                <p className="text-2xl font-bold">{financialData.profitMargin.toFixed(1)}%</p>
              </div>
              <PieChart className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Performance Metrics
            </CardTitle>
            <CardDescription>Key financial indicators for this month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Profit Margin</span>
                <span className="font-medium">{financialData.profitMargin.toFixed(1)}%</span>
              </div>
              <Progress value={financialData.profitMargin} className="h-2" />
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Jobs Completed</span>
                <span className="font-bold text-green-600">{financialData.jobsCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Avg. Job Value</span>
                <span className="font-medium">${financialData.averageJobValue.toFixed(0)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Outstanding</span>
                <span className="font-medium text-yellow-600">${financialData.outstandingInvoices.toFixed(0)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Invoice Status
            </CardTitle>
            <CardDescription>Payment tracking and receivables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Paid Invoices</span>
                </div>
                <span className="font-bold text-green-600">${financialData.paidInvoices.toFixed(0)}</span>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-yellow-600" />
                  <span className="text-sm font-medium">Outstanding</span>
                </div>
                <span className="font-bold text-yellow-600">${financialData.outstandingInvoices.toFixed(0)}</span>
              </div>
              
              <div className="pt-2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600">Collection Rate</span>
                  <span className="font-medium">
                    {financialData.paidInvoices > 0 
                      ? ((financialData.paidInvoices / (financialData.paidInvoices + financialData.outstandingInvoices)) * 100).toFixed(1)
                      : 0
                    }%
                  </span>
                </div>
                <Progress 
                  value={financialData.paidInvoices > 0 
                    ? (financialData.paidInvoices / (financialData.paidInvoices + financialData.outstandingInvoices)) * 100
                    : 0
                  } 
                  className="h-2" 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Recent Transactions
          </CardTitle>
          <CardDescription>Latest financial activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">{transaction.customer}</h4>
                    <p className="text-sm text-gray-600">{transaction.date}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-green-600">
                    ${transaction.amount.toFixed(2)}
                  </p>
                  <Badge className="bg-green-100 text-green-800" variant="outline">
                    {transaction.status}
                  </Badge>
                </div>
              </div>
            ))}
            
            {recentTransactions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Receipt className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No transactions found</h3>
                <p>No completed jobs this month yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialTracking;
