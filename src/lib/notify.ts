import { supabase } from "@/integrations/supabase/client";

export async function notifyUser(userId: string, title: string, body?: string) {
  await supabase.from("notifications").insert({ user_id: userId, title, body: body ?? null });
}
