import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Play,
  CheckCircle,
  Clock,
  ArrowRight,
  MapPin,
  Wifi,
  WifiOff
} from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  subtitle: string;
  status: 'pending' | 'active' | 'completed';
  canActivate?: boolean;
}

interface JobWorkflowStepperNewProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  loading: boolean;
  online?: boolean;
}

const JobWorkflowStepperNew = ({ currentStatus, onStatusChange, loading, online = true }: JobWorkflowStepperNewProps) => {
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [
      {
        id: 'scheduled',
        title: 'Job Scheduled',
        subtitle: 'Ready to start when you arrive',
        status: currentStatus === 'scheduled' ? 'active' : 'completed',
        canActivate: false
      },
      {
        id: 'in_progress',
        title: 'Work in Progress',
        subtitle: 'Currently working on site',
        status: currentStatus === 'scheduled' ? 'pending' : (currentStatus === 'in_progress' ? 'active' : 'completed'),
        canActivate: currentStatus === 'scheduled'
      },
      {
        id: 'completed',
        title: 'Job Completed',
        subtitle: 'Work finished and documented',
        status: currentStatus === 'completed' ? 'completed' : 'pending',
        canActivate: currentStatus === 'in_progress'
      }
    ];
    return steps;
  };

  const steps = getWorkflowSteps();

  const handleStepClick = (stepId: string) => {
    if (loading || !online) return;

    const step = steps.find(s => s.id === stepId);
    if (step?.canActivate) {
      onStatusChange(stepId);
    }
  };

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="w-6 h-6 text-white" />;
      case 'active':
        return <Play className="w-6 h-6 text-white" />;
      default:
        return <Clock className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStepColor = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-600 hover:bg-green-700';
      case 'active':
        return 'bg-blue-600 hover:bg-blue-700';
      case 'pending':
        return step.canActivate && online ? 'bg-gray-200 hover:bg-gray-300' : 'bg-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <span className="font-semibold text-gray-900">Work Progress</span>
        </div>

        {!online && (
          <Badge variant="secondary" className="text-xs">
            <WifiOff className="w-3 h-3 mr-1" />
            Offline
          </Badge>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isClickable = step.canActivate && online && !loading;

          return (
            <Card
              key={step.id}
              className={`transition-all duration-200 ${
                isClickable ? 'cursor-pointer hover:shadow-md border-blue-200' : ''
              } ${
                step.status === 'active' ? 'border-blue-300 bg-blue-50' :
                step.status === 'completed' ? 'border-green-300 bg-green-50' : ''
              }`}
              onClick={() => handleStepClick(step.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Step Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getStepColor(step)}`}>
                    {getStepIcon(step)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{step.title}</h3>

                      {step.status === 'completed' && (
                        <Badge className="bg-green-100 text-green-800 text-xs">✓ Done</Badge>
                      )}
                      {step.status === 'active' && (
                        <Badge className="bg-blue-100 text-blue-800 text-xs">● Active</Badge>
                      )}
                    </div>

                    <p className="text-sm text-gray-600">{step.subtitle}</p>

                    {/* Action Button for clickable steps */}
                    {step.canActivate && online && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(step.id);
                          }}
                          disabled={loading}
                          className="w-full sm:w-auto"
                        >
                          {step.id === 'in_progress' ? 'Start Work' : 'Complete Job'}
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    )}

                    {/* Offline message */}
                    {step.canActivate && !online && (
                      <div className="mt-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 text-orange-800">
                          <WifiOff className="w-4 h-4" />
                          <span className="text-sm">Online required to {step.id === 'in_progress' ? 'start work' : 'complete job'}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="flex-shrink-0">
                    {step.status === 'completed' && (
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    )}
                    {step.status === 'active' && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Summary */}
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-gray-700">Current Status:</span>
              <span className="font-medium capitalize">
                {currentStatus.replace('_', ' ')}
              </span>
            </div>

            {!online && (
              <div className="flex items-center gap-1 text-gray-500">
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JobWorkflowStepperNew;