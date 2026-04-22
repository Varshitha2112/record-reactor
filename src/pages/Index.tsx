import { Link, Navigate } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GraduationCap, ShieldCheck, FileText, BarChart3, Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const features = [
  { icon: GraduationCap, title: "Student Registration", body: "Streamlined applications with profile, documents, and status tracking." },
  { icon: ShieldCheck, title: "Role-based Access", body: "Secure auth with student and administrator roles, enforced server-side." },
  { icon: FileText, title: "Document Vault", body: "Encrypted file storage for transcripts, IDs, and certificates." },
  { icon: BarChart3, title: "Live Analytics", body: "Approval funnel, course distribution, and growth at a glance." },
  { icon: Bell, title: "Notifications", body: "Real-time updates when applications are approved or rejected." },
  { icon: Search, title: "Search & Filter", body: "Paginated tables with instant search across thousands of records." },
];

const Index = () => {
  const { user, role, loading } = useAuth();
  if (!loading && user) return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero" />
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--accent) / 0.35), transparent 40%), radial-gradient(circle at 80% 60%, hsl(var(--primary-glow) / 0.6), transparent 50%)"
        }} />
        <div className="absolute inset-0 opacity-[0.07]" style={{
          backgroundImage: "linear-gradient(hsl(var(--accent)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--accent)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />

        <div className="container relative py-24 md:py-32 text-primary-foreground">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-accent-glow mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Est. 1894 · Modern Registry
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.02] text-balance">
              The student registry, <span className="italic text-accent">reimagined</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-foreground/80 max-w-2xl">
              Scholaris brings registration, approvals, documents, and analytics into a single, beautifully crafted system for modern institutions.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-gold text-accent-foreground hover:opacity-95 shadow-gold h-12 px-7 text-base">
                  Apply as a student
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="h-12 px-7 text-base bg-transparent text-primary-foreground border-primary-foreground/30 hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  Administrator sign in
                </Button>
              </Link>
            </div>
            <div className="mt-12 flex items-center gap-8 text-sm text-primary-foreground/70">
              <div><div className="font-display text-3xl text-accent-glow">12K+</div>active students</div>
              <div className="h-10 w-px bg-primary-foreground/20" />
              <div><div className="font-display text-3xl text-accent-glow">98%</div>approval SLA</div>
              <div className="h-10 w-px bg-primary-foreground/20 hidden sm:block" />
              <div className="hidden sm:block"><div className="font-display text-3xl text-accent-glow">240</div>courses indexed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-24">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium">What's inside</p>
          <h2 className="font-display text-4xl md:text-5xl mt-3 text-balance">A full-stack platform for the registrar's office.</h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <Card key={f.title} className="p-7 border-border/70 hover:shadow-elegant transition-shadow group bg-card animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary text-primary-foreground group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="relative overflow-hidden rounded-2xl gradient-hero text-primary-foreground p-12 md:p-16 shadow-elegant">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full gradient-gold opacity-30 blur-3xl" />
          <div className="relative max-w-2xl">
            <h2 className="font-display text-4xl md:text-5xl">Ready to get started?</h2>
            <p className="mt-4 text-primary-foreground/80 text-lg">Create your account in under a minute. Admins use <code className="px-1.5 py-0.5 rounded bg-primary-foreground/10 text-accent-glow font-mono text-sm">admin@school.edu</code> to bootstrap the registry.</p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="mt-8 gradient-gold text-accent-foreground shadow-gold h-12 px-8">Create your account</Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8">
        <div className="container text-sm text-muted-foreground flex flex-wrap items-center justify-between gap-3">
          <div>© {new Date().getFullYear()} Scholaris Registry</div>
          <div className="font-display italic">Veritas in Numeris</div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
