"use client"

import { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type JobOrder = {
  id: string
  job_number: string
  created_at: string
  technician_name: string
  status: string
  ordered_by: string
  title: string
  description: string
  scheduled_date: string
  profiles?: { full_name: string }[];
  customers?: any;
}

export const getColumns = (onViewDetails: (jobOrder: JobOrder) => void): ColumnDef<JobOrder>[] => [
  {
    accessorKey: "job_number",
    header: "Job Order No",
  },
  {
    accessorKey: "created_at",
    header: "Date and Time",
    cell: ({ row }) => {
      const date = new Date(row.original.created_at)
      return <span>{date.toLocaleString()}</span>
    },
  },
  {
    accessorKey: "technician_name",
    header: "Technician Name",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "ordered_by",
    header: "Ordered By",
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const jobOrder = row.original
 
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
            <DropdownMenuItem onClick={() => onViewDetails(jobOrder)}>View Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]
