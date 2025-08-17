"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown, Phone, Mail, MapPin, User, Building } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Edit, Archive, Trash2 } from "lucide-react"

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.
export type Customer = {
  id: string
  name: string
  customer_type: "residential" | "commercial"
  phone: string | null
  email: string | null
  address: string | null
  short_address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  is_active: boolean
  created_at?: string
  updated_at?: string
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
          className="h-8 px-2"
        >
          <User className="mr-2 h-4 w-4" />
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const customer = row.original;
      const initials = customer.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">{customer.name}</span>
            {customer.created_at && (
              <span className="text-xs text-muted-foreground">
                Added {new Date(customer.created_at).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "customer_type",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-8 px-2"
        >
          <Building className="mr-2 h-4 w-4" />
          Type
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const type = row.original.customer_type;
      return (
        <Badge variant={type === 'commercial' ? 'default' : 'secondary'}>
          {type === 'commercial' ? 'Commercial' : 'Residential'}
        </Badge>
      );
    },
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => {
      const phone = row.original.phone;
      return phone ? (
        <div className="flex items-center gap-2">
          <Phone className="h-3 w-3 text-muted-foreground" />
          <span className="font-mono text-sm">{phone}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">No phone</span>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => {
      const email = row.original.email;
      return email ? (
        <div className="flex items-center gap-2">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{email}</span>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">No email</span>
      );
    },
  },
  {
    accessorKey: "address",
    header: "Location",
    cell: ({ row }) => {
      const customer = row.original;
      const displayAddress = customer.short_address || customer.address;
      const location = [customer.city, customer.state].filter(Boolean).join(', ');
      
      return displayAddress ? (
        <div className="flex items-start gap-2">
          <MapPin className="h-3 w-3 text-muted-foreground mt-1 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-sm">{displayAddress}</span>
            {location && (
              <span className="text-xs text-muted-foreground">{location}</span>
            )}
          </div>
        </div>
      ) : (
        <span className="text-muted-foreground text-sm">No address</span>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const customer = row.original;
      const hasContact = customer.email || customer.phone;
      const hasAddress = customer.address || customer.short_address;
      
      return (
        <div className="flex flex-col gap-1">
          <Badge variant={customer.is_active ? 'success' : 'secondary'}>
            {customer.is_active ? 'Active' : 'Archived'}
          </Badge>
          <div className="flex gap-1">
            {hasContact && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Contact ✓
              </Badge>
            )}
            {hasAddress && (
              <Badge variant="outline" className="text-xs px-1 py-0">
                Address ✓
              </Badge>
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const customer = row.original
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => handleEdit(customer)}>
              <Edit className="mr-2 h-4 w-4" />
              <span>Edit Details</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleArchive(customer)}
              className={customer.is_active ? "text-orange-600" : "text-green-600"}
            >
              <Archive className="mr-2 h-4 w-4" />
              <span>{customer.is_active ? "Archive Customer" : "Restore Customer"}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => handleDelete(customer.id)}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Delete Permanently</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
