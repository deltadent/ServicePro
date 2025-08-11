
import React from 'react';
import { Check, Clock, Play, Square } from 'lucide-react';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed';
}

interface JobWorkflowStepperProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  loading: boolean;
}

const JobWorkflowStepper = ({ currentStatus, onStatusChange, loading }: JobWorkflowStepperProps) => {
  const getWorkflowSteps = (): WorkflowStep[] => {
    const steps: WorkflowStep[] = [
      {
        id: 'scheduled',
        title: 'Job Scheduled',
        description: 'Job assigned and scheduled',
        status: 'completed'
      },
      {
        id: 'in_progress',
        title: 'Work in Progress',
        description: 'Technician working on site',
        status: currentStatus === 'scheduled' ? 'pending' : 
               currentStatus === 'in_progress' ? 'active' : 'completed'
      },
      {
        id: 'completed',
        title: 'Job Completed',
        description: 'Work finished and documented',
        status: currentStatus === 'completed' ? 'completed' : 'pending'
      }
    ];
    return steps;
  };

  const steps = getWorkflowSteps();

  const getStepIcon = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />;
      case 'active':
        return <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white" />;
      default:
        return <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />;
    }
  };

  const getStepColor = (step: WorkflowStep) => {
    switch (step.status) {
      case 'completed':
        return 'bg-green-500';
      case 'active':
        return 'bg-blue-500';
      default:
        return 'bg-gray-300';
    }
  };

  const canAdvanceToStep = (stepId: string) => {
    if (stepId === 'in_progress' && currentStatus === 'scheduled') return true;
    if (stepId === 'completed' && currentStatus === 'in_progress') return true;
    return false;
  };

  return (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4">Job Workflow</h3>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center text-center">
              <button
                onClick={() => canAdvanceToStep(step.id) && onStatusChange(step.id)}
                disabled={!canAdvanceToStep(step.id) || loading}
                className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center ${getStepColor(step)} 
                  ${canAdvanceToStep(step.id) && !loading ? 'hover:scale-105 cursor-pointer' : ''} 
                  transition-all duration-200`}
              >
                {getStepIcon(step)}
              </button>
              <p className="mt-2 text-xs sm:text-sm font-medium text-gray-900">{step.title}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 sm:mx-4 ${
                steps[index + 1].status === 'completed' || steps[index + 1].status === 'active' ? 'bg-green-500' : 'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default JobWorkflowStepper;
