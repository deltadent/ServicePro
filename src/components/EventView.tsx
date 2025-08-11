import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarEvent } from "@/utils/data";
import { EventDeleteForm } from "./EventDeleteForm";
import { EventEditForm } from "./EventEditForm";
import { useEvents } from "@/context/EventsContext";
import { X } from "lucide-react";

interface EventViewProps {
  event?: CalendarEvent;
}

export function EventView({ event }: EventViewProps) {
  const { eventViewOpen, setEventViewOpen } = useEvents();

  return (
    <>
      <AlertDialog open={eventViewOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex flex-row justify-between items-center">
              <h1>{event?.title}</h1>
              <AlertDialogCancel onClick={() => setEventViewOpen(false)}>
                <X className="h-5 w-5" />
              </AlertDialogCancel>
            </AlertDialogTitle>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium">Time:</th>
                  <td>{`${event?.start.toLocaleTimeString()} - ${event?.end ? event.end.toLocaleTimeString() : ''}`}</td>
                </tr>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium">Customer:</th>
                  <td>{event?.customerName}</td>
                </tr>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium">Phone:</th>
                  <td>{event?.customerPhone}</td>
                </tr>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium">Address:</th>
                  <td>{event?.customerAddress}</td>
                </tr>
                <tr className="border-b">
                  <th className="text-left py-2 pr-2 font-medium">Description:</th>
                  <td>{event?.description}</td>
                </tr>
                <tr>
                  <th className="text-left py-2 pr-2 font-medium">Priority:</th>
                  <td>
                    <div
                      className="rounded-full w-5 h-5"
                      style={{ backgroundColor: event?.backgroundColor }}
                    ></div>
                  </td>
                </tr>
              </tbody>
            </table>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <EventDeleteForm id={event?.id} title={event?.title} />
            <EventEditForm
              oldEvent={event}
              event={event}
              isDrag={false}
              displayButton={true}
            />
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
