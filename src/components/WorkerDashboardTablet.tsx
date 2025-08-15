import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Navigation, MoreVertical, FileText, Phone, MapPin, Play } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-destructive';
    case 'high': return 'bg-orange-500';
    case 'medium': return 'bg-yellow-500';
    case 'low': return 'bg-green-500';
    default: return 'bg-muted-foreground';
  }
};

const WorkerDashboardTablet = ({ jobs, handleViewDetails, openNavigation, callCustomer, startJob }: any) => {
  if (jobs.length === 0) {
    return (
      <Card className="p-8 text-center col-span-1 md:col-span-2 lg:col-span-3">
        <div className="text-muted-foreground text-sm">No jobs found</div>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {jobs.map((job: any) => (
        <Card key={job.id} className="overflow-hidden border-l-4 border-l-primary flex flex-col">
          <CardContent className="p-4 flex flex-col flex-grow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2 h-2 rounded-full ${getPriorityColor(job.priority)}`}></div>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {job.job_number}
                  </Badge>
                </div>
                <h3 className="font-medium text-sm leading-tight truncate">{job.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{job.customers?.name}</p>
              </div>
              <Badge
                variant="outline"
                className={`text-xs shrink-0 ${
                  job.status === 'scheduled' ? 'border-primary/30 text-primary bg-primary/10' :
                  job.status === 'in_progress' ? 'border-destructive/30 text-destructive bg-destructive/10' :
                  'border-muted-foreground/30'
                }`}
              >
                {job.status === 'scheduled' ? 'Scheduled' :
                 job.status === 'in_progress' ? 'In Progress' : job.status}
              </Badge>
            </div>

            <div className="flex-grow space-y-2 text-xs text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date(job.scheduled_date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                <span>{new Date(job.scheduled_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {job.customers?.short_address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{job.customers.short_address}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openNavigation(job)}
                className="flex-1 h-9 text-xs"
              >
                <Navigation className="w-3.5 h-3.5 mr-1.5" />
                Navigate
              </Button>
              {job.status === 'scheduled' && (
                <Button
                  size="sm"
                  onClick={() => startJob(job.id)}
                  className="flex-1 h-9 text-xs bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-3.5 h-3.5 mr-1.5" />
                  Start
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleViewDetails(job)}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Details</span>
                  </DropdownMenuItem>
                  {job.customers?.phone && (
                    <DropdownMenuItem onClick={() => callCustomer(job.customers.phone)}>
                      <Phone className="mr-2 h-4 w-4" />
                      <span>Call</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default WorkerDashboardTablet;
