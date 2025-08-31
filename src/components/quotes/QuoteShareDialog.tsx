/**
 * Quote Share Dialog
 * Provides options to share quote via email, WhatsApp, or copy link
 */

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Copy,
  Mail,
  MessageSquare,
  ExternalLink,
  Check,
  Share2,
  Phone,
  User
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Quote } from "@/lib/types/quotes";
import { getCompanyBranding } from "@/lib/companyRepo";

interface QuoteShareDialogProps {
  quote: Quote;
  isOpen: boolean;
  onClose: () => void;
  onSent?: () => void;
}

const QuoteShareDialog = ({ quote, isOpen, onClose, onSent }: QuoteShareDialogProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [companyBranding, setCompanyBranding] = useState<any>(null);

  // Load company branding when dialog opens
  useEffect(() => {
    if (isOpen) {
      const loadBranding = async () => {
        try {
          const branding = await getCompanyBranding();
          setCompanyBranding(branding);
        } catch (error) {
          console.error('Failed to load company branding:', error);
        }
      };
      loadBranding();
    }
  }, [isOpen]);

  // Generate quote URLs
  const baseUrl = window.location.origin;
  const quoteViewUrl = `${baseUrl}/quote/${quote.id}`;
  const quoteResponseUrl = `${baseUrl}/quote/${quote.id}/respond`;

  // Customer information
  const customerName = quote.customer?.name || 'Customer';
  const customerPhone = quote.customer?.phone_mobile;
  const customerEmail = quote.customer?.email;
  const whatsappEnabled = quote.customer && 'whatsapp_enabled' in quote.customer 
    ? (quote.customer as any).whatsapp_enabled 
    : false;

  // Default message templates
  const emailSubject = `Quote ${quote.quote_number} - ${quote.title}`;
  const defaultMessage = `Hello ${customerName},

Your quote is ready! Here are the details:

Quote #: ${quote.quote_number}
Service: ${quote.title}
Total Amount: $${quote.total_amount.toFixed(2)} SAR
${quote.valid_until ? `Valid Until: ${new Date(quote.valid_until).toLocaleDateString('en-GB')}` : ''}

To view and respond to your quote, please click here:
${quoteResponseUrl}

You can also view the full quote details at:
${quoteViewUrl}

If you have any questions, please don't hesitate to contact us.

Best regards,
${companyBranding?.company_name_en || 'ServicePro'} Team`;

  // WhatsApp message (shorter format)
  const whatsappMessage = `Hello ${customerName}! 👋

Your ${companyBranding?.company_name_en || 'ServicePro'} quote is ready:
📋 Quote #${quote.quote_number}
🔧 ${quote.title}
💰 $${quote.total_amount.toFixed(2)} SAR

Click here to view and respond: ${quoteResponseUrl}

Questions? Just reply to this message!`;

  // Copy link to clipboard
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Could not copy to clipboard",
        variant: "destructive"
      });
    }
  };

  // Open email client
  const openEmailClient = () => {
    const mailtoUrl = `mailto:${customerEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(defaultMessage)}`;
    window.open(mailtoUrl, '_blank');
    
    if (onSent) onSent();
    toast({
      title: "Email Client Opened",
      description: "Please send the email from your email client",
    });
  };

  // Open WhatsApp
  const openWhatsApp = () => {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = customerPhone?.replace(/[^\d+]/g, '') || '';
    const whatsappUrl = `https://wa.me/${cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappUrl, '_blank');
    
    if (onSent) onSent();
    toast({
      title: "WhatsApp Opened",
      description: "Please send the message from WhatsApp",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5" />
            Share Quote {quote.quote_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 mt-0.5 text-muted-foreground" />
                <div className="flex-1">
                  <h3 className="font-semibold">{customerName}</h3>
                  <div className="text-sm text-muted-foreground space-y-1 mt-1">
                    {customerEmail && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        <span>{customerEmail}</span>
                      </div>
                    )}
                    {customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4" />
                        <span>{customerPhone}</span>
                        {whatsappEnabled && (
                          <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded">
                            WhatsApp
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quote Summary */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Quote Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Service:</span>
                <p className="font-medium">{quote.title}</p>
              </div>
              <div>
                <span className="text-blue-700">Total Amount:</span>
                <p className="font-bold text-lg">${quote.total_amount.toFixed(2)} SAR</p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* WhatsApp Button */}
            {customerPhone && whatsappEnabled && (
              <Button
                onClick={openWhatsApp}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Send WhatsApp
              </Button>
            )}

            {/* Email Button */}
            {customerEmail && (
              <Button
                onClick={openEmailClient}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Mail className="w-4 h-4 mr-2" />
                Send Email
              </Button>
            )}

            {/* Copy Response Link */}
            <Button
              onClick={() => copyToClipboard(quoteResponseUrl, "Response link")}
              variant="outline"
              className="border-gray-300"
            >
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copy Response Link
            </Button>
          </div>

          <Separator />

          {/* Manual Sharing Section */}
          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Manual Sharing
            </h3>

            {/* Quote Response URL */}
            <div>
              <Label htmlFor="response-url">Customer Response URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="response-url"
                  value={quoteResponseUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(quoteResponseUrl, "Response URL")}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Send this link to customers so they can accept/decline and schedule
              </p>
            </div>

            {/* Quote View URL */}
            <div>
              <Label htmlFor="view-url">Quote View URL (Read-only)</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="view-url"
                  value={quoteViewUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(quoteViewUrl, "View URL")}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Read-only link for viewing quote details
              </p>
            </div>

            {/* Email Template */}
            {customerEmail && (
              <div>
                <Label htmlFor="email-template">Email Template</Label>
                <Textarea
                  id="email-template"
                  value={defaultMessage}
                  readOnly
                  rows={12}
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copy this template for custom email sending
                </p>
              </div>
            )}

            {/* WhatsApp Template */}
            {customerPhone && whatsappEnabled && (
              <div>
                <Label htmlFor="whatsapp-template">WhatsApp Template</Label>
                <Textarea
                  id="whatsapp-template"
                  value={whatsappMessage}
                  readOnly
                  rows={8}
                  className="mt-1 font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Copy this template for custom WhatsApp sending
                </p>
              </div>
            )}
          </div>

          {/* Instructions */}
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-4">
              <h4 className="font-semibold text-amber-800 mb-2">💡 How to Share Quotes</h4>
              <ol className="text-sm text-amber-700 space-y-1 list-decimal list-inside">
                <li><strong>WhatsApp/Email:</strong> Click the buttons above to open your app with pre-filled message</li>
                <li><strong>Copy Links:</strong> Share the response URL so customers can accept/decline</li>
                <li><strong>Manual:</strong> Copy the templates below for custom messages</li>
                <li><strong>Follow Up:</strong> Check the quote status in Quote Management</li>
              </ol>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button 
              onClick={() => {
                if (onSent) onSent();
                onClose();
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              Mark as Sent
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteShareDialog;