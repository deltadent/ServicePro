"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Mail, MessageCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Edit, Archive, Trash2 } from "lucide-react"
import { getCustomerDisplayName, whatsAppLink } from "@/lib/communication"
import { getCustomerDisplayNameArabic, formatBilingualText } from "@/lib/utils/saudi"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Customer = {
  id: string
  name: string
  customer_type: "residential" | "commercial"
  email: string | null
  address: string | null
  short_address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  is_active: boolean
  created_at?: string // Added for date filtering
  updated_at?: string
  // New fields for person/company support and communication settings
  first_name?: string | null
  last_name?: string | null
  company_name?: string | null
  phone_mobile?: string | null
  phone_work?: string | null
  preferred_contact?: 'mobile' | 'work' | 'email' | 'whatsapp' | null
  email_enabled: boolean
  whatsapp_enabled: boolean
  tags?: string[] | null
  country?: string | null
  // Saudi market specific fields
  vat_number?: string | null
  commercial_registration?: string | null
  business_type?: 'individual' | 'establishment' | 'company' | 'non_profit' | 'government' | null
  saudi_id?: string | null
  arabic_name?: string | null
  arabic_address?: string | null
  tax_exempt?: boolean
  customer_category?: 'b2b' | 'b2c' | 'vip' | 'government' | null
  payment_terms_days?: number
  credit_limit?: number
  preferred_language?: 'en' | 'ar'
  region?: string | null
}

export const getColumns = (
  handleEdit: (customer: Customer) => void,
  handleArchive: (customer: Customer) => void,
  handleDelete: (customerId: string) => void
): ColumnDef<Customer>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const customer = row.original
      const displayName = getCustomerDisplayNameArabic(customer)
      return (
        <div className="space-y-1">
          <div className="font-medium">{displayName}</div>
          <div className="flex gap-1 flex-wrap">
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
            {customer.whatsapp_enabled && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                WhatsApp
              </Badge>
            )}
            {customer.email_enabled && (
              <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-800">
                Email
              </Badge>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "customer_type",
    header: "Type",
    cell: ({ row }) => {
      const customer = row.original
      return (
        <div className="space-y-1">
          <div className="capitalize font-medium">{customer.customer_type}</div>
          {customer.region && (
            <div className="text-xs text-muted-foreground">{customer.region}</div>
          )}
          {customer.customer_category && (
            <Badge variant="outline" className="text-xs">
              {customer.customer_category?.toUpperCase()}
            </Badge>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "saudi_info",
    header: "Saudi Business Info",
    cell: ({ row }) => {
      const customer = row.original
      if (customer.customer_type === 'residential') {
        return (
          <div className="text-sm text-muted-foreground">
            {customer.saudi_id ? (
              <div className="space-y-1">
                <div className="text-xs">ID: {customer.saudi_id.substring(0, 4)}****</div>
                {customer.preferred_language === 'ar' && (
                  <Badge variant="secondary" className="text-xs">العربية</Badge>
                )}
              </div>
            ) : (
              'No Saudi info'
            )}
          </div>
        )
      }
      
      return (
        <div className="space-y-1">
          {customer.vat_number && (
            <div className="text-xs font-mono">
              VAT: {customer.vat_number.substring(0, 6)}***
            </div>
          )}
          {customer.commercial_registration && (
            <div className="text-xs font-mono">
              CR: {customer.commercial_registration.substring(0, 4)}***
            </div>
          )}
          {customer.saudi_id && (
            <div className="text-xs font-mono">
              ID: {customer.saudi_id.substring(0, 4)}***
            </div>
          )}
          <div className="flex gap-1">
            {customer.tax_exempt && (
              <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                Tax Exempt
              </Badge>
            )}
            {customer.preferred_language === 'ar' && (
              <Badge variant="secondary" className="text-xs">العربية</Badge>
            )}
          </div>
        </div>
      )
    },
  },
  {
    accessorKey: "phone_mobile",
    header: "Contact Phone",
    cell: ({ row }) => {
      const customer = row.original
      const mobilePhone = customer.phone_mobile
      const workPhone = customer.phone_work

      if (!mobilePhone && !workPhone) {
        return <span className="text-muted-foreground">No phone</span>
      }

      return (
        <div className="space-y-0.5">
          {mobilePhone && (
            <div className="text-sm">
              <span className="font-medium">Mobile:</span> {mobilePhone}
            </div>
          )}
          {workPhone && (
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Work:</span> {workPhone}
            </div>
          )}
        </div>
      )
    },
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "address",
    header: "Address",
    cell: ({ row }) => {
      const customer = row.original
      const displayAddress = customer.short_address || customer.address
      const fullAddress = customer.address && customer.address !== customer.short_address ? customer.address : null

      return (
        <span
          title={fullAddress || displayAddress}
          className="cursor-help max-w-xs truncate block"
        >
          {displayAddress || 'No address'}
        </span>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original

      const handleEmailClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        if (customer.email) {
          window.open(`mailto:${customer.email}`, '_blank')
        }
      }

      const handleWhatsAppClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        const whatsappUrl = whatsAppLink(customer)
        if (whatsappUrl) {
          window.open(whatsappUrl, '_blank')
        }
      }

      return (
        <div className="flex items-center justify-end gap-1 min-w-max">
          {/* Quick action buttons */}
          {customer.email_enabled && customer.email && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEmailClick}
              className="h-8 w-8 p-0 flex-shrink-0"
              title="Send email"
            >
              <Mail className="h-4 w-4" />
            </Button>
          )}
          {customer.whatsapp_enabled && customer.phone_mobile && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleWhatsAppClick}
              className="h-8 w-8 p-0 flex-shrink-0"
              title="Send WhatsApp message"
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}

          {/* More actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="h-8 w-8 p-0 flex-shrink-0"
                title="More actions"
              >
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => handleEdit(customer)}>
                <Edit className="mr-2 h-4 w-4" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleArchive(customer)}>
                <Archive className="mr-2 h-4 w-4" />
                <span>{customer.is_active ? "Archive" : "Unarchive"}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDelete(customer.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    },
  },
]
