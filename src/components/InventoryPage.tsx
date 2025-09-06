
import { useState, useEffect } from 'react';
import { ModernButton } from "@/components/ui/modern-button";
import { StatsCard } from "@/components/ui/modern-card";
import { ModernDataTable, ActionsCell } from "@/components/ui/modern-data-table";
import { MotionDiv, MotionContainer, AnimatedPage } from "@/components/ui/motion";
import { PageHeader, ContentArea } from "@/components/layout/AppShell";
import { SkeletonCard } from "@/components/ui/modern-skeleton";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle,
  Wrench,
  Zap,
  Droplets,
  Settings,
  Edit,
  DollarSign,
  TrendingDown,
  Grid
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from "@/hooks/use-toast";
import InventoryItemDialog from './InventoryItemDialog';
import { format } from "date-fns";

const InventoryPage = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('parts_inventory')
        .select('*')
        .order('name');

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.part_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= minStock) return { color: "bg-red-100 text-red-800", label: "Low Stock" };
    if (stock <= minStock * 1.5) return { color: "bg-yellow-100 text-yellow-800", label: "Medium" };
    return { color: "bg-green-100 text-green-800", label: "In Stock" };
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'ac parts':
      case 'hvac parts':
        return <Zap className="w-4 h-4" />;
      case 'plumbing tools':
      case 'plumbing parts':
        return <Droplets className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const lowStockCount = inventory.filter(item => item.stock_quantity <= item.min_stock_level).length;
  const totalValue = inventory.reduce((sum, item) => sum + (item.stock_quantity * item.unit_price), 0);
  const categories = new Set(inventory.map(item => item.category)).size;

  // Table columns
  const columns: ColumnDef<any>[] = [
    {
      header: 'Item Details',
      accessorKey: 'name',
      cell: ({ row }: { row: any }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.part_number}
          </div>
        </div>
      )
    },
    {
      header: 'Category',
      accessorKey: 'category',
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center gap-2">
          {getCategoryIcon(row.original.category)}
          <span>{row.original.category}</span>
        </div>
      )
    },
    {
      header: 'Stock Level',
      accessorKey: 'stock_quantity',
      cell: ({ row }: { row: any }) => {
        const item = row.original;
        const stockStatus = getStockStatus(item.stock_quantity, item.min_stock_level);
        return (
          <div className="text-center">
            <div className="font-medium">{item.stock_quantity}</div>
            <Badge className={stockStatus.color} variant="outline">
              {stockStatus.label}
            </Badge>
          </div>
        );
      }
    },
    {
      header: 'Min Stock',
      accessorKey: 'min_stock_level',
      cell: ({ row }: { row: any }) => (
        <div className="text-center font-medium">
          {row.original.min_stock_level}
        </div>
      )
    },
    {
      header: 'Unit Price',
      accessorKey: 'unit_price',
      cell: ({ row }: { row: any }) => (
        <div className="text-right font-medium">
          ${row.original.unit_price.toFixed(2)}
        </div>
      )
    },
    {
      header: 'Total Value',
      id: 'total_value',
      cell: ({ row }: { row: any }) => {
        const value = row.original.stock_quantity * row.original.unit_price;
        return (
          <div className="text-right font-medium">
            ${value.toFixed(2)}
          </div>
        );
      }
    },
    {
      header: 'Supplier',
      accessorKey: 'supplier',
      cell: ({ row }: { row: any }) => (
        <span className="text-sm">
          {row.original.supplier || 'N/A'}
        </span>
      )
    },
    {
      header: 'Actions',
      id: 'actions',
      cell: ({ row }: { row: any }) => {
        const item = row.original;
        
        const actions = [
          {
            label: 'Edit Item',
            icon: Edit,
            onClick: () => {
              // This will be handled by the InventoryItemDialog
            },
            disabled: !isAdmin
          }
        ];

        if (!isAdmin) return null;

        return (
          <InventoryItemDialog
            item={item}
            onItemSaved={fetchInventory}
            trigger={
              <ModernButton variant="ghost" size="sm">
                <Edit className="w-4 h-4" />
              </ModernButton>
            }
          />
        );
      }
    }
  ];

  return (
    <AnimatedPage>
      <PageHeader 
        title="Inventory Management" 
        description="Track parts, tools, and supplies"
        actions={
          isAdmin ? (
            <InventoryItemDialog onItemSaved={fetchInventory} />
          ) : undefined
        }
      />
      
      <ContentArea>
        {/* Statistics Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <MotionContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MotionDiv variant="scaleIn">
              <StatsCard
                title="Total Items"
                value={inventory.length}
                description="inventory items"
                icon={<Package className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.1}>
              <StatsCard
                title="Low Stock"
                value={lowStockCount}
                description="need restocking"
                trend={{
                  value: inventory.length > 0 ? Math.round((lowStockCount / inventory.length) * 100) : 0,
                  isPositive: false
                }}
                icon={<AlertTriangle className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.2}>
              <StatsCard
                title="Total Value"
                value={`$${totalValue.toFixed(0)}`}
                description="inventory worth"
                icon={<DollarSign className="w-5 h-5" />}
              />
            </MotionDiv>
            
            <MotionDiv variant="scaleIn" delay={0.3}>
              <StatsCard
                title="Categories"
                value={categories}
                description="different types"
                icon={<Grid className="w-5 h-5" />}
              />
            </MotionDiv>
          </MotionContainer>
        )}

        {/* Data Table */}
        <MotionDiv variant="fadeInUp">
          <ModernDataTable
            columns={columns}
            data={filteredInventory}
            loading={loading}
            searchable={true}
            searchPlaceholder="Search by name, part number, or category..."
            exportable={true}
            filterColumns={['name', 'part_number', 'category']}
          />
        </MotionDiv>
      </ContentArea>
    </AnimatedPage>
  );
};

export default InventoryPage;
