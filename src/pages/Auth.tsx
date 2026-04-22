import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { GraduationCap } from "lucide-react";
import { toast } from "sonner";

const signUpSchema = z.object({
  fullName: z.string().trim().min(2, "Name too short").max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8, "At least 8 characters").max(72),
});
const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72),
});

const Auth = () => {
  const [params] = useSearchParams();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => { setMode(params.get("mode") === "signup" ? "signup" : "signin"); }, [params]);

  if (!authLoading && user) return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ fullName, email, password });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: parsed.data.fullName },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to Scholaris.");
        navigate("/dashboard");
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email, password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Welcome back.");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Authentication failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex flex-col justify-center px-6 py-12 lg:px-16">
        <Link to="/" className="flex items-center gap-2 mb-12">
          <div className="grid h-9 w-9 place-items-center rounded-md gradient-hero">
            <GraduationCap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl">Scholaris</span>
        </Link>

        <div className="max-w-md w-full mx-auto animate-fade-up">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium">{mode === "signup" ? "New applicant" : "Welcome back"}</p>
          <h1 className="font-display text-4xl mt-2">{mode === "signup" ? "Create your account" : "Sign in to continue"}</h1>
          <p className="text-muted-foreground mt-3">
            {mode === "signup" ? "Begin your application to the institute." : "Pick up where you left off."}
          </p>

          <Card className="p-6 mt-8 shadow-soft">
            <form onSubmit={handle} className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ada Lovelace" required maxLength={100} />
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" required maxLength={255} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={mode === "signup" ? 8 : 1} maxLength={72} />
              </div>
              <Button type="submit" disabled={loading} className="w-full gradient-hero text-primary-foreground hover:opacity-95 h-11">
                {loading ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
              </Button>
            </form>
            <p className="text-sm text-muted-foreground mt-5 text-center">
              {mode === "signup" ? "Already enrolled?" : "New to Scholaris?"}{" "}
              <button onClick={() => setMode(mode === "signup" ? "signin" : "signup")} className="text-primary font-medium underline-offset-4 hover:underline">
                {mode === "signup" ? "Sign in" : "Create an account"}
              </button>
            </p>
          </Card>

          <p className="text-xs text-muted-foreground mt-6">
            Tip: sign up with <code className="font-mono text-foreground">admin@school.edu</code> to bootstrap the admin role.
          </p>
        </div>
      </div>

      {/* Right: visual */}
      <div className="relative hidden lg:block gradient-hero overflow-hidden">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "radial-gradient(circle at 30% 30%, hsl(var(--accent) / 0.5), transparent 50%), radial-gradient(circle at 70% 70%, hsl(var(--primary-glow) / 0.7), transparent 60%)"
        }} />
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="relative h-full flex flex-col justify-end p-16 text-primary-foreground">
          <blockquote className="font-display text-3xl italic leading-snug max-w-md">
            "An institution rises with the precision of its records."
          </blockquote>
          <div className="mt-6 text-sm text-primary-foreground/70">
            — From the Scholaris charter
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
