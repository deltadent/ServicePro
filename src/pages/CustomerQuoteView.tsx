import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/use-device";
import {
  CheckCircle,
  XCircle,
  Download,
  Clock,
  AlertTriangle,
  Loader2,
  Phone,
  Mail,
  MapPin,
  FileText,
  User
} from "lucide-react";
import { getPublicQuote, approveQuote, declineQuote } from "@/lib/quotesRepo";
import { Quote } from "@/lib/types/quotes";
import { format } from "date-fns";
import QuoteSignaturePad from "@/components/quotes/QuoteSignaturePad";
import { getCompanyBranding, getCompanySettings } from "@/lib/companyRepo";

const CustomerQuoteView = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useDevice();

  // State
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [companyBranding, setCompanyBranding] = useState<any>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);

  useEffect(() => {
    if (quoteId) {
      loadQuote(quoteId);
    }
    loadCompanyBranding();
  }, [quoteId]);

  const loadCompanyBranding = async () => {
    try {
      const branding = await getCompanyBranding();
      setCompanyBranding(branding);
      
      const settings = await getCompanySettings();
      setCompanySettings(settings);
    } catch (error) {
      console.error('Failed to load company data:', error);
    }
  };

  const loadQuote = async (id: string) => {
    try {
      setLoading(true);
      const quoteData = await getPublicQuote(id);
      
      if (!quoteData) {
        toast({
          title: "Quote Not Found",
          description: "The quote you're looking for doesn't exist or is no longer available.",
          variant: "destructive"
        });
        navigate('/');
        return;
      }
      
      setQuote(quoteData);
    } catch (error) {
      console.error('Failed to load quote:', error);
      toast({
        title: "Error",
        description: "Failed to load quote details",
        variant: "destructive"
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (signatureData: string) => {
    if (!quote || !signatureData) return;

    try {
      setActionLoading(true);
      
      // Get device information
      const deviceInfo = {
        user_agent: navigator.userAgent,
        screen_resolution: `${window.screen.width}x${window.screen.height}`,
        device_type: isMobile ? 'mobile' : 'desktop' as const
      };

      await approveQuote(quote.id, {
        signature_data: signatureData,
        device_info: deviceInfo
      });

      toast({
        title: "Quote Approved!",
        description: "Thank you for approving this quote. We'll be in touch soon to schedule the work.",
        variant: "default"
      });

      // Refresh the quote data
      await loadQuote(quote.id);
      setShowSignaturePad(false);
      
    } catch (error) {
      console.error('Failed to approve quote:', error);
      toast({
        title: "Error",
        description: "Failed to approve quote. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!quote) return;

    try {
      setActionLoading(true);
      
      await declineQuote(quote.id, {
        reason: declineReason || undefined
      });

      toast({
        title: "Quote Declined",
        description: "We understand this quote wasn't right for you. Thank you for your time.",
        variant: "default"
      });

      // Refresh the quote data
      await loadQuote(quote.id);
      setShowDeclineForm(false);
      setDeclineReason('');
      
    } catch (error) {
      console.error('Failed to decline quote:', error);
      toast({
        title: "Error",
        description: "Failed to decline quote. Please try again.",
        variant: "destructive"
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote Not Found</h1>
          <p className="text-gray-600">The quote you're looking for doesn't exist or is no longer available.</p>
        </div>
      </div>
    );
  }

  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
  const canTakeAction = quote.status === 'sent' || quote.status === 'viewed';

  const getStatusBadge = () => {
    switch (quote.status) {
      case 'sent':
      case 'viewed':
        return <Badge className="bg-blue-100 text-blue-800">Pending Review</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'declined':
        return <Badge className="bg-red-100 text-red-800">Declined</Badge>;
      case 'expired':
        return <Badge className="bg-orange-100 text-orange-800">Expired</Badge>;
      case 'converted':
        return <Badge className="bg-purple-100 text-purple-800">In Progress</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{quote.status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quote Review</h1>
              <p className="text-gray-600">Review the details and take action on your quote</p>
            </div>
            {getStatusBadge()}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Expired Warning */}
        {isExpired && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <div>
                  <p className="font-semibold">This quote has expired</p>
                  <p className="text-sm">Please contact us for an updated quote.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        {canTakeAction && !isExpired && (
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h2 className="text-lg font-semibold text-gray-900">Ready to proceed?</h2>
                <p className="text-gray-600">
                  Please review the quote details below and let us know your decision.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    onClick={() => navigate(`/quote/${quote?.id}/respond`)}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Respond to Quote
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => window.print()}
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quote Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-gray-900">QUOTE</h1>
                <div className="text-xl font-semibold text-blue-600">
                  {quote.quote_number}
                </div>
                <div className="text-sm text-gray-600">
                  Created on {format(new Date(quote.created_at), 'MMMM d, yyyy')}
                </div>
              </div>
              
              {quote.valid_until && (
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
                  isExpired 
                    ? 'bg-red-100 text-red-700' 
                    : 'bg-yellow-100 text-yellow-700'
                }`}>
                  <Clock className="w-4 h-4" />
                  Valid until {format(new Date(quote.valid_until), 'MMMM d, yyyy')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Company Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>From {companyBranding?.company_name_en || 'ServicePro'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{companySettings?.phone || '+966 11 234 5678'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span>{companySettings?.email || 'info@servicepro.sa'}</span>
                </div>
              </div>
              <div>
                <div className="flex items-start gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    {companySettings?.address_en || '123 King Fahd Road'}<br />
                    {companySettings?.city || 'Riyadh'}, {companySettings?.region || 'Riyadh'} {companySettings?.postal_code || '11564'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{quote.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {quote.description && (
              <p className="text-gray-700 whitespace-pre-wrap mb-4">{quote.description}</p>
            )}
            
            <div className="text-sm text-gray-600">
              <p><strong>Prepared for:</strong> {quote.customer?.name}</p>
              {quote.customer?.email && (
                <p><strong>Email:</strong> {quote.customer.email}</p>
              )}
              {quote.customer?.phone_mobile && (
                <p><strong>Phone:</strong> {quote.customer.phone_mobile}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Services & Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {quote.quote_items?.map((item, index) => (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg gap-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {item.item_type}
                      </Badge>
                    </div>
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    <div className="text-sm text-gray-500">
                      Quantity: {item.quantity} × ${item.unit_price.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      ${item.total_price.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quote Total */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${quote.subtotal.toFixed(2)}</span>
              </div>
              
              {quote.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount:</span>
                  <span>-${quote.discount_amount.toFixed(2)}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span>Tax ({(quote.tax_rate * 100).toFixed(2)}%):</span>
                <span>${quote.tax_amount.toFixed(2)}</span>
              </div>
              
              <div className="border-t pt-3">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>${quote.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Conditions */}
        {quote.terms_and_conditions && (
          <Card className="mb-6">
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

        {/* Signature Display */}
        {quote.customer_signature && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Quote Approved
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-green-700">
                  This quote has been approved and signed on{' '}
                  {format(new Date(quote.customer_signature.timestamp), 'MMMM d, yyyy \'at\' h:mm a')}
                </p>
                <div className="border rounded-lg p-4 bg-white">
                  <img 
                    src={quote.customer_signature.signature_data}
                    alt="Customer Signature"
                    className="max-h-20 mx-auto"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Decline Reason Display */}
        {quote.status === 'declined' && quote.declined_reason && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-800">
                <XCircle className="w-5 h-5" />
                Quote Declined
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">
                <strong>Reason:</strong> {quote.declined_reason}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact Info */}
        <Card className="text-center">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-2">Questions about this quote?</h3>
            <p className="text-sm text-gray-600 mb-4">
              Don't hesitate to reach out with any questions or concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" asChild>
                <a href="tel:+15551234567">
                  <Phone className="w-4 h-4 mr-2" />
                  Call Us
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href="mailto:info@servicepro.com">
                  <Mail className="w-4 h-4 mr-2" />
                  Send Email
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Signature Pad Modal */}
      {showSignaturePad && (
        <QuoteSignaturePad
          onSignatureComplete={handleApprove}
          onCancel={() => setShowSignaturePad(false)}
          loading={actionLoading}
        />
      )}

      {/* Decline Form Modal */}
      {showDeclineForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Decline Quote</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Please let us know why you're declining this quote (optional):
              </p>
              <textarea
                className="w-full p-3 border rounded-lg resize-none"
                rows={4}
                placeholder="Reason for declining..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
              />
              <div className="flex gap-3">
                <Button
                  onClick={() => {
                    setShowDeclineForm(false);
                    setDeclineReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={actionLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDecline}
                  disabled={actionLoading}
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  {actionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Decline Quote"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerQuoteView;