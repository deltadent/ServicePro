import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FileText, Download, Eye } from 'lucide-react';
import { getCompanyBranding } from '@/lib/companyRepo';

interface TemplatePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateType: 'quote' | 'invoice';
}

// Template data structures for different template types
const TEMPLATE_STYLES = {
  standard: {
    name: 'Standard Template',
    description: 'Clean, professional layout with clear sections',
    layout: 'Traditional business document format',
    colors: { primary: '#000000', secondary: '#666666' },
    features: ['Company Header', 'Item Table', 'Tax Summary', 'Footer']
  },
  modern: {
    name: 'Modern Template',
    description: 'Contemporary design with accent colors',
    layout: 'Modern grid layout with visual hierarchy',
    colors: { primary: '#2563EB', secondary: '#64748B' },
    features: ['Branded Header', 'Visual Item Layout', 'Progress Indicators', 'Social Links']
  },
  minimal: {
    name: 'Minimal Template',
    description: 'Simple, text-focused layout',
    layout: 'Clean typography with minimal styling',
    colors: { primary: '#1F2937', secondary: '#9CA3AF' },
    features: ['Text Header', 'Simple Table', 'Basic Totals', 'Contact Info']
  },
  detailed: {
    name: 'Detailed Template',
    description: 'Comprehensive information display',
    layout: 'Extended format with additional sections',
    colors: { primary: '#059669', secondary: '#6B7280' },
    features: ['Extended Header', 'Detailed Items', 'Terms & Conditions', 'Payment Details']
  }
};

// Sample data for preview
const SAMPLE_DATA = {
  quote: {
    number: 'QUO-1001',
    date: '31/08/2025',
    validUntil: '30/09/2025',
    customer: {
      name: 'ABC Trading Company',
      nameAr: 'شركة إيه بي سي التجارية',
      vatNumber: '300123456789003',
      address: 'King Fahd Road, Riyadh 11564'
    },
    items: [
      { description: 'AC Installation Service', quantity: 2, rate: 500, amount: 1000 },
      { description: 'Electrical Wiring', quantity: 1, rate: 300, amount: 300 }
    ],
    subtotal: 1300,
    vatRate: 0.15,
    vatAmount: 195,
    total: 1495
  },
  invoice: {
    number: 'INV-2001',
    date: '31/08/2025',
    dueDate: '15/09/2025',
    customer: {
      name: 'XYZ Services Ltd',
      nameAr: 'شركة اكس واي زد للخدمات المحدودة',
      vatNumber: '300987654321003',
      address: 'Olaya Street, Riyadh 12213'
    },
    items: [
      { description: 'Maintenance Service', quantity: 3, rate: 250, amount: 750 },
      { description: 'Spare Parts', quantity: 5, rate: 80, amount: 400 }
    ],
    subtotal: 1150,
    vatRate: 0.15,
    vatAmount: 172.5,
    total: 1322.5
  },
  email: {
    subject: 'Follow-up: Your ServicePro Quote #QUO-1001',
    from: 'ServicePro Solutions <info@servicepro.sa>',
    to: 'customer@example.com',
    date: '31/08/2025',
    body: `Dear ABC Trading Company,

I hope this email finds you well. I wanted to follow up on the quote we provided for your AC Installation Service requirements.

Quote Details:
- Quote Number: QUO-1001
- Total Amount: SAR 1,495
- Valid Until: 30/09/2025

We are committed to providing you with the highest quality service at competitive prices. If you have any questions about our quote or would like to discuss any modifications, please don't hesitate to contact me.

We would be honored to serve you and look forward to the opportunity to work together.

Best regards,
Ahmed Al-Rashid
ServicePro Solutions`,
    footer: 'ServicePro Solutions | +966 11 234 5678 | info@servicepro.sa | servicepro.sa'
  }
};

export function TemplatePreviewModal({ 
  isOpen, 
  onClose, 
  templateId, 
  templateType 
}: TemplatePreviewModalProps) {
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadBranding();
    }
  }, [isOpen]);

  const loadBranding = async () => {
    try {
      const brandingData = await getCompanyBranding();
      setBranding(brandingData);
    } catch (error) {
      console.error('Error loading branding:', error);
    } finally {
      setLoading(false);
    }
  };

  const template = TEMPLATE_STYLES[templateId as keyof typeof TEMPLATE_STYLES];
  const sampleData = SAMPLE_DATA[templateType as keyof typeof SAMPLE_DATA];

  if (!template || !sampleData) return null;

  const renderTemplatePreview = () => {
    if (loading) {
      return <div className="flex justify-center py-12">Loading preview...</div>;
    }

    const primaryColor = branding?.primary_color || template.colors.primary;
    const secondaryColor = branding?.secondary_color || template.colors.secondary;

    // Email template preview
    if (templateType === 'email') {
      return (
        <div className="bg-white border rounded-lg p-6 max-h-[500px] overflow-y-auto">
          {/* Email Header */}
          <div className="border-b pb-4 mb-6">
            <div className="grid grid-cols-1 gap-2 text-sm">
              <div className="flex">
                <span className="font-medium w-16">From:</span>
                <span>{sampleData.from}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-16">To:</span>
                <span>{sampleData.to}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-16">Date:</span>
                <span>{sampleData.date}</span>
              </div>
              <div className="flex">
                <span className="font-medium w-16">Subject:</span>
                <span className="font-medium" style={{ color: primaryColor }}>
                  {sampleData.subject}
                </span>
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div className="mb-6">
            <div className="whitespace-pre-line text-sm leading-relaxed">
              {sampleData.body}
            </div>
          </div>

          {/* Email Footer */}
          <div className="border-t pt-4 text-center">
            <p className="text-xs text-gray-500">
              {sampleData.footer}
            </p>
          </div>
        </div>
      );
    }

    // Document template preview (quote/invoice)
    return (
      <div className="bg-white border rounded-lg p-6 max-h-[500px] overflow-y-auto">
        {/* Header Section */}
        <div className={`border-b pb-4 mb-6 ${templateId === 'modern' ? 'bg-gradient-to-r from-blue-50 to-gray-50 -m-6 p-6 mb-6' : ''}`}>
          <div className="flex justify-between items-start">
            <div>
              {branding?.logo_url && templateId !== 'minimal' && (
                <div className="mb-3">
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                    <FileText className="h-8 w-8 text-gray-400" />
                  </div>
                </div>
              )}
              <h1 style={{ color: primaryColor }} className="text-xl font-bold">
                {branding?.company_name_en || 'ServicePro Solutions'}
              </h1>
              {branding?.company_name_ar && (
                <p className="text-sm text-gray-600 rtl">{branding.company_name_ar}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                123 King Fahd Road, Riyadh 11564<br />
                +966 11 234 5678 | info@servicepro.sa
              </p>
            </div>
            <div className="text-right">
              <Badge 
                variant={templateType === 'quote' ? 'secondary' : 'default'} 
                className="mb-2"
              >
                {templateType.toUpperCase()}
              </Badge>
              <p className="font-bold text-lg" style={{ color: primaryColor }}>
                {sampleData.number}
              </p>
              <p className="text-sm text-gray-600">Date: {sampleData.date}</p>
              {templateType === 'quote' && sampleData.validUntil && (
                <p className="text-sm text-gray-600">Valid Until: {sampleData.validUntil}</p>
              )}
              {templateType === 'invoice' && sampleData.dueDate && (
                <p className="text-sm text-gray-600">Due Date: {sampleData.dueDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Customer Section */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3" style={{ color: primaryColor }}>
            Bill To:
          </h3>
          <div className={`p-3 rounded ${templateId === 'modern' ? 'bg-gray-50' : 'border'}`}>
            <p className="font-medium">{sampleData.customer?.name}</p>
            <p className="text-sm text-gray-600 rtl">{sampleData.customer?.nameAr}</p>
            <p className="text-sm text-gray-600">{sampleData.customer?.address}</p>
            <p className="text-sm text-gray-600">VAT: {sampleData.customer?.vatNumber}</p>
          </div>
        </div>

        {/* Items Section */}
        <div className="mb-6">
          <h3 className="font-semibold mb-3" style={{ color: primaryColor }}>
            {templateType === 'quote' ? 'Quoted Items:' : 'Items:'}
          </h3>
          <div className={`rounded ${templateId === 'minimal' ? 'border' : 'border bg-gray-50'}`}>
            <table className="w-full">
              <thead>
                <tr className={`${templateId !== 'minimal' ? 'bg-gray-100' : ''} border-b`}>
                  <th className="text-left p-3 text-sm font-medium" style={{ color: secondaryColor }}>
                    Description
                  </th>
                  <th className="text-center p-3 text-sm font-medium" style={{ color: secondaryColor }}>
                    Qty
                  </th>
                  <th className="text-right p-3 text-sm font-medium" style={{ color: secondaryColor }}>
                    Rate
                  </th>
                  <th className="text-right p-3 text-sm font-medium" style={{ color: secondaryColor }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {sampleData.items?.map((item: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="p-3 text-sm">{item.description}</td>
                    <td className="p-3 text-sm text-center">{item.quantity}</td>
                    <td className="p-3 text-sm text-right">SAR {item.rate}</td>
                    <td className="p-3 text-sm text-right font-medium">SAR {item.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-6">
          <div className={`w-64 ${templateId === 'detailed' ? 'border rounded p-4' : ''}`}>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>SAR {sampleData.subtotal}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>VAT (15%):</span>
                <span>SAR {sampleData.vatAmount}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold" style={{ color: primaryColor }}>
                <span>Total:</span>
                <span>SAR {sampleData.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        {templateId !== 'minimal' && (
          <div className="border-t pt-4 text-center">
            <p className="text-xs text-gray-500">
              Thank you for choosing ServicePro | Visit: servicepro.sa | Email: info@servicepro.sa
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            {template.name} - {templateType === 'quote' ? 'Quote' : 'Invoice'} Preview
          </DialogTitle>
        </DialogHeader>

        {/* Template Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-2">Layout Style</h4>
              <p className="text-xs text-muted-foreground">{template.layout}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-2">Color Scheme</h4>
              <div className="flex gap-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: template.colors.primary }}
                ></div>
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: template.colors.secondary }}
                ></div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold text-sm mb-2">Features</h4>
              <div className="flex flex-wrap gap-1">
                {template.features.slice(0, 2).map((feature) => (
                  <Badge key={feature} variant="outline" className="text-xs">
                    {feature}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {renderTemplatePreview()}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>
            <Download className="h-4 w-4 mr-2" />
            Download Sample PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}