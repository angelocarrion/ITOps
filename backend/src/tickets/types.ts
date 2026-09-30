export const categories = ['Hardware', 'Software', 'Network', 'Printer', 'Account Access', 'Microsoft 365', 'Other'] as const;
export const priorities = ['Low', 'Medium', 'High', 'Critical'] as const;
export const statuses = ['Open', 'In Progress', 'Pending', 'Resolved'] as const;

export interface TicketInput {
  title: string;
  description: string;
  requester_name: string;
  requester_email: string;
  department: string;
  category: typeof categories[number];
  priority: typeof priorities[number];
  status: typeof statuses[number];
  assigned_to: string;
}

export interface Ticket extends TicketInput {
  id: number;
  ticket_number: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}
