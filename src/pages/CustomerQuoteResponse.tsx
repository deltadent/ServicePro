/**
 * Customer Quote Response Page
 * Allows customers to accept/reject quotes with scheduling preferences
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calendar,
  Clock,
  CreditCard,
  CheckCircle,
  XCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  FileText,
  DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useDevice } from "@/hooks/use-device";
import { fetchQuoteDetail } from "@/lib/quotesRepo";
import { 
  createQuoteResponse, 
  canRespondToQuote,
  validateQuoteResponse,
  formatTimeSlots,
  formatPreferredDates,
  getUserIP
} from "@/lib/quoteResponseRepo";
import { 
  Quote, 
  PaymentPreference, 
  TimeSlot,
  CreateQuoteResponseRequest
} from "@/lib/types/quotes";
import { format, addDays } from "date-fns";

// Form validation schema
const responseSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  customer_notes: z.string().optional(),
  payment_preference: z.enum(['pay_now', 'pay_later']).optional(),
  preferred_dates: z.array(z.string()).min(1, 'Select at least 1 preferred date').optional(),
  preferred_times: z.array(z.enum(['morning', 'afternoon', 'evening'])).min(2, 'Select at least 2 time slots').optional(),
}).refine(data => {
  if (data.status === 'accepted') {
    return data.payment_preference && data.preferred_dates && data.preferred_times;
  }
  if (data.status === 'rejected') {
    return data.customer_notes && data.customer_notes.length >= 10;
  }
  return true;
}, {
  message: "Required fields missing for the selected response",
});

type FormData = z.infer<typeof responseSchema>;

const CustomerQuoteResponse = () => {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isMobile } = useDevice();
  
  // State
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [canRespond, setCanRespond] = useState(false);
  const [responseSubmitted, setResponseSubmitted] = useState(false);

  // Form setup
  const form = useForm<FormData>({
    resolver: zodResolver(responseSchema),
    defaultValues: {
      status: 'accepted',
      customer_notes: '',
      payment_preference: 'pay_later',
      preferred_dates: [],
      preferred_times: []
    }
  });

  const watchStatus = form.watch('status');

  // Load quote data
  useEffect(() => {
    if (!quoteId) {
      navigate('/');
      return;
    }
    loadQuote();
  }, [quoteId]);

  const loadQuote = async () => {
    try {
      setLoading(true);
      
      // Check if customer can respond to this quote
      const canRespondCheck = await canRespondToQuote(quoteId!);
      setCanRespond(canRespondCheck);
      
      if (!canRespondCheck) {
        toast({
          title: "Cannot Respond",
          description: "This quote is no longer available for response",
          variant: "destructive"
        });
        return;
      }

      const { quote: quoteData } = await fetchQuoteDetail(quoteId!);
      setQuote(quoteData);
      
      // Mark quote as viewed if not already
      if (quoteData.status === 'sent') {
        // Update quote status to viewed
        // This would typically be handled by a separate API call
      }
      
    } catch (error) {
      console.error('Failed to load quote:', error);
      toast({
        title: "Error",
        description: "Failed to load quote details",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate available dates (next 30 days, excluding today)
  const availableDates = Array.from({ length: 30 }, (_, i) => {
    const date = addDays(new Date(), i + 1);
    return {
      value: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEEE, MMMM d, yyyy')
    };
  });

  // Time slot options
  const timeSlotOptions: { value: TimeSlot; label: string; description: string }[] = [
    { value: 'morning', label: 'Morning', description: '8:00 AM - 12:00 PM' },
    { value: 'afternoon', label: 'Afternoon', description: '12:00 PM - 5:00 PM' },
    { value: 'evening', label: 'Evening', description: '5:00 PM - 8:00 PM' }
  ];

  // Handle form submission
  const onSubmit = async (data: FormData) => {
    try {
      setSubmitting(true);

      const requestData: CreateQuoteResponseRequest = {
        quote_id: quoteId!,
        status: data.status,
        customer_notes: data.customer_notes,
        payment_preference: data.payment_preference,
        preferred_dates: data.preferred_dates,
        preferred_times: data.preferred_times,
        response_device_info: {
          ip_address: await getUserIP(),
          timestamp: new Date().toISOString()
        }
      };

      // Validate request
      const validationErrors = validateQuoteResponse(requestData);
      if (validationErrors.length > 0) {
        toast({
          title: "Validation Error",
          description: validationErrors[0],
          variant: "destructive"
        });
        return;
      }

      await createQuoteResponse(requestData);
      
      setResponseSubmitted(true);
      
      toast({
        title: data.status === 'accepted' ? "Quote Accepted" : "Quote Declined",
        description: "Your response has been submitted successfully. We'll contact you soon!",
      });

    } catch (error) {
      console.error('Failed to submit response:', error);
      toast({
        title: "Error",
        description: "Failed to submit your response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Loading quote details...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Cannot respond state or quote not found
  if (!canRespond || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Quote Not Available</h2>
              <p className="text-muted-foreground">
                {canRespond ?
                  "This quote cannot be found. Please check the link or contact our team." :
                  "This quote is no longer available for response. It may have expired or already been responded to."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (responseSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Response Submitted</h2>
              <p className="text-muted-foreground mb-4">
                Thank you for your response! We'll contact you soon to confirm the details.
              </p>
              <Button onClick={() => navigate('/')}>
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Quote Response - {quote.quote_number}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Service Details</h3>
                <p className="text-lg font-medium">{quote.title}</p>
                {quote.description && (
                  <p className="text-sm text-muted-foreground mt-1">{quote.description}</p>
                )}
              </div>
              <div>
                <h3 className="font-semibold mb-2">Quote Total</h3>
                <p className="text-2xl font-bold text-green-600">
                  ${quote.total_amount.toFixed(2)} SAR
                </p>
                {quote.valid_until && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Valid until: {format(new Date(quote.valid_until), 'PPP')}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Items */}
        <Card>
          <CardHeader>
            <CardTitle>Service Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {quote.quote_items?.map((item, index) => (
                <div key={index} className="flex justify-between items-start py-2 border-b last:border-b-0">
                  <div className="flex-1">
                    <h4 className="font-medium">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    <p className="text-sm">Qty: {item.quantity} × ${item.unit_price.toFixed(2)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(item.quantity * item.unit_price).toFixed(2)}</p>
                  </div>
                </div>
              ))}
              
              <Separator className="my-4" />
              
              <div className="space-y-2">
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
                {quote.tax_rate > 0 && (
                  <div className="flex justify-between">
                    <span>VAT ({(quote.tax_rate * 100).toFixed(1)}%):</span>
                    <span>${quote.tax_amount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span>${quote.total_amount.toFixed(2)} SAR</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Response Form */}
        <Card>
          <CardHeader>
            <CardTitle>Your Response</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Accept/Reject */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Response *</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="accepted">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                Accept Quote
                              </div>
                            </SelectItem>
                            <SelectItem value="rejected">
                              <div className="flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-red-500" />
                                Decline Quote
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Acceptance Fields */}
                {watchStatus === 'accepted' && (
                  <>
                    {/* Payment Preference */}
                    <FormField
                      control={form.control}
                      name="payment_preference"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Preference *</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pay_now">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4" />
                                    Pay Now (Online Payment)
                                  </div>
                                </SelectItem>
                                <SelectItem value="pay_later">
                                  <div className="flex items-center gap-2">
                                    <DollarSign className="w-4 h-4" />
                                    Pay Later (After Service)
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preferred Dates */}
                    <FormField
                      control={form.control}
                      name="preferred_dates"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Dates * (Select 1-3 dates)</FormLabel>
                          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto border rounded p-3">
                            {availableDates.slice(0, 14).map((date) => (
                              <div key={date.value} className="flex items-center space-x-2">
                                <Checkbox
                                  checked={field.value?.includes(date.value) || false}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      if (current.length < 3) {
                                        field.onChange([...current, date.value]);
                                      }
                                    } else {
                                      field.onChange(current.filter(v => v !== date.value));
                                    }
                                  }}
                                />
                                <label className="text-sm cursor-pointer">{date.label}</label>
                              </div>
                            ))}
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Selected: {formatPreferredDates(field.value)}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Preferred Times */}
                    <FormField
                      control={form.control}
                      name="preferred_times"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Time Slots * (Select 2-3 options)</FormLabel>
                          <div className="space-y-3">
                            {timeSlotOptions.map((option) => (
                              <div key={option.value} className="flex items-start space-x-3">
                                <Checkbox
                                  checked={field.value?.includes(option.value) || false}
                                  onCheckedChange={(checked) => {
                                    const current = field.value || [];
                                    if (checked) {
                                      field.onChange([...current, option.value]);
                                    } else {
                                      field.onChange(current.filter(v => v !== option.value));
                                    }
                                  }}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-medium">{option.label}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">{option.description}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {field.value && field.value.length > 0 && (
                            <div className="text-sm text-muted-foreground">
                              Selected: {formatTimeSlots(field.value)}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="customer_notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {watchStatus === 'rejected' ? 'Reason for Declining *' : 'Additional Notes (Optional)'}
                      </FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field}
                          placeholder={
                            watchStatus === 'rejected' 
                              ? "Please let us know why you're declining this quote..."
                              : "Any special requirements or questions..."
                          }
                          rows={4}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className={`flex-1 ${watchStatus === 'accepted' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  >
                    {submitting ? "Submitting..." : watchStatus === 'accepted' ? "Accept Quote" : "Decline Quote"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Terms */}
        {quote.terms_and_conditions && (
          <Card>
            <CardHeader>
              <CardTitle>Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {quote.terms_and_conditions.split('\n').map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default CustomerQuoteResponse;