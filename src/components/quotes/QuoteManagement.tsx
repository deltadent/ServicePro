import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Eye,
  Edit,
  Send,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  Download,
  Trash2
} from "lucide-react";
import { DataTable } from "@/components/ui/DataTable";
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
      const result = await fetchQuotesList({
        filters,
        sort_by: 'created_at',
        sort_order: 'desc',
        per_page: 50
      });
      
      setQuotes(result.quotes);
      
      if (result.from_cache) {
        toast({
          title: "Offline Mode",
          description: "Showing cached quotes. Connect to sync latest data.",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Failed to load quotes:', error);
      toast({
        title: "Error",
        description: "Failed to load quotes",
        variant: "destructive"
      });
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

  const handleConvertToJob = async (quote: Quote) => {
    try {
      const result = await convertQuoteToJob(quote.id);
      await loadQuotes();
      
      toast({
        title: "Quote Converted",
        description: `Quote ${quote.quote_number} has been converted to job`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to convert quote to job",
        variant: "destructive"
      });
    }
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
  const columns = [
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
        
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handlePreviewQuote(quote)}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </DropdownMenuItem>
              
              {quote.status === 'draft' && (
                <>
                  <DropdownMenuItem onClick={() => {
                    setSelectedQuote(quote);
                    setShowCreateDialog(true);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShareQuote(quote)}>
                    <Send className="w-4 h-4 mr-2" />
                    Share Quote
                  </DropdownMenuItem>
                </>
              )}
              
              {quote.status === 'approved' && (
                <DropdownMenuItem onClick={() => handleConvertToJob(quote)}>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Convert to Job
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => handleDeleteQuote(quote)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Quote
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quote Management</h1>
          <p className="text-muted-foreground">
            Create, manage, and track professional quotes
          </p>
        </div>
        
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Quote
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quotes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_quotes}</div>
              <div className="text-sm text-muted-foreground">
                ${statistics.total_quoted_amount.toFixed(0)} quoted
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approval Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.approval_rate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">
                {statistics.quotes_by_status.approved + statistics.quotes_by_status.converted} approved
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Average Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${statistics.average_quote_value.toFixed(0)}
              </div>
              <div className="text-sm text-muted-foreground">
                per quote
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Conversion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.conversion_rate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">
                {statistics.quotes_by_status.converted} converted
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search quotes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={statusFilter} 
              onValueChange={(value) => setStatusFilter(value as QuoteStatus | 'all')}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="viewed">Viewed</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Quotes ({quotes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={quotes}
            loading={loading}
            searchKey="quote_number"
            searchPlaceholder="Search quotes..."
          />
        </CardContent>
      </Card>

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
    </div>
  );
};

export default QuoteManagement;