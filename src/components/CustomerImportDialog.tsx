import React, { useState, useRef } from 'react';
import { ModernButton } from "@/components/ui/modern-button";
import { MotionDiv, MotionContainer } from "@/components/ui/motion";
import { ModernCard } from "@/components/ui/modern-card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, FileText, Download, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { importCustomersFromFile, previewCustomerImport } from '@/lib/customersRepo';
import { getCustomerCSVTemplate, getCustomerExcelTemplate } from '@/lib/utils/csv';
import { Customer } from './CustomerColumns';

interface CustomerImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (importedCount: number) => void;
}

interface ImportPreview {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  data: Partial<Customer>[];
  errors: string[];
}

const CustomerImportDialog: React.FC<CustomerImportDialogProps> = ({
  open,
  onOpenChange,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResults, setImportResults] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const allowedExtensions = ['.csv', '.xls', '.xlsx'];

    const isValidType = allowedTypes.includes(selectedFile.type) ||
                       allowedExtensions.some(ext => selectedFile.name.toLowerCase().endsWith(ext));

    if (!isValidType) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV or Excel file (.csv, .xls, .xlsx)",
        variant: "destructive"
      });
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 10MB",
        variant: "destructive"
      });
      return;
    }

    setFile(selectedFile);
    setPreview(null);
    setImportResults(null);
    previewFile(selectedFile);
  };

  const previewFile = async (selectedFile: File) => {
    setIsImporting(true);
    setImportProgress(20);

    try {
      const result = await previewCustomerImport(selectedFile);

      setImportProgress(100);

      const previewData: ImportPreview = {
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.totalRows - result.validRows,
        data: result.data.slice(0, 10), // Show first 10 rows
        errors: result.errors.slice(0, 5) // Show first 5 errors
      };

      setPreview(previewData);

      const duplicateText = result.duplicateCount > 0 ? `, ${result.duplicateCount} duplicates found` : '';
      toast({
        title: "File preview ready",
        description: `Found ${result.totalRows} rows, ${result.validRows} valid customers${duplicateText}`,
      });
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Failed to preview file",
        variant: "destructive"
      });
      setPreview(null);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    setIsImporting(true);
    setImportProgress(10);

    try {
      const result = await importCustomersFromFile(file);
      setImportProgress(100);
      setImportResults(result);

      if (result.success) {
        toast({
          title: "Import successful",
          description: `Successfully imported ${result.data.length} customers`,
        });
        onImportComplete?.(result.data.length);
        onOpenChange(false);
      } else {
        toast({
          title: "Import completed with errors",
          description: `${result.validRows} customers imported, ${result.errors.length} errors occurred`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  const downloadTemplate = (format: 'csv' | 'excel') => {
    try {
      if (format === 'csv') {
        const csvContent = getCustomerCSVTemplate();
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'customer_template.csv';
        link.click();
      } else {
        getCustomerExcelTemplate();
      }

      toast({
        title: "Template downloaded",
        description: `Customer ${format.toUpperCase()} template has been downloaded`,
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Failed to download template",
        variant: "destructive"
      });
    }
  };

  const resetDialog = () => {
    setFile(null);
    setPreview(null);
    setImportResults(null);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetDialog();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-xl border-white/20 shadow-2xl">
        <DialogHeader className="text-center pb-2">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent flex items-center justify-center gap-2">
            <Upload className="w-6 h-6 text-blue-600" />
            Import Customers
          </DialogTitle>
          <DialogDescription className="text-base text-gray-600 mt-2">
            Upload a CSV or Excel file to import customer data. Download the template first to ensure proper formatting.
          </DialogDescription>
        </DialogHeader>

        <MotionContainer className="space-y-6">
          {/* Modern Template Downloads */}
          <MotionDiv variant="fadeInUp" delay={0.1}>
            <ModernCard variant="glass" className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 border-blue-100">
              <div className="flex flex-col sm:flex-row gap-3">
                <ModernButton
                  variant="outline"
                  onClick={() => downloadTemplate('csv')}
                  className="flex-1 bg-white/80 hover:bg-white/90 border-white/40"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download CSV Template
                </ModernButton>
                <ModernButton
                  variant="outline"
                  onClick={() => downloadTemplate('excel')}
                  className="flex-1 bg-white/80 hover:bg-white/90 border-white/40"
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download Excel Template
                </ModernButton>
              </div>
            </ModernCard>
          </MotionDiv>

          {/* Modern File Upload */}
          <MotionDiv variant="fadeInUp" delay={0.2}>
            <ModernCard variant="floating" className="p-6 bg-gradient-to-br from-white/90 to-gray-50/50">
              <div className="space-y-4">
                <Label htmlFor="file-upload" className="text-base font-semibold text-gray-800">
                  Select File
                </Label>
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      ref={fileInputRef}
                      id="file-upload"
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      onChange={handleFileSelect}
                      disabled={isImporting}
                      className="cursor-pointer h-12 bg-white/80 border-gray-200 rounded-xl hover:bg-white/90 transition-all duration-200 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  {file && (
                    <MotionDiv variant="slideInLeft" className="flex items-center justify-center">
                      <Badge className="bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-green-200 px-3 py-2 rounded-xl flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="font-medium">{file.name}</span>
                      </Badge>
                    </MotionDiv>
                  )}
                </div>
                <p className="text-sm text-gray-500 bg-blue-50 rounded-lg p-3 border border-blue-100">
                  <span className="font-medium">Supported formats:</span> CSV, Excel (.xls, .xlsx) • <span className="font-medium">Maximum size:</span> 10MB
                </p>
              </div>
            </ModernCard>
          </MotionDiv>

          {/* Modern Import Progress */}
          {isImporting && (
            <MotionDiv variant="fadeInUp" delay={0.3}>
              <ModernCard variant="glass" className="p-6 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border-blue-200">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                      <Label className="text-base font-semibold text-gray-800">Processing your file...</Label>
                    </div>
                    <Badge className="bg-white/80 text-blue-700 font-bold px-3 py-1">
                      {importProgress}%
                    </Badge>
                  </div>
                  <div className="relative">
                    <Progress value={importProgress} className="h-3 bg-white/60" />
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-500 ease-out" 
                         style={{ width: `${importProgress}%` }} />
                  </div>
                </div>
              </ModernCard>
            </MotionDiv>
          )}

          {/* Preview */}
          {preview && !importResults && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Preview</h3>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    {preview.totalRows} total rows
                  </Badge>
                  <Badge variant="default">
                    {preview.validRows} valid
                  </Badge>
                  {preview.invalidRows > 0 && (
                    <Badge variant="destructive">
                      {preview.invalidRows} invalid
                    </Badge>
                  )}
                </div>
              </div>

              {preview.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {preview.errors.map((error, index) => (
                        <div key={index}>{error}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <ScrollArea className="h-64 border rounded">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.data.map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell>{customer.name || '-'}</TableCell>
                        <TableCell>{customer.email || '-'}</TableCell>
                        <TableCell>
                          {customer.phone_mobile ? customer.phone_mobile :
                           customer.phone_work || '-'}
                        </TableCell>
                        <TableCell>{customer.customer_type || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {customer.address || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <ModernButton 
                  variant="outline" 
                  onClick={() => setPreview(null)}
                  className="bg-white/80 hover:bg-white/90"
                >
                  Cancel
                </ModernButton>
                <ModernButton 
                  variant="gradient" 
                  onClick={handleImport} 
                  disabled={preview.validRows === 0}
                  leftIcon={<Upload className="w-4 h-4" />}
                >
                  Import {preview.validRows} Customers
                </ModernButton>
              </div>
            </div>
          )}

          {/* Import Results */}
          {importResults && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {importResults.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                <h3 className="text-lg font-semibold">Import Results</h3>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold">{importResults.totalRows}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-green-600">{importResults.validRows}</div>
                  <div className="text-sm text-muted-foreground">Imported</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-yellow-600">{importResults.duplicateCount || 0}</div>
                  <div className="text-sm text-muted-foreground">Duplicates</div>
                </div>
                <div className="text-center p-4 border rounded">
                  <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <ScrollArea className="h-32">
                      <div className="space-y-1">
                        {importResults.errors.map((error: string, index: number) => (
                          <div key={index}>{error}</div>
                        ))}
                      </div>
                    </ScrollArea>
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex justify-end">
                <ModernButton 
                  variant="gradient" 
                  onClick={() => handleOpenChange(false)}
                >
                  Close
                </ModernButton>
              </div>
            </div>
          )}

          {/* Modern Initial Upload Area */}
          {!file && !preview && !importResults && (
            <MotionDiv variant="fadeInUp" delay={0.4}>
              <ModernCard variant="glass" className="p-12 text-center bg-gradient-to-br from-gray-50/80 to-white/80 border-2 border-dashed border-gray-200 hover:border-blue-300 transition-all duration-300">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-3">
                  Drop your CSV or Excel file here
                </h3>
                <p className="text-gray-600 mb-4 text-base">
                  or click the "Select File" button above to browse
                </p>
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                  <p className="text-sm text-blue-700 font-medium">
                    💡 Make sure your file contains columns for Name, Email, Phone, and other customer details
                  </p>
                </div>
              </ModernCard>
            </MotionDiv>
          )}
        </MotionContainer>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerImportDialog;