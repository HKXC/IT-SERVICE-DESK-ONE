import { NewTicketForm } from "@/components/tickets/new-ticket-form";

export default function NewTicketPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">New Ticket</h1>
      <NewTicketForm />
    </div>
  );
}
