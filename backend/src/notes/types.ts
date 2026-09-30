export interface NoteInput {
  author: string;
  content: string;
}

export interface TicketNote extends NoteInput {
  id: number;
  ticket_id: number;
  created_at: string;
}
