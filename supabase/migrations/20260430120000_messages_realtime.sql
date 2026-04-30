-- Add messaging tables to the supabase_realtime publication so the web/mobile
-- clients receive INSERT/UPDATE events without refreshing.
-- Without this, useRealtimeThread / useRealtimeConversations subscribe to a
-- channel that never fires.

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
