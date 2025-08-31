import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Minus,
  GripVertical,
  Package,
  Wrench,
  User,
  DollarSign,
  Calendar,
  FileText,
  Trash2,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useDevice } from "@/hooks/use-device";
import {
  createQuote,
  updateQuote,
  fetchQuoteTemplates,
} from "@/lib/quotesRepo";
import { supabase } from "@/integrations/supabase/client";
import {
  Quote,
  QuoteTemplate,
  QuoteItemType,
  CreateQuoteRequest,
  UpdateQuoteRequest,
} from "@/lib/types/quotes";
import { Customer } from "@/lib/db";
import { DEFAULT_VAT_RATE, calculateVatAmount, generateZatcaQrData } from "@/lib/utils/saudi";
import { getDefaultVatRate } from "@/lib/saudiRepo";
import { getCompanySettings, generateNextDocumentNumber, getCompanyBranding, getCompanyTemplates } from "@/lib/companyRepo";

// Form validation schema
const quoteFormSchema = z.object({
  customer_id: z.string().min(1, 'Customer is required'),
  template_id: z.string().optional(),
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  valid_until: z.string().nullable().optional(),
  terms_and_conditions: z.string().optional(),
  notes: z.string().optional(),
  tax_rate: z.number().min(0).max(1),
  discount_amount: z.number().min(0),
  items: z.array(z.object({
    item_type: z.enum(['service', 'part', 'labor', 'fee', 'discount']),
    name: z.string().min(1, 'Item name is required'),
    description: z.string().optional(),
    quantity: z.number().min(0.01, 'Quantity must be positive'),
    unit_price: z.number().min(0, 'Price must be non-negative'),
    inventory_item_id: z.string().optional(),
  })).min(1, 'At least one item is required'),
});

type FormData = z.infer<typeof quoteFormSchema>;

interface QuoteCreationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingQuote?: Quote | null;
}

const QuoteCreationDialog = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  existingQuote 
}: QuoteCreationDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { isMobile } = useDevice();
  
  // State
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [templates, setTemplates] = useState<QuoteTemplate[]>([]);
  const [companyTemplates, setCompanyTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuoteTemplate | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [companyBranding, setCompanyBranding] = useState<any>(null);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      customer_id: '',
      template_id: '',
      title: '',
      description: '',
      valid_until: null,
      terms_and_conditions: '',
      notes: '',
      tax_rate: DEFAULT_VAT_RATE, // 15% Saudi VAT rate
      discount_amount: 0,
      items: [{
        item_type: 'service',
        name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        inventory_item_id: ''
      }]
    }
  });

  const { fields, append, remove, move } = useFieldArray({
    control: form.control,
    name: 'items'
  });

  // Load data on mount
  useEffect(() => {
    loadCustomers();
    loadTemplates();
    loadCompanyTemplates();
    loadCompanySettings();
    loadCompanyBranding();
    
    if (existingQuote) {
      populateExistingQuote();
    }
  }, [existingQuote]);

  const loadCompanySettings = async () => {
    try {
      const settings = await getCompanySettings();
      setCompanySettings(settings);
      
      // Update tax rate from company settings if no existing quote
      if (settings && !existingQuote) {
        form.setValue('tax_rate', settings.default_vat_rate);
      }
    } catch (error) {
      console.error('Failed to load company settings:', error);
    }
  };

  const loadCompanyBranding = async () => {
    try {
      const branding = await getCompanyBranding();
      setCompanyBranding(branding);
    } catch (error) {
      console.error('Failed to load company branding:', error);
    }
  };

  // Load existing quote data
  const populateExistingQuote = () => {
    if (!existingQuote) return;

    form.reset({
      customer_id: existingQuote.customer_id,
      template_id: existingQuote.template_id || '',
      title: existingQuote.title,
      description: existingQuote.description || '',
      valid_until: existingQuote.valid_until || null,
      terms_and_conditions: existingQuote.terms_and_conditions || '',
      notes: existingQuote.notes || '',
      tax_rate: existingQuote.tax_rate,
      discount_amount: existingQuote.discount_amount,
      items: existingQuote.quote_items?.map(item => ({
        item_type: item.item_type,
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unit_price: item.unit_price,
        inventory_item_id: item.inventory_item_id || ''
      })) || []
    });
  };

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone_mobile, address, city, state, customer_type, short_address, zip_code, is_active, first_name, last_name, company_name, phone_work, preferred_contact, email_enabled, whatsapp_enabled')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Failed to load customers:', error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive"
      });
    }
  };

  const loadTemplates = async () => {
    try {
      const templates = await fetchQuoteTemplates(true);
      setTemplates(templates);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadCompanyTemplates = async () => {
    try {
      const templates = await getCompanyTemplates('quote');
      setCompanyTemplates(templates);
    } catch (error) {
      console.error('Failed to load company templates:', error);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    try {
      const template = templates.find(t => t.id === templateId);
      if (!template) return;

      setSelectedTemplate(template);

      // Update form with template data
      form.setValue('title', template.name);
      form.setValue('terms_and_conditions', template.default_terms || '');
      form.setValue('notes', template.default_notes || '');

      // Replace items with template items
      if (template.template_items && template.template_items.length > 0) {
        // More efficient way to clear all items: remove them in reverse order
        if (fields.length > 0) {
          // Remove all existing items at once by passing their indices
          const indicesToRemove = Array.from({ length: fields.length }, (_, i) => i);
          indicesToRemove.reverse().forEach(index => {
            remove(index);
          });
        }

        // Add template items
        const templateItems = template.template_items.map(item => ({
          item_type: item.item_type || 'service',
          name: item.name || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unit_price: item.unit_price || 0,
          inventory_item_id: ''
        }));

        // Use a small delay to ensure the remove operations are complete
        setTimeout(() => {
          templateItems.forEach(item => {
            append(item);
          });
        }, 0);
      }
    } catch (error) {
      console.error('Error applying template:', error);
      toast({
        title: "Error",
        description: "Failed to apply template. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Item management
  const addItem = (type: QuoteItemType = 'service') => {
    append({
      item_type: type,
      name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      inventory_item_id: ''
    });
  };

  const duplicateItem = (index: number) => {
    const item = fields[index];
    append({ ...item });
  };

  // Handle customer selection
  const handleCustomerChange = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer || null);
    
    if (customer) {
      // Adjust VAT rate based on customer's tax exempt status
      if (customer.tax_exempt) {
        form.setValue('tax_rate', 0);
        toast({
          title: "Tax Exempt Customer",
          description: "VAT rate set to 0% for tax-exempt customer",
        });
      } else {
        form.setValue('tax_rate', DEFAULT_VAT_RATE);
      }
    }
    
    form.setValue('customer_id', customerId);
  };

  // Calculate totals
  const calculateTotals = () => {
    const items = form.watch('items');
    const taxRate = form.watch('tax_rate');
    const discountAmount = form.watch('discount_amount');
    
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.quantity * item.unit_price);
    }, 0);
    
    const discountedSubtotal = Math.max(0, subtotal - discountAmount);
    const taxAmount = discountedSubtotal * taxRate;
    const total = discountedSubtotal + taxAmount;
    
    return { subtotal, taxAmount, total };
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  // Form submission
  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      if (existingQuote) {
        // Update existing quote
        const updateData: UpdateQuoteRequest = {
          title: data.title,
          description: data.description,
          valid_until: data.valid_until,
          terms_and_conditions: data.terms_and_conditions,
          notes: data.notes,
          tax_rate: data.tax_rate,
          discount_amount: data.discount_amount,
          items: data.items.map(item => ({
            item_type: item.item_type,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            inventory_item_id: item.inventory_item_id,
            sort_order: 0
          }))
        };

        await updateQuote(existingQuote.id, updateData);
        
        toast({
          title: "Quote Updated",
          description: `Quote has been updated successfully`,
        });
      } else {
        // Create new quote with ZATCA compliance using company settings
        const zatcaQrData = selectedCustomer && companySettings ? generateZatcaQrData({
          seller_name: companySettings.company_name_en || "ServicePro",
          vat_number: companySettings.vat_number || "300123456789003",
          invoice_date: new Date().toISOString(),
          total_amount: total,
          vat_amount: taxAmount
        }) : '';

        const quoteData: CreateQuoteRequest = {
          customer_id: data.customer_id,
          template_id: data.template_id || undefined,
          title: data.title,
          description: data.description,
          valid_until: data.valid_until,
          terms_and_conditions: data.terms_and_conditions,
          notes: data.notes,
          tax_rate: data.tax_rate,
          discount_amount: data.discount_amount,
          items: data.items.map(item => ({
            item_type: item.item_type,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            inventory_item_id: item.inventory_item_id,
            sort_order: 0
          }))
        };

        const createdQuote = await createQuote(quoteData);

        toast({
          title: "Quote Created",
          description: `Quote ${createdQuote.quote_number} has been created successfully`,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getItemTypeIcon = (type: QuoteItemType) => {
    switch (type) {
      case 'service': return <Wrench className="w-4 h-4" />;
      case 'part': return <Package className="w-4 h-4" />;
      case 'labor': return <User className="w-4 h-4" />;
      case 'fee': return <DollarSign className="w-4 h-4" />;
      case 'discount': return <Minus className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={`${isMobile ? 'max-w-full h-full' : 'max-w-4xl max-h-[90vh]'} overflow-y-auto`}>
        <DialogHeader>
          <DialogTitle>
            {existingQuote ? 'Edit Quote' : 'Create New Quote'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {isMobile ? (
              // Mobile accordion layout
              <Accordion type="single" collapsible defaultValue="basic">
                <AccordionItem value="basic">
                  <AccordionTrigger>Basic Information</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customer_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer *</FormLabel>
                          <Select onValueChange={handleCustomerChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {customers.map(customer => (
                                <SelectItem key={customer.id} value={customer.id}>
                                  <div>
                                    <div className="font-medium">{customer.name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {customer.email || customer.phone_mobile}
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      {customer.business_type && (
                                        <Badge variant="outline" className="text-xs">
                                          {customer.business_type}
                                        </Badge>
                                      )}
                                      {customer.vat_number && (
                                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                          VAT
                                        </Badge>
                                      )}
                                      {customer.tax_exempt && (
                                        <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                                          Tax Exempt
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Saudi Customer Information */}
                    {selectedCustomer && (selectedCustomer.vat_number || selectedCustomer.business_type || selectedCustomer.region) && (
                      <Card className="bg-muted/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline" className="text-xs">Saudi Business Customer</Badge>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            {selectedCustomer.business_type && (
                              <div>
                                <span className="text-muted-foreground">Type:</span> {selectedCustomer.business_type}
                              </div>
                            )}
                            {selectedCustomer.region && (
                              <div>
                                <span className="text-muted-foreground">Region:</span> {selectedCustomer.region}
                              </div>
                            )}
                            {selectedCustomer.vat_number && (
                              <div>
                                <span className="text-muted-foreground">VAT:</span> {selectedCustomer.vat_number.substring(0, 6)}***
                              </div>
                            )}
                            <div>
                              <span className="text-muted-foreground">VAT Rate:</span> {selectedCustomer.tax_exempt ? '0%' : '15%'}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <FormField
                      control={form.control}
                      name="template_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quote Template</FormLabel>
                          <Select 
                            onValueChange={(value) => {
                              field.onChange(value);
                              handleTemplateSelect(value);
                            }} 
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a template (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {templates.map(template => (
                                <SelectItem key={template.id} value={template.id}>
                                  <div>
                                    <div className="font-medium">{template.name}</div>
                                    {template.category && (
                                      <Badge variant="secondary" className="text-xs">
                                        {template.category}
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quote Title *</FormLabel>
                          <FormControl>
                           <Input
                             placeholder="e.g., HVAC System Installation"
                             {...field}
                           />
                         </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Detailed description of the work to be performed..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="valid_until"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid Until</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="items">
                  <AccordionTrigger>Services & Items ({fields.length})</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem('service')}
                      >
                        <Wrench className="w-4 h-4 mr-1" />
                        Service
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem('part')}
                      >
                        <Package className="w-4 h-4 mr-1" />
                        Part
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem('labor')}
                      >
                        <User className="w-4 h-4 mr-1" />
                        Labor
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addItem('fee')}
                      >
                        <DollarSign className="w-4 h-4 mr-1" />
                        Fee
                      </Button>
                    </div>

                    {fields.map((field, index) => (
                      <Card key={field.id} className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getItemTypeIcon(form.watch(`items.${index}.item_type`))}
                            <Badge variant="secondary">
                              {form.watch(`items.${index}.item_type`)}
                            </Badge>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => duplicateItem(index)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => remove(index)}
                              disabled={fields.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <FormField
                            control={form.control}
                            name={`items.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Item Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., HVAC Unit Installation" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name={`items.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="Additional details..."
                                    rows={2}
                                    {...field} 
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-2 gap-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Quantity</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      min="0.01"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.unit_price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Unit Price ($)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="text-right">
                            <div className="text-sm text-muted-foreground">Total:</div>
                            <div className="text-lg font-semibold">
                              ${(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unit_price`)).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="pricing">
                  <AccordionTrigger>Pricing & Totals</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tax_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tax Rate (%)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.0001"
                                min="0"
                                max="1"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="discount_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount ($)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01"
                                min="0"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Totals Summary */}
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Quote Summary</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex justify-between">
                          <span>Subtotal:</span>
                          <span>${subtotal.toFixed(2)}</span>
                        </div>
                        {form.watch('discount_amount') > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span>Discount:</span>
                            <span>-${form.watch('discount_amount').toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span>Tax ({(form.watch('tax_rate') * 100).toFixed(2)}%):</span>
                          <span>${taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold border-t pt-2">
                          <span>Total:</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="terms">
                  <AccordionTrigger>Terms & Notes</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="terms_and_conditions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Terms & Conditions</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Payment terms, warranty information, etc."
                              rows={4}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internal Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notes for internal use only..."
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            ) : (
              // Desktop layout
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main form content - 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Basic Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Customer and template selection - same as mobile */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="customer_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer *</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a customer" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {customers.map(customer => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      <div>
                                        <div className="font-medium">{customer.name}</div>
                                        <div className="text-sm text-muted-foreground">
                                          {customer.email || customer.phone_mobile}
                                        </div>
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="template_id"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Quote Template</FormLabel>
                              <Select 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  handleTemplateSelect(value);
                                }} 
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Choose template" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {templates.map(template => (
                                    <SelectItem key={template.id} value={template.id}>
                                      <div>
                                        <div className="font-medium">{template.name}</div>
                                        {template.category && (
                                          <Badge variant="secondary" className="text-xs">
                                            {template.category}
                                          </Badge>
                                        )}
                                      </div>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quote Title *</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., HVAC System Installation" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Detailed description of the work..."
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="valid_until"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid Until</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>

                  {/* Items */}
                  <Card>
                    <CardHeader>
                      <div className="flex justify-between items-center">
                        <CardTitle>Services & Items ({fields.length})</CardTitle>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem('service')}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {fields.map((field, index) => (
                        <Card key={field.id} className="p-4 border-l-4 border-l-blue-500">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                              {getItemTypeIcon(form.watch(`items.${index}.item_type`))}
                              <FormField
                                control={form.control}
                                name={`items.${index}.item_type`}
                                render={({ field }) => (
                                  <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="service">Service</SelectItem>
                                      <SelectItem value="part">Part</SelectItem>
                                      <SelectItem value="labor">Labor</SelectItem>
                                      <SelectItem value="fee">Fee</SelectItem>
                                      <SelectItem value="discount">Discount</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}
                              />
                            </div>
                            <div className="flex gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateItem(index)}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name={`items.${index}.name`}
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="Item name"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Qty</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      min="0.01"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`items.${index}.unit_price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Price ($)</FormLabel>
                                  <FormControl>
                                    <Input 
                                      type="number" 
                                      step="0.01"
                                      min="0"
                                      {...field}
                                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="mt-3">
                            <FormField
                              control={form.control}
                              name={`items.${index}.description`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description</FormLabel>
                                  <FormControl>
                                    <Textarea
                                      placeholder="Additional details..."
                                      rows={2}
                                      {...field}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>

                          <div className="text-right mt-2">
                            <div className="text-sm text-muted-foreground">Line Total:</div>
                            <div className="text-lg font-semibold">
                              ${(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unit_price`)).toFixed(2)}
                            </div>
                          </div>
                        </Card>
                      ))}

                      <div className="flex justify-center">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem('service')}
                          >
                            <Wrench className="w-4 h-4 mr-1" />
                            Service
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem('part')}
                          >
                            <Package className="w-4 h-4 mr-1" />
                            Part
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addItem('labor')}
                          >
                            <User className="w-4 h-4 mr-1" />
                            Labor
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Terms */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Terms & Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="terms_and_conditions"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Terms & Conditions</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Payment terms, warranty information..."
                                rows={4}
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Internal Notes</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Notes for internal use only..."
                                rows={3}
                                {...field} 
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* Sidebar - Pricing and Actions */}
                <div className="space-y-6">
                  <Card className="sticky top-6">
                    <CardHeader>
                      <CardTitle>Pricing</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="tax_rate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tax Rate</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.0001"
                                  min="0"
                                  max="1"
                                  placeholder="0.0825"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <div className="text-xs text-muted-foreground">
                                {(form.watch('tax_rate') * 100).toFixed(2)}%
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="discount_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  step="0.01"
                                  min="0"
                                  placeholder="0.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <div className="text-xs text-muted-foreground">
                                $USD
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Quote Summary */}
                      <div className="pt-4 border-t space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Subtotal:</span>
                          <span className="text-sm">${subtotal.toFixed(2)}</span>
                        </div>
                        {form.watch('discount_amount') > 0 && (
                          <div className="flex justify-between text-red-600">
                            <span className="text-sm">Discount:</span>
                            <span className="text-sm">-${form.watch('discount_amount').toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-sm">Tax:</span>
                          <span className="text-sm">${taxAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-lg font-bold pt-2 border-t">
                          <span>Total:</span>
                          <span>${total.toFixed(2)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto"
              >
                {loading ? "Saving..." : existingQuote ? "Update Quote" : "Create Quote"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteCreationDialog;