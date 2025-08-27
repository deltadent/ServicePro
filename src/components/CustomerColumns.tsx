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

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Customer = {
  id: string
  name: string
  customer_type: "residential" | "commercial"
  phone?: string | null // Made optional since it might not exist in all database schemas
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
      const displayName = getCustomerDisplayName(customer)
      return (
        <div className="space-y-1">
          <div className="font-medium">{displayName}</div>
          <div className="flex gap-1">
            {customer.whatsapp_enabled && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                WhatsApp
              </Badge>
            )}
            {customer.email_enabled && (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
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
