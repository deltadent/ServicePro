
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, Clock, MapPin, Users, Wrench, Camera, CheckCircle, AlertCircle, Zap, Droplets } from "lucide-react";
import Dashboard from "@/components/Dashboard";
import JobManagement from "@/components/JobManagement";
import CustomerManagement from "@/components/CustomerManagement";
import InventoryPage from "@/components/InventoryPage";
import FinancialTracking from "@/components/FinancialTracking";
import TechnicianProfile from "@/components/TechnicianProfile";

const Index = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [user] = useState({
    name: "Mike Rodriguez",
    role: "Senior Technician",
    id: "TECH-001",
    avatar: "MR"
  });

  const todayStats = {
    scheduledJobs: 8,
    completedJobs: 5,
    inProgressJobs: 2,
    urgentJobs: 1,
    totalRevenue: 2450,
    efficiency: 87
  };

  const upcomingJobs = [
    {
      id: "J-2024-001",
      type: "AC Repair",
      customer: "Johnson Residence",
      address: "123 Maple St, Downtown",
      time: "9:00 AM",
      priority: "High",
      status: "Scheduled",
      icon: <Zap className="w-4 h-4" />
    },
    {
      id: "J-2024-002",
      type: "Plumbing",
      customer: "Office Complex A",
      address: "456 Business Ave",
      time: "11:30 AM",
      priority: "Medium",
      status: "In Progress",
      icon: <Droplets className="w-4 h-4" />
    },
    {
      id: "J-2024-003",
      type: "HVAC Maintenance",
      customer: "Smith Family",
      address: "789 Oak Road",
      time: "2:00 PM",
      priority: "Low",
      status: "Scheduled",
      icon: <Wrench className="w-4 h-4" />
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Scheduled": return "bg-blue-100 text-blue-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Completed": return "bg-green-100 text-green-800";
      case "Urgent": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High": return "bg-red-500";
      case "Medium": return "bg-yellow-500";
      case "Low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-2 rounded-lg">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">ServicePro</h1>
                <p className="text-sm text-gray-600">Field Service Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <CheckCircle className="w-3 h-3 mr-1" />
                Online
              </Badge>
              <Avatar>
                <AvatarFallback className="bg-blue-600 text-white">{user.avatar}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex bg-white border shadow-sm">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Customers</span>
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span className="hidden sm:inline">Inventory</span>
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-100 text-sm">Today's Jobs</p>
                      <p className="text-2xl font-bold">{todayStats.scheduledJobs}</p>
                    </div>
                    <CalendarDays className="w-8 h-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-100 text-sm">Completed</p>
                      <p className="text-2xl font-bold">{todayStats.completedJobs}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-yellow-100 text-sm">In Progress</p>
                      <p className="text-2xl font-bold">{todayStats.inProgressJobs}</p>
                    </div>
                    <Clock className="w-8 h-8 text-yellow-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-red-500 to-red-600 text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-red-100 text-sm">Urgent</p>
                      <p className="text-2xl font-bold">{todayStats.urgentJobs}</p>
                    </div>
                    <AlertCircle className="w-8 h-8 text-red-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Performance Overview */}
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    Today's Schedule
                  </CardTitle>
                  <CardDescription>Your assigned jobs for today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {upcomingJobs.map((job) => (
                      <div key={job.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3 flex-1">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            {job.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-gray-900 truncate">{job.type}</p>
                              <div className={`w-2 h-2 rounded-full ${getPriorityColor(job.priority)}`}></div>
                            </div>
                            <p className="text-sm text-gray-600 truncate">{job.customer}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {job.time}
                              </span>
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {job.address}
                              </span>
                            </div>
                          </div>
                        </div>
                        <Badge className={getStatusColor(job.status)} variant="secondary">
                          {job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    Performance
                  </CardTitle>
                  <CardDescription>Today's efficiency metrics</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Job Completion</span>
                      <span className="font-medium">{todayStats.efficiency}%</span>
                    </div>
                    <Progress value={todayStats.efficiency} className="h-2" />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Revenue Today</span>
                      <span className="font-bold text-green-600">${todayStats.totalRevenue}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Avg. Job Time</span>
                      <span className="font-medium">1.2h</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Customer Rating</span>
                      <span className="font-medium">4.8/5.0</span>
                    </div>
                  </div>

                  <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
                    <Camera className="w-4 h-4 mr-2" />
                    Quick Photo Upload
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="jobs">
            <JobManagement />
          </TabsContent>

          <TabsContent value="customers">
            <CustomerManagement />
          </TabsContent>

          <TabsContent value="inventory">
            <InventoryPage />
          </TabsContent>

          <TabsContent value="financials">
            <FinancialTracking />
          </TabsContent>

          <TabsContent value="profile">
            <TechnicianProfile />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
