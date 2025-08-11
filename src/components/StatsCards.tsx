
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Image, Folder, HardDrive } from "lucide-react";

const stats = [
  {
    title: "Total Files",
    value: "2,847",
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Images",
    value: "1,234",
    icon: Image,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Folders",
    value: "156",
    icon: Folder,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
  },
  {
    title: "Storage Used",
    value: "45.2 GB",
    icon: HardDrive,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

export function StatsCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.title} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
