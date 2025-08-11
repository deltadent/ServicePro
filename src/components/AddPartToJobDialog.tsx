import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { supabase } from '@/integrations/supabase/client';
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface AddPartToJobDialogProps {
  jobId: string;
  onPartAdded: () => void;
}

const AddPartToJobDialog = ({ jobId, onPartAdded }: AddPartToJobDialogProps) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<any[]>([]);
  const [selectedPart, setSelectedPart] = useState<any | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [openPopover, setOpenPopover] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
    }
  }, [isOpen]);

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('parts_inventory')
        .select('*')
        .order('name');

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) {
      toast({ title: "Error", description: "Please select a part", variant: "destructive" });
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase
        .from('job_parts')
        .insert([{
          job_id: jobId,
          part_id: selectedPart.id,
          quantity_used: quantity,
          unit_price: selectedPart.unit_price
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Part added to job successfully"
      });

      setIsOpen(false);
      onPartAdded();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="w-4 h-4 mr-2" />
          Add Part
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Part to Job</DialogTitle>
          <DialogDescription>Select a part from inventory to add to this job.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Part</Label>
            <Popover open={openPopover} onOpenChange={setOpenPopover}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openPopover}
                  className="w-full justify-between"
                >
                  {selectedPart ? selectedPart.name : "Select part..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Search part..." />
                  <CommandList>
                    <CommandEmpty>No part found.</CommandEmpty>
                    <CommandGroup>
                      {inventory.map((part) => (
                        <CommandItem
                          key={part.id}
                          value={part.name}
                          onSelect={() => {
                            setSelectedPart(part);
                            setOpenPopover(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedPart?.id === part.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {part.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="quantity">Quantity</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              min="1"
              required
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Part"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPartToJobDialog;
