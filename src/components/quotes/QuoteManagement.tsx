import React, { useState, useEffect, useMemo } from 'react';
import { ModernButton } from "@/components/ui/modern-button";
import { StatsCard } from "@/components/ui/modern-card";
import { MotionDiv, MotionContainer, AnimatedPage } from "@/components/ui/motion";
import { PageHeader, ContentArea } from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/modern-skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Eye,
  Edit,
  Send,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Download,
  Trash2,
  TrendingUp,
  Users
} from "lucide-react";
import { ModernDataTable, ActionsCell } from "@/components/ui/modern-data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchQuotesList,
  sendQuote,
  convertQuoteToJob,
  getQuoteStatistics,
  deleteQuote
} from "@/lib/quotesRepo";
import { 
  Quote, 
  QuoteStatus, 
  QuoteFilters, 
  QuoteStatistics 
} from "@/lib/types/quotes";
import { format } from "date-fns";
import QuoteCreationDialog from "./QuoteCreationDialog";
import QuotePreview from "./QuotePreview";
import QuoteShareDialog from "./QuoteShareDialog";
import JobFromQuoteDialog from "./JobFromQuoteDialog";

const QuoteManagement = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  
  // State
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [statistics, setStatistics] = useState<QuoteStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showJobFromQuoteDialog, setShowJobFromQuoteDialog] = useState(false);

  // Filters
  const filters: QuoteFilters = useMemo(() => {
    const result: QuoteFilters = {};
    
    if (searchTerm) {
      result.search_term = searchTerm;
    }
    
    if (statusFilter !== 'all') {
      result.status = [statusFilter as QuoteStatus];
    }

    // Non-admin users only see their own quotes
    if (!isAdmin && user?.id) {
      result.created_by = user.id;
    }
    
    return result;
  }, [searchTerm, statusFilter, isAdmin, user?.id]);

  // Load data
  useEffect(() => {
    loadQuotes();
    loadStatistics();
  }, [filters]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      console.log('🔄 QuoteManagement: Starting quote fetch with filters:', filters);
      const result = await fetchQuotesList({
        filters,
        sort_by: 'created_at',
        sort_order: 'desc',
        per_page: 50
      });
      
      console.log('✅ QuoteManagement: Fetch result:', {
        quotesCount: result.quotes?.length,
        totalCount: result.total_count,
        fromCache: result.from_cache
      });
      
      setQuotes(result.quotes || []);
      
      if (result.from_cache) {
        toast({
          title: "Offline Mode",
          description: "Showing cached quotes. Connect to sync latest data.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('❌ QuoteManagement: Failed to load quotes:', error);
      console.error('❌ Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      });
      toast({
        title: "Error",
        description: `Failed to load quotes: ${error?.message || 'Unknown error'}. Check console for details.`,
        variant: "destructive"
      });
      
      // Set empty array to prevent undefined errors
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const stats = await getQuoteStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  };

  // Actions
  const handleShareQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowShareDialog(true);
  };

  const handleQuoteSent = async () => {
    if (!selectedQuote) return;
    
    try {
      await sendQuote(selectedQuote.id);
      await loadQuotes();
      
      toast({
        title: "Quote Sent",
        description: `Quote ${selectedQuote.quote_number} has been marked as sent`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive"
      });
    }
  };

  const handleConvertToJob = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowJobFromQuoteDialog(true);
  };

  const handleJobCreated = async (jobId: string) => {
    await loadQuotes();
    toast({
      title: "Job Created Successfully",
      description: `Job has been created from Quote #${selectedQuote?.quote_number}`,
    });
  };

  const handlePreviewQuote = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowPreview(true);
  };

  const handleDeleteQuote = async (quote: Quote) => {
    if (window.confirm(`Are you sure you want to delete quote ${quote.quote_number}? This action cannot be undone.`)) {
      try {
        // Delete quote from database
        await deleteQuote(quote.id);

        // Remove quote from local state
        setQuotes(quotes.filter(q => q.id !== quote.id));

        toast({
          title: "Quote Deleted",
          description: `Quote ${quote.quote_number} has been deleted successfully`,
        });

        // Refresh statistics
        loadStatistics();
      } catch (error) {
        console.error('Failed to delete quote:', error);
        toast({
          title: "Error",
          description: "Failed to delete quote",
          variant: "destructive"
        });
      }
    }
  };


  // Status badge styling
  const getStatusBadge = (status: QuoteStatus) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
      sent: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
      viewed: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200',
      approved: 'bg-green-100 text-green-800 hover:bg-green-200',
      declined: 'bg-red-100 text-red-800 hover:bg-red-200',
      expired: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
      converted: 'bg-purple-100 text-purple-800 hover:bg-purple-200'
    };

    const labels = {
      draft: 'Draft',
      sent: 'Sent',
      viewed: 'Viewed',
      approved: 'Approved',
      declined: 'Declined',
      expired: 'Expired',
      converted: 'Converted'
    };

    return (
      <Badge className={styles[status]} variant="secondary">
        {labels[status]}
      </Badge>
    );
  };

  // Table columns
  const columns: ColumnDef<Quote>[] = [
    {
      header: 'Quote #',
      accessorKey: 'quote_number',
      cell: ({ row }: { row: any }) => (
        <div className="font-medium">
          {row.original.quote_number}
        </div>
      )
    },
    {
      header: 'Customer',
      accessorKey: 'customer.name',
      cell: ({ row }: { row: any }) => (
        <div>
          <div className="font-medium">{row.original.customer?.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.customer?.email}
          </div>
        </div>
      )
    },
    {
      header: 'Title',
      accessorKey: 'title',
      cell: ({ row }: { row: any }) => (
        <div className="max-w-xs">
          <div className="font-medium truncate">{row.original.title}</div>
          {row.original.description && (
            <div className="text-sm text-muted-foreground truncate">
              {row.original.description}
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Amount',
      accessorKey: 'total_amount',
      cell: ({ row }: { row: any }) => (
        <div className="text-right">
          <div className="font-medium">
            ${row.original.total_amount.toFixed(2)}
          </div>
          <div className="text-sm text-muted-foreground">
            {row.original.quote_items?.length || 0} items
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: ({ row }: { row: any }) => getStatusBadge(row.original.status)
    },
    {
      header: 'Created',
      accessorKey: 'created_at',
      cell: ({ row }: { row: any }) => (
        <div className="text-sm">
          {format(new Date(row.original.created_at), 'MMM d, yyyy')}
        </div>
      )
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: { row: any }) => {
        const quote: Quote = row.original;
        
        const actions = [
          {
            label: 'Preview',
            icon: Eye,
            onClick: () => handlePreviewQuote(quote)
          },
          ...(quote.status === 'draft' ? [
            {
              label: 'Edit',
              icon: Edit,
              onClick: () => {
                setSelectedQuote(quote);
                setShowCreateDialog(true);
              }
            },
            {
              label: 'Share Quote',
              icon: Send,
              onClick: () => handleShareQuote(quote)
            }
          ] : []),
          ...(quote.status === 'approved' ? [
            {
              label: 'Convert to Job',
              icon: CheckCircle,
              onClick: () => handleConvertToJob(quote)
            }
          ] : []),
          {
            label: 'Delete Quote',
            icon: Trash2,
            onClick: () => handleDeleteQuote(quote),
            variant: 'destructive' as const
          }
        ];

        return <ActionsCell actions={actions} />;
      }
    }
  ];

  return (
    <AnimatedPage>
      <PageHeader 
        title="Quote Management" 
        description="Create, manage, and track professional quotes"
        actions={
          <ModernButton 
            onClick={() => setShowCreateDialog(true)}
            className="w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Quote
          </ModernButton>
        }
      />
      
      <ContentArea>
        {/* Statistics Cards */}
        {loading && !statistics ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : statistics ? (
          <MotionContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MotionDiv variant="scaleIn">
              <StatsCard
                title="Total Quotes"
                value={statistics.total_quotes}
                description={`$${statistics.total_quoted_amount.toFixed(0)} quoted`}
                icon={<FileText className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.1}>
              <StatsCard
                title="Approval Rate"
                value={`${statistics.approval_rate.toFixed(1)}%`}
                description={`${statistics.quotes_by_status.approved + statistics.quotes_by_status.converted} approved`}
                trend={{
                  value: statistics.approval_rate,
                  isPositive: statistics.approval_rate >= 50
                }}
                icon={<TrendingUp className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.2}>
              <StatsCard
                title="Average Value"
                value={`$${statistics.average_quote_value.toFixed(0)}`}
                description="per quote"
                icon={<DollarSign className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.3}>
              <StatsCard
                title="Conversion Rate"
                value={`${statistics.conversion_rate.toFixed(1)}%`}
                description={`${statistics.quotes_by_status.converted} converted`}
                trend={{
                  value: statistics.conversion_rate,
                  isPositive: statistics.conversion_rate >= 30
                }}
                icon={<CheckCircle className="w-5 h-5" />}
              />
            </MotionDiv>
          </MotionContainer>
        ) : null}

        {/* Data Table */}
        <MotionDiv variant="fadeInUp">
          <ModernDataTable
            columns={columns}
            data={quotes}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search quotes by number, customer, or title..."
            exportable={true}
            filterColumns={['quote_number', 'customer.name', 'title']}
          />
        </MotionDiv>
      </ContentArea>

      {/* Create Quote Dialog */}
      {showCreateDialog && (
        <QuoteCreationDialog
          isOpen={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setSelectedQuote(null);
          }}
          onSuccess={() => {
            loadQuotes();
            loadStatistics();
          }}
          existingQuote={selectedQuote}
        />
      )}

      {/* Preview Dialog */}
      {showPreview && selectedQuote && (
        <QuotePreview
          quote={selectedQuote}
          isOpen={showPreview}
          onClose={() => {
            setShowPreview(false);
            setSelectedQuote(null);
          }}
        />
      )}

      {/* Share Dialog */}
      {showShareDialog && selectedQuote && (
        <QuoteShareDialog
          quote={selectedQuote}
          isOpen={showShareDialog}
          onClose={() => {
            setShowShareDialog(false);
            setSelectedQuote(null);
          }}
          onSent={handleQuoteSent}
        />
      )}

      {/* Job From Quote Dialog */}
      {showJobFromQuoteDialog && selectedQuote && (
        <JobFromQuoteDialog
          quote={selectedQuote}
          isOpen={showJobFromQuoteDialog}
          onClose={() => {
            setShowJobFromQuoteDialog(false);
            setSelectedQuote(null);
          }}
          onJobCreated={handleJobCreated}
        />
      )}
    </AnimatedPage>
  );
};

export default QuoteManagement;