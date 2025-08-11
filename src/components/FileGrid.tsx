
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Image, 
  Folder, 
  Star, 
  MoreHorizontal,
  Download
} from "lucide-react";

const files = [
  {
    id: 1,
    name: "Project Proposal.pdf",
    type: "pdf",
    size: "2.4 MB",
    modified: "2 hours ago",
    starred: true,
    icon: FileText,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    id: 2,
    name: "Design Assets",
    type: "folder",
    size: "24 files",
    modified: "1 day ago",
    starred: false,
    icon: Folder,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: 3,
    name: "Screenshot_2024.png",
    type: "image",
    size: "1.8 MB",
    modified: "3 days ago",
    starred: true,
    icon: Image,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: 4,
    name: "Meeting Notes.docx",
    type: "document",
    size: "456 KB",
    modified: "1 week ago",
    starred: false,
    icon: FileText,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    id: 5,
    name: "Budget Spreadsheet.xlsx",
    type: "spreadsheet",
    size: "892 KB",
    modified: "2 weeks ago",
    starred: false,
    icon: FileText,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    id: 6,
    name: "Marketing Materials",
    type: "folder",
    size: "12 files",
    modified: "1 month ago",
    starred: true,
    icon: Folder,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
];

export function FileGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {files.map((file) => (
        <Card key={file.id} className="hover:shadow-md transition-all cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-lg ${file.bgColor}`}>
                <file.icon className={`w-5 h-5 ${file.color}`} />
              </div>
              <div className="flex items-center gap-1">
                {file.starred && (
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                )}
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-1">
              <h3 className="font-medium text-sm truncate">{file.name}</h3>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{file.size}</span>
                <span>{file.modified}</span>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3">
              <Badge variant="secondary" className="text-xs">
                {file.type}
              </Badge>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-3 h-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
