
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Upload, 
  FileText, 
  Download,
  Clock,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon
} from "lucide-react";

interface JobDocumentationPanelProps {
  photos: any[];
  workNotes: string;
  setWorkNotes: (notes: string) => void;
  customerFeedback: string;
  setCustomerFeedback: (feedback: string) => void;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerateReport: () => void;
  uploadingPhoto: boolean;
  jobStatus: string;
  selectedPhotoType: 'before' | 'during' | 'after';
  setSelectedPhotoType: (type: 'before' | 'during' | 'after') => void;
}

const JobDocumentationPanel = ({
  photos,
  workNotes,
  setWorkNotes,
  customerFeedback,
  setCustomerFeedback,
  onPhotoUpload,
  onGenerateReport,
  uploadingPhoto,
  jobStatus,
  selectedPhotoType,
  setSelectedPhotoType
}: JobDocumentationPanelProps) => {
  const photoTypes = [
    { value: 'before' as const, label: 'Before Work', icon: Clock, color: 'bg-blue-100 text-blue-800' },
    { value: 'during' as const, label: 'Work Progress', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'after' as const, label: 'After Work', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
  ];

  const getPhotosByType = (type: string) => {
    return photos.filter(photo => photo.photo_type === type || (!photo.photo_type && type === 'during'));
  };

  const renderPhotoGrid = (photoType: string, title: string, color: string) => {
    const typePhotos = getPhotosByType(photoType);
    
    return (
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Badge className={color} variant="outline">{title}</Badge>
          <span className="text-sm text-gray-500">({typePhotos.length} photos)</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
          {typePhotos.map((photo) => (
            <div key={photo.id} className="relative group">
              <img
                src={photo.photo_url}
                alt={photo.description}
                className="w-full h-20 sm:h-24 object-cover rounded-lg border-2 border-gray-200 group-hover:border-blue-300 transition-colors"
              />
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 rounded-lg transition-all duration-200 flex items-center justify-center">
                <ImageIcon className="w-4 h-4 sm:w-6 sm:h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words">{photo.description}</p>
            </div>
          ))}
          {typePhotos.length === 0 && (
            <div className="col-span-2 sm:col-span-3 text-center py-4 sm:py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs sm:text-sm">No {title.toLowerCase()} photos yet</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Photo Documentation */}
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Camera className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
            Photo Documentation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6">
          {/* Photo Upload Section */}
          <div className="bg-gray-50 p-3 sm:p-4 rounded-lg">
            <div className="grid grid-cols-3 gap-2">
              {photoTypes.map((type) => (
                <Button
                  key={type.value}
                  variant="outline"
                  onClick={() => {
                    setSelectedPhotoType(type.value);
                    document.getElementById(`photo-upload-${type.value}`)?.click();
                  }}
                  disabled={uploadingPhoto || jobStatus === 'completed'}
                  className="flex flex-col h-20 items-center justify-center text-xs"
                >
                  <type.icon className="w-6 h-6 mb-1" />
                  {type.label}
                </Button>
              ))}
            </div>
            {photoTypes.map((type) => (
              <input
                key={type.value}
                id={`photo-upload-${type.value}`}
                type="file"
                accept="image/*"
                onChange={onPhotoUpload}
                className="hidden"
              />
            ))}
          </div>

          {/* Photo Galleries */}
          {renderPhotoGrid('before', 'Before Work', 'bg-blue-100 text-blue-800')}
          {renderPhotoGrid('during', 'Work Progress', 'bg-yellow-100 text-yellow-800')}
          {renderPhotoGrid('after', 'After Work', 'bg-green-100 text-green-800')}
        </CardContent>
      </Card>

      {/* Work Summary */}
      {jobStatus === 'in_progress' && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              Complete Job Documentation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="work-summary" className="text-sm">Work Summary & Notes</Label>
              <Textarea
                id="work-summary"
                value={customerFeedback}
                onChange={(e) => setCustomerFeedback(e.target.value)}
                placeholder="Describe the work completed, any issues found, recommendations for the customer, parts used, etc."
                rows={4}
                className="mt-1 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide detailed information about the work performed, any issues discovered, and recommendations.
              </p>
            </div>
            
          </CardContent>
        </Card>
      )}

      {/* Report Generation */}
      {jobStatus === 'completed' && (
        <Card>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              Job Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-3 sm:p-4 bg-green-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-green-800 text-sm sm:text-base">Job Completed Successfully</h4>
                <p className="text-xs sm:text-sm text-green-600 break-words">
                  Generate a professional report with all documentation and photos.
                </p>
              </div>
              <Button 
                onClick={onGenerateReport} 
                className="bg-green-600 hover:bg-green-700 text-sm w-full sm:w-auto"
                size="sm"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobDocumentationPanel;
