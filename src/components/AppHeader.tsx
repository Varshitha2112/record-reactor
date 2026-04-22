import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, LogOut, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export const AppHeader = () => {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("read", false);
      setUnread(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("notif-header")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="grid h-9 w-9 place-items-center rounded-md gradient-hero shadow-soft">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl font-semibold tracking-tight">Scholaris</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Student Registry</div>
          </div>
        </Link>
        <nav className="flex items-center gap-2">
          {user ? (
            <>
              <Link to={role === "admin" ? "/admin" : "/dashboard"}>
                <Button variant="ghost" size="sm">{role === "admin" ? "Admin" : "Dashboard"}</Button>
              </Link>
              <Link to="/notifications" className="relative">
                <Button variant="ghost" size="icon" aria-label="Notifications">
                  <Bell className="h-4 w-4" />
                </Button>
                {unread > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-accent text-accent-foreground border-0 text-[10px]">
                    {unread}
                  </Badge>
                )}
              </Link>
              <Button variant="outline" size="sm" onClick={async () => { await signOut(); navigate("/"); }}>
                <LogOut className="h-4 w-4 mr-1.5" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
              <Link to="/auth?mode=signup"><Button size="sm" className="gradient-gold text-accent-foreground hover:opacity-95">Apply now</Button></Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
