
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  progress?: number;
  subtitle?: string;
}

export const PerformanceMetric = ({ 
  title, 
  value, 
  change, 
  changeType = "neutral", 
  progress,
  subtitle 
}: MetricProps) => {
  const getTrendIcon = () => {
    switch (changeType) {
      case "increase":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "decrease":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-gray-500";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <span className="text-2xl font-bold">{value}</span>
          {change !== undefined && (
            <div className={`flex items-center gap-1 ${getChangeColor()}`}>
              {getTrendIcon()}
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-500 mb-2">{subtitle}</p>
        )}
        {progress !== undefined && (
          <Progress value={progress} className="h-2" />
        )}
      </CardContent>
    </Card>
  );
};
