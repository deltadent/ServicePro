import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Download,
  Send,
  Edit,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  User,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign,
  Package,
  Wrench,
  Clock
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/use-device";
import { Quote, QuoteItemType } from "@/lib/types/quotes";
import { sendQuote } from "@/lib/quotesRepo";
import { format } from "date-fns";
import { generateZatcaQuotePdf, DEFAULT_COMPANY_INFO } from "@/lib/utils/zatcaPdfGenerator";

interface QuotePreviewProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  isPublicView?: boolean; // For customer-facing view
}

const QuotePreview = ({ 
  quote, 
  isOpen, 
  onClose, 
  onEdit,
  isPublicView = false 
}: QuotePreviewProps) => {
  const { toast } = useToast();
  const { isMobile } = useDevice();
  const [loading, setLoading] = useState(false);

  const handleSendQuote = async () => {
    try {
      setLoading(true);
      await sendQuote(quote.id);
      
      toast({
        title: "Quote Sent",
        description: `Quote ${quote.quote_number} has been sent to ${quote.customer?.name}`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send quote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setLoading(true);
      const pdfDataUri = await generateZatcaQuotePdf(quote, DEFAULT_COMPANY_INFO, {
        language: 'both',
        includeQr: true,
        includeWatermark: false
      });
      
      // Create download link
      const link = document.createElement('a');
      link.href = pdfDataUri;
      link.download = `Quote_${quote.quote_number}_ZATCA.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "PDF Downloaded",
        description: `ZATCA-compliant quote ${quote.quote_number} downloaded successfully`,
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    await handleDownloadPdf();
  };

  const getStatusColor = () => {
    switch (quote.status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'viewed': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'declined': return 'bg-red-100 text-red-800';
      case 'expired': return 'bg-orange-100 text-orange-800';
      case 'converted': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getItemTypeIcon = (type: QuoteItemType) => {
    switch (type) {
      case 'service': return <Wrench className="w-4 h-4" />;
      case 'part': return <Package className="w-4 h-4" />;
      case 'labor': return <User className="w-4 h-4" />;
      case 'fee': return <DollarSign className="w-4 h-4" />;
      case 'discount': return <XCircle className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const formatAddress = (customer: any) => {
    if (!customer) return '';
    const parts = [
      customer.address,
      customer.city,
      customer.state,
      customer.zip_code
    ].filter(Boolean);
    return parts.join(', ');
  };

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className={`${
          isMobile ? 'max-w-full h-full' : 'max-w-4xl max-h-[90vh]'
        } overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Quote Preview</span>
            <Badge className={getStatusColor()}>
              {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Action Buttons - Only show for internal view */}
          {!isPublicView && (
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg">
              {quote.status === 'draft' && (
                <>
                  <Button 
                    onClick={onEdit} 
                    variant="outline"
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Quote
                  </Button>
                  <Button 
                    onClick={handleSendQuote}
                    disabled={loading}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {loading ? "Sending..." : "Send to Customer"}
                  </Button>
                </>
              )}
              
              <Button 
                onClick={handleDownloadPDF}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          )}

          {/* Quote Header */}
          <div className="text-center space-y-2 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
            <h1 className="text-3xl font-bold text-gray-900">QUOTE</h1>
            <div className="text-xl font-semibold text-blue-600">
              {quote.quote_number}
            </div>
            <div className="text-sm text-gray-600">
              Created on {format(new Date(quote.created_at), 'MMMM d, yyyy')}
            </div>
            {quote.valid_until && (
              <div className={`text-sm ${isExpired ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                <Clock className="w-4 h-4 inline mr-1" />
                Valid until {format(new Date(quote.valid_until), 'MMMM d, yyyy')}
                {isExpired && ' (EXPIRED)'}
              </div>
            )}
          </div>

          {/* Company and Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* From - Company Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">From</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-semibold text-lg">ServicePro</div>
                <div className="text-sm text-gray-600 space-y-1">
                  <div>Professional Field Services</div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    (555) 123-4567
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    info@servicepro.com
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 mt-0.5" />
                    <div>
                      123 Business St<br />
                      City, ST 12345
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* To - Customer Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">To</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="font-semibold text-lg">{quote.customer?.name}</div>
                <div className="text-sm text-gray-600 space-y-1">
                  {quote.customer?.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {quote.customer.email}
                    </div>
                  )}
                  {quote.customer?.phone_mobile && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {quote.customer.phone_mobile}
                    </div>
                  )}
                  {formatAddress(quote.customer) && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <div>{formatAddress(quote.customer)}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quote Title and Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{quote.title}</CardTitle>
            </CardHeader>
            {quote.description && (
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
              </CardContent>
            )}
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Services & Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Desktop table view */}
                {!isMobile && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 font-medium">Item</th>
                          <th className="text-center py-2 font-medium w-20">Qty</th>
                          <th className="text-right py-2 font-medium w-24">Price</th>
                          <th className="text-right py-2 font-medium w-24">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quote.quote_items?.map((item, index) => (
                          <tr key={item.id} className="border-b">
                            <td className="py-3">
                              <div className="flex items-start gap-3">
                                <div className="mt-1">
                                  {getItemTypeIcon(item.item_type)}
                                </div>
                                <div>
                                  <div className="font-medium">{item.name}</div>
                                  {item.description && (
                                    <div className="text-sm text-gray-600 mt-1">
                                      {item.description}
                                    </div>
                                  )}
                                  <Badge variant="secondary" className="text-xs mt-1">
                                    {item.item_type}
                                  </Badge>
                                </div>
                              </div>
                            </td>
                            <td className="text-center py-3">
                              {item.quantity}
                            </td>
                            <td className="text-right py-3">
                              ${item.unit_price.toFixed(2)}
                            </td>
                            <td className="text-right py-3 font-medium">
                              ${item.total_price.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Mobile card view */}
                {isMobile && (
                  <div className="space-y-3">
                    {quote.quote_items?.map((item, index) => (
                      <Card key={item.id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getItemTypeIcon(item.item_type)}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-600 mt-1">
                                  {item.description}
                                </div>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="secondary" className="text-xs">
                                  {item.item_type}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  Qty: {item.quantity}
                                </span>
                                <span className="text-sm text-gray-600">
                                  @ ${item.unit_price.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">
                              ${item.total_price.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>${quote.subtotal.toFixed(2)}</span>
                  </div>
                  
                  {quote.discount_amount > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>Discount:</span>
                      <span>-${quote.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between">
                    <span>Tax ({(quote.tax_rate * 100).toFixed(2)}%):</span>
                    <span>${quote.tax_amount.toFixed(2)}</span>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${quote.total_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms and Conditions */}
          {quote.terms_and_conditions && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                  {quote.terms_and_conditions}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Internal Notes - Only show for internal view */}
          {!isPublicView && quote.notes && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="text-orange-800">Internal Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-orange-700 whitespace-pre-wrap">
                  {quote.notes}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Status History - Only show for internal view */}
          {!isPublicView && (
            <Card>
              <CardHeader>
                <CardTitle>Quote History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <span>Created on {format(new Date(quote.created_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                  </div>
                  
                  {quote.sent_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span>Sent on {format(new Date(quote.sent_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                    </div>
                  )}
                  
                  {quote.viewed_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                      <span>Viewed on {format(new Date(quote.viewed_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                    </div>
                  )}
                  
                  {quote.approved_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span>Approved on {format(new Date(quote.approved_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                    </div>
                  )}
                  
                  {quote.declined_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                      <span>Declined on {format(new Date(quote.declined_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                      {quote.declined_reason && (
                        <span className="text-red-600">- {quote.declined_reason}</span>
                      )}
                    </div>
                  )}
                  
                  {quote.converted_at && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span>Converted to job on {format(new Date(quote.converted_at), 'MMM d, yyyy \'at\' h:mm a')}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Signature Display - For approved quotes */}
          {quote.customer_signature && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Customer Signature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border rounded-lg p-4 bg-gray-50">
                    <img 
                      src={quote.customer_signature.signature_data}
                      alt="Customer Signature"
                      className="max-h-20 mx-auto"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <div>Signed on: {format(new Date(quote.customer_signature.timestamp), 'MMMM d, yyyy \'at\' h:mm a')}</div>
                    {quote.customer_signature.device_info && (
                      <div>Device: {quote.customer_signature.device_info.device_type}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 pt-6 border-t">
            <p>Thank you for choosing ServicePro</p>
            <p>This quote is valid for {quote.valid_until ? `until ${format(new Date(quote.valid_until), 'MMMM d, yyyy')}` : '30 days'}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuotePreview;