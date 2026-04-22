import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, Check } from "lucide-react";

interface Notif { id: string; title: string; body: string | null; read: boolean; created_at: string; }

const Notifications = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    load();
    const ch = supabase.channel("notif-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const load = async () => {
    const { data } = await supabase.from("notifications").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
    setItems((data ?? []) as Notif[]);
  };

  const markAll = async () => {
    await supabase.from("notifications").update({ read: true }).eq("user_id", user!.id).eq("read", false);
    load();
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium">Inbox</p>
            <h1 className="font-display text-4xl mt-1">Notifications</h1>
          </div>
          <Button variant="outline" onClick={markAll}><Check className="h-4 w-4 mr-2" /> Mark all read</Button>
        </div>
        {items.length === 0 ? (
          <Card className="p-16 text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No notifications yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map(n => (
              <Card key={n.id} className={`p-5 border-l-4 ${n.read ? "border-l-border opacity-80" : "border-l-accent"}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-display text-lg">{n.title}</h3>
                    {n.body && <p className="text-sm text-muted-foreground mt-1">{n.body}</p>}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Notifications;
