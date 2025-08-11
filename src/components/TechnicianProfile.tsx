
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Star,
  Award,
  Clock,
  Target,
  TrendingUp,
  Wrench,
  CheckCircle,
  Camera,
  Upload,
  Edit,
  Settings,
  Zap,
  Droplets,
  Wind
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TechnicianProfile = () => {
  const { toast } = useToast();
  
  const technician = {
    id: "TECH-001",
    name: "Mike Rodriguez",
    role: "Senior Field Technician",
    email: "mike.rodriguez@servicepro.com",
    phone: "(555) 123-4567",
    address: "Downtown Service Area",
    joinDate: "2022-03-15",
    certifications: ["EPA 608", "NATE Certified", "OSHA 10", "Plumbing License"],
    specialties: ["HVAC Systems", "Refrigeration", "Plumbing", "Electrical"],
    rating: 4.9,
    completedJobs: 847,
    onTimeRate: 96,
    customerSatisfaction: 4.8,
    efficiency: 94,
    avatar: "MR"
  };

  const monthlyStats = {
    jobsCompleted: 45,
    revenue: 12850,
    avgJobTime: 2.3,
    customerRating: 4.9,
    efficiency: 89,
    target: 50
  };

  const recentJobs = [
    { date: "2024-01-15", type: "AC Repair", customer: "Johnson Residence", status: "Completed", rating: 5 },
    { date: "2024-01-14", type: "Plumbing", customer: "Office Complex A", status: "Completed", rating: 5 },
    { date: "2024-01-13", type: "HVAC Maintenance", customer: "Smith Family", status: "Completed", rating: 4 },
    { date: "2024-01-12", type: "Emergency Repair", customer: "Downtown Mall", status: "Completed", rating: 5 },
    { date: "2024-01-11", type: "Installation", customer: "New Construction", status: "Completed", rating: 5 }
  ];

  const certificationColors = {
    "EPA 608": "bg-green-100 text-green-800",
    "NATE Certified": "bg-blue-100 text-blue-800", 
    "OSHA 10": "bg-red-100 text-red-800",
    "Plumbing License": "bg-purple-100 text-purple-800"
  };

  const getServiceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'ac repair':
      case 'emergency repair':
        return <Zap className="w-4 h-4" />;
      case 'plumbing':
        return <Droplets className="w-4 h-4" />;
      case 'hvac maintenance':
      case 'installation':
        return <Wind className="w-4 h-4" />;
      default:
        return <Wrench className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Technician Profile</h2>
          <p className="text-gray-600">Manage your profile and view performance metrics</p>
        </div>
        <Button variant="outline">
          <Edit className="w-4 h-4 mr-2" />
          Edit Profile
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Summary */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <Avatar className="w-24 h-24 mx-auto">
                <AvatarFallback className="bg-blue-600 text-white text-2xl">
                  {technician.avatar}
                </AvatarFallback>
              </Avatar>
              
              <div>
                <h3 className="text-xl font-bold text-gray-900">{technician.name}</h3>
                <p className="text-gray-600">{technician.role}</p>
                <p className="text-sm text-gray-500">ID: {technician.id}</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-center gap-2">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span className="font-medium">{technician.rating}/5.0 Rating</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span>{technician.completedJobs} Jobs Completed</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>{technician.onTimeRate}% On-Time Rate</span>
                </div>
              </div>

              <Button className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Update Photo
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Performance Overview */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              This Month's Performance
            </CardTitle>
            <CardDescription>Your key metrics for January 2024</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Jobs Progress</span>
                    <span className="font-medium">{monthlyStats.jobsCompleted}/{monthlyStats.target}</span>
                  </div>
                  <Progress value={(monthlyStats.jobsCompleted / monthlyStats.target) * 100} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    {monthlyStats.target - monthlyStats.jobsCompleted} jobs to target
                  </p>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Efficiency Rating</span>
                    <span className="font-medium">{monthlyStats.efficiency}%</span>
                  </div>
                  <Progress value={monthlyStats.efficiency} className="h-2" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Revenue Generated</span>
                  <span className="font-bold text-green-600">${monthlyStats.revenue.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg. Job Duration</span>
                  <span className="font-medium">{monthlyStats.avgJobTime}h</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Customer Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="font-medium">{monthlyStats.customerRating}/5.0</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="certifications">Certifications</TabsTrigger>
          <TabsTrigger value="activity">Recent Jobs</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" value={technician.email} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" value={technician.phone} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="address">Service Area</Label>
                  <Input id="address" value={technician.address} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="join-date">Join Date</Label>
                  <Input id="join-date" value={technician.joinDate} type="date" className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Specialties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="specialties">Areas of Expertise</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {technician.specialties.map((specialty, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700">
                          {specialty}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      placeholder="Describe your experience and expertise..."
                      className="mt-1 min-h-[100px]"
                      defaultValue="Senior technician with 8+ years of experience in HVAC, plumbing, and electrical systems. Specialized in commercial and residential service calls with a focus on customer satisfaction and efficient problem resolution."
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="certifications" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Professional Certifications</h3>
            <Button>
              <Upload className="w-4 h-4 mr-2" />
              Add Certification
            </Button>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {technician.certifications.map((cert, index) => (
              <Card key={index}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Award className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{cert}</h4>
                        <p className="text-sm text-gray-600">Valid until: 2025-12-31</p>
                      </div>
                    </div>
                    <Badge 
                      className={certificationColors[cert as keyof typeof certificationColors] || "bg-gray-100 text-gray-800"} 
                      variant="outline"
                    >
                      Active
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                Recent Job Activity
              </CardTitle>
              <CardDescription>Your last 5 completed jobs</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentJobs.map((job, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        {getServiceIcon(job.type)}
                      </div>
                      <div>
                        <h4 className="font-medium">{job.type}</h4>
                        <p className="text-sm text-gray-600">{job.customer}</p>
                        <p className="text-xs text-gray-500">{job.date}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800 mb-1" variant="outline">
                        {job.status}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span className="text-xs font-medium">{job.rating}/5</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Notification Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Job Assignments</span>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Schedule Changes</span>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Customer Messages</span>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Performance Reports</span>
                  <Button variant="outline" size="sm">Weekly</Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">App Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Auto-sync Photos</span>
                  <Button variant="outline" size="sm">On</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Offline Mode</span>
                  <Button variant="outline" size="sm">Available</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">GPS Tracking</span>
                  <Button variant="outline" size="sm">Enabled</Button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Dark Mode</span>
                  <Button variant="outline" size="sm">Off</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TechnicianProfile;
