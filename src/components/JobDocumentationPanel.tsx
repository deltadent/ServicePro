import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Camera,
  Upload,
  Plus,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  Download,
  Eye,
  Trash2
} from "lucide-react";

interface JobDocumentationPanelNewProps {
  photos: any[];
  workNotes: string;
  setWorkNotes: (notes: string) => void;
  customerFeedback: string;
  setCustomerFeedback: (feedback: string) => void;
  onPhotoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingPhoto: boolean;
  jobStatus: string;
  job: any;
  onGenerateReport: () => void;
  selectedPhotoType: 'before' | 'during' | 'after';
  setSelectedPhotoType: (type: 'before' | 'during' | 'after') => void;
}

const JobDocumentationPanelNew = ({
  photos,
  workNotes,
  setWorkNotes,
  customerFeedback,
  setCustomerFeedback,
  onPhotoUpload,
  uploadingPhoto,
  jobStatus,
  job,
  onGenerateReport,
  selectedPhotoType,
  setSelectedPhotoType
}: JobDocumentationPanelNewProps) => {
  const [expandedPhotos, setExpandedPhotos] = useState<boolean>(false);

  const photoTypes = [
    {
      value: 'before' as const,
      label: 'Before',
      description: 'Show work area before starting',
      icon: Camera,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      count: photos.filter(p => p.photo_type === 'before' || (!p.photo_type && false)).length
    },
    {
      value: 'during' as const,
      label: 'During',
      description: 'Document progress and work being done',
      icon: Camera,
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      count: photos.filter(p => p.photo_type === 'during' || (!p.photo_type && true)).length
    },
    {
      value: 'after' as const,
      label: 'After',
      description: 'Final results and completed work',
      icon: CheckCircle,
      color: 'bg-green-100 text-green-800 border-green-200',
      count: photos.filter(p => p.photo_type === 'after').length
    }
  ];

  const handlePhotoTypeUpload = (type: 'before' | 'during' | 'after') => {
    // First set the selected photo type
    setSelectedPhotoType(type);

    // Add a console log to debug
    console.log('Photo type selected:', type);

    // Find the file input element directly and click it
    const fileInput = document.getElementById(`photo-upload-${type}`) as HTMLInputElement;
    if (fileInput) {
      console.log('File input found, clicking it:', fileInput);
      fileInput.click();
    } else {
      console.error('File input not found for type:', type, `photo-upload-${type}`);
    }
  };

  const getPhotosByType = (type: string) => {
    return photos.filter(photo => photo.photo_type === type || (!photo.photo_type && type === 'during'));
  };

  // Generate report functionality - uses the onGenerateReport prop
  const handleGenerateReport = () => {
    if (onGenerateReport) {
      onGenerateReport();
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo Upload Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Camera className="w-5 h-5 text-blue-600" />
            Photo Documentation
          </CardTitle>
          <p className="text-sm text-gray-600">
            Add photos at different stages of your work
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {photoTypes.map((type) => (
              <Button
                key={type.value}
                variant="outline"
                onClick={() => handlePhotoTypeUpload(type.value)}
                disabled={uploadingPhoto || jobStatus === 'completed'}
                className={`h-auto p-4 flex flex-col items-center gap-2 ${type.color} hover:${type.color.replace('100', '200')}`}
              >
                <type.icon className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-medium text-sm">{type.label}</div>
                  <div className="text-xs opacity-75">{type.count} photos</div>
                </div>

                <input
                  id={`photo-upload-${type.value}`}
                  type="file"
                  accept="image/*"
                  onChange={onPhotoUpload}
                  className="hidden"
                />
              </Button>
            ))}
          </div>

          {/* Upload Status */}
          {uploadingPhoto && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="text-sm text-blue-800">Uploading photo...</span>
            </div>
          )}

          <Separator />

          {/* Photo Gallery */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-gray-900">
                Photo Gallery ({photos.length} photos)
              </h4>
              {photos.length > 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedPhotos(!expandedPhotos)}
                  className="text-xs"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {expandedPhotos ? 'Show Less' : 'Show All'}
                </Button>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <h4 className="font-medium mb-1">No photos yet</h4>
                <p className="text-sm">Add photos to document your work</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.slice(0, expandedPhotos ? undefined : 6).map((photo, index) => (
                  <div key={photo.id || index} className="group relative">
                    <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 group-hover:border-blue-300 transition-colors">
                      <img
                        src={photo.photo_url}
                        alt={photo.description || 'Job photo'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />

                      {/* Overlay with details */}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <ImageIcon className="w-6 h-6 text-white" />
                        </div>
                      </div>

                      {/* Photo type badge */}
                      <div className="absolute top-2 left-2">
                        <Badge
                          className={`text-xs ${
                            photo.photo_type === 'before' ? 'bg-blue-100 text-blue-800' :
                            photo.photo_type === 'after' ? 'bg-green-100 text-green-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {photo.photo_type || 'during'}
                        </Badge>
                      </div>
                    </div>

                    {/* Caption */}
                    {photo.description && (
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2 break-words">
                        {photo.description}
                      </p>
                    )}
                  </div>
                ))}

                {/* Show more button when collapsed */}
                {!expandedPhotos && photos.length > 6 && (
                  <div className="aspect-square bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="text-center">
                      <Plus className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                      <span className="text-xs text-gray-500">+{photos.length - 6} more</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Summary (only for in-progress jobs) */}
      {jobStatus === 'in_progress' && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5 text-blue-600" />
              Work Summary
            </CardTitle>
            <p className="text-sm text-gray-600">
              Document your work and provide customer information
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="work-summary" className="text-sm font-medium">
                Work Summary & Notes
              </Label>
              <Textarea
                id="work-summary"
                value={customerFeedback}
                onChange={(e) => setCustomerFeedback(e.target.value)}
                placeholder="Describe the work completed, any issues found, recommendations for the customer, etc."
                rows={4}
                className="mt-1 resize-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Provide detailed information about the work performed, issues discovered, and recommendations.
              </p>
            </div>

            {/* Additional Notes */}
            <div>
              <Label htmlFor="work-notes" className="text-sm font-medium">
                Additional Notes (Optional)
              </Label>
              <Textarea
                id="work-notes"
                value={workNotes}
                onChange={(e) => setWorkNotes(e.target.value)}
                placeholder="Internal notes for your team..."
                rows={3}
                className="mt-1 resize-none"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Generation (for completed jobs) */}
      {jobStatus === 'completed' && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-green-800">Job Completed!</h3>
                  <p className="text-sm text-green-700">Generate a professional report</p>
                </div>
              </div>

              <Button
                onClick={handleGenerateReport}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate Report
              </Button>
            </div>

            <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
              <p className="text-sm text-gray-700">
                This report will include all photos, work summary, and completed checklist items.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default JobDocumentationPanelNew;