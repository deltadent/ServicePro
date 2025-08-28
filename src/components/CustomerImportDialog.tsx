import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
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
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Import Customers</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import customer data. Download the template first to ensure proper formatting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Downloads */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => downloadTemplate('csv')}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadTemplate('excel')}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Excel Template
            </Button>
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Select File</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                id="file-upload"
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleFileSelect}
                disabled={isImporting}
                className="cursor-pointer"
              />
              {file && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  {file.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Supported formats: CSV, Excel (.xls, .xlsx). Maximum file size: 10MB
            </p>
          </div>

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Processing...</Label>
                <span className="text-sm text-muted-foreground">{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
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

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPreview(null)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={preview.validRows === 0}>
                  Import {preview.validRows} Customers
                </Button>
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
                <Button onClick={() => handleOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Initial Upload Area */}
          {!file && !preview && !importResults && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium mb-2">Drop your CSV or Excel file here</p>
              <p className="text-muted-foreground mb-4">
                or click the "Select File" button above to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Make sure your file contains columns for Name, Email, Phone, and other customer details
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerImportDialog;