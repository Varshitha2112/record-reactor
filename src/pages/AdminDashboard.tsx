import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, CheckCircle2, Clock, XCircle, BookOpen, Search, ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { notifyUser } from "@/lib/notify";

interface StudentRow {
  id: string; user_id: string; full_name: string; phone: string | null;
  course_id: string | null; status: "pending" | "approved" | "rejected";
  photo_url: string | null; created_at: string; student_code: string | null;
  admin_notes: string | null;
}
interface Course { id: string; code: string; title: string; description: string | null; credits: number; }

const PAGE_SIZE = 8;

const AdminDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [selected, setSelected] = useState<StudentRow | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  // course form
  const [newCourse, setNewCourse] = useState({ code: "", title: "", description: "", credits: 3 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    const [{ data: sList }, { data: cList }] = await Promise.all([
      supabase.from("students").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("code"),
    ]);
    const s = (sList ?? []) as StudentRow[];
    setStudents(s);
    setCourses((cList ?? []) as Course[]);
    setStats({
      total: s.length,
      pending: s.filter(x => x.status === "pending").length,
      approved: s.filter(x => x.status === "approved").length,
      rejected: s.filter(x => x.status === "rejected").length,
    });
  };

  const filtered = useMemo(() => {
    let f = students;
    if (statusFilter !== "all") f = f.filter(s => s.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      f = f.filter(s => s.full_name?.toLowerCase().includes(q) || s.student_code?.toLowerCase().includes(q));
    }
    return f;
  }, [students, statusFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const decide = async (action: "approved" | "rejected") => {
    if (!selected || !user) return;
    try {
      const code = action === "approved" && !selected.student_code
        ? `STU-${new Date().getFullYear()}-${String(stats.approved + 1).padStart(4, "0")}`
        : selected.student_code;
      const { error } = await supabase.from("students").update({
        status: action,
        admin_notes: decisionNote || null,
        student_code: code,
      }).eq("id", selected.id);
      if (error) throw error;
      await supabase.from("approvals").insert({
        student_id: selected.id, admin_id: user.id, action, notes: decisionNote || null,
      });
      await notifyUser(
        selected.user_id,
        action === "approved" ? "Application approved 🎓" : "Application rejected",
        action === "approved"
          ? `Welcome aboard. Your student code is ${code}.`
          : decisionNote || "Please contact admissions for details.",
      );
      toast.success(`Application ${action}`);
      setSelected(null); setDecisionNote("");
      load();
    } catch (e: any) { toast.error(e.message); }
  };

  const addCourse = async () => {
    if (!newCourse.code || !newCourse.title) { toast.error("Code and title required"); return; }
    const { error } = await supabase.from("courses").insert(newCourse);
    if (error) return toast.error(error.message);
    setNewCourse({ code: "", title: "", description: "", credits: 3 });
    toast.success("Course added"); load();
  };
  const deleteCourse = async (id: string) => {
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  const courseMap = useMemo(() => Object.fromEntries(courses.map(c => [c.id, c])), [courses]);
  const courseDist = useMemo(() => {
    const counts: Record<string, number> = {};
    students.forEach(s => { if (s.course_id) counts[s.course_id] = (counts[s.course_id] ?? 0) + 1; });
    const max = Math.max(1, ...Object.values(counts));
    return courses.map(c => ({ ...c, count: counts[c.id] ?? 0, pct: ((counts[c.id] ?? 0) / max) * 100 }));
  }, [students, courses]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10">
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium">Registrar</p>
          <h1 className="font-display text-4xl mt-1">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Approve applications, manage courses, and monitor enrollment.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          {[
            { label: "Total students", value: stats.total, icon: Users, tone: "primary" },
            { label: "Pending", value: stats.pending, icon: Clock, tone: "warning" },
            { label: "Approved", value: stats.approved, icon: CheckCircle2, tone: "success" },
            { label: "Rejected", value: stats.rejected, icon: XCircle, tone: "destructive" },
          ].map(s => (
            <Card key={s.label} className="p-5 hover:shadow-soft transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">{s.label}</div>
                  <div className="font-display text-4xl mt-2">{s.value}</div>
                </div>
                <div className={`grid h-11 w-11 place-items-center rounded-md bg-${s.tone}/10 text-${s.tone}`}>
                  <s.icon className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="students">
          <TabsList>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="courses">Courses</TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card className="p-5 mt-4">
              <div className="flex flex-wrap gap-3 items-center mb-5">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name or code…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Applied</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageItems.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No applications match.</TableCell></TableRow>
                    ) : pageItems.map(s => (
                      <TableRow key={s.id} className="hover:bg-muted/40">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9"><AvatarImage src={s.photo_url ?? undefined} /><AvatarFallback className="bg-primary text-primary-foreground text-xs">{s.full_name?.split(" ").map(n => n[0]).join("").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                            <div><div className="font-medium">{s.full_name}</div><div className="text-xs text-muted-foreground">{s.phone ?? "—"}</div></div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{s.student_code ?? "—"}</TableCell>
                        <TableCell className="text-sm">{s.course_id ? courseMap[s.course_id]?.code : "—"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            s.status === "approved" ? "bg-success/10 text-success border-success/30"
                            : s.status === "rejected" ? "bg-destructive/10 text-destructive border-destructive/30"
                            : "bg-warning/10 text-warning border-warning/30"
                          }>{s.status}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{new Date(s.created_at).toLocaleDateString()}</TableCell>
                        <TableCell><Button size="sm" variant="ghost" onClick={() => { setSelected(s); setDecisionNote(s.admin_notes ?? ""); }}>Review</Button></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-center justify-between mt-5 text-sm text-muted-foreground">
                <div>{filtered.length} result{filtered.length === 1 ? "" : "s"}</div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                  <span className="px-2">Page {page} of {totalPages}</span>
                  <Button variant="outline" size="icon" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid md:grid-cols-2 gap-5 mt-4">
              <Card className="p-6">
                <h3 className="font-display text-xl">Application funnel</h3>
                <div className="mt-6 space-y-4">
                  {[
                    { k: "Pending", v: stats.pending, color: "bg-warning" },
                    { k: "Approved", v: stats.approved, color: "bg-success" },
                    { k: "Rejected", v: stats.rejected, color: "bg-destructive" },
                  ].map(row => {
                    const pct = stats.total ? (row.v / stats.total) * 100 : 0;
                    return (
                      <div key={row.k}>
                        <div className="flex justify-between text-sm mb-1.5"><span>{row.k}</span><span className="text-muted-foreground">{row.v} · {pct.toFixed(0)}%</span></div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
              <Card className="p-6">
                <h3 className="font-display text-xl">Course distribution</h3>
                <div className="mt-6 space-y-3">
                  {courseDist.length === 0 ? <p className="text-sm text-muted-foreground">No courses yet.</p> : courseDist.map(c => (
                    <div key={c.id}>
                      <div className="flex justify-between text-sm mb-1.5"><span className="font-mono text-xs">{c.code}</span><span className="text-muted-foreground">{c.count}</span></div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full gradient-gold rounded-full" style={{ width: `${c.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="courses">
            <div className="grid md:grid-cols-3 gap-5 mt-4">
              <Card className="p-6 md:col-span-1 h-fit">
                <h3 className="font-display text-xl flex items-center gap-2"><Plus className="h-5 w-5 text-accent" /> Add course</h3>
                <div className="space-y-3 mt-4">
                  <div className="space-y-1.5"><Label>Code</Label><Input value={newCourse.code} onChange={e => setNewCourse({ ...newCourse, code: e.target.value })} placeholder="CS301" maxLength={20} /></div>
                  <div className="space-y-1.5"><Label>Title</Label><Input value={newCourse.title} onChange={e => setNewCourse({ ...newCourse, title: e.target.value })} maxLength={150} /></div>
                  <div className="space-y-1.5"><Label>Credits</Label><Input type="number" min={1} max={12} value={newCourse.credits} onChange={e => setNewCourse({ ...newCourse, credits: Number(e.target.value) })} /></div>
                  <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} value={newCourse.description} onChange={e => setNewCourse({ ...newCourse, description: e.target.value })} maxLength={500} /></div>
                  <Button onClick={addCourse} className="w-full gradient-hero text-primary-foreground">Add course</Button>
                </div>
              </Card>
              <Card className="p-6 md:col-span-2">
                <h3 className="font-display text-xl flex items-center gap-2"><BookOpen className="h-5 w-5" /> Catalog</h3>
                <div className="mt-4 divide-y divide-border">
                  {courses.map(c => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">{c.code}</span>
                          <span className="font-medium truncate">{c.title}</span>
                        </div>
                        {c.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-muted-foreground">{c.credits} cr</span>
                        <Button variant="ghost" size="icon" onClick={() => deleteCourse(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Review dialog */}
        <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-display text-2xl">Review application</DialogTitle></DialogHeader>
            {selected && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14"><AvatarImage src={selected.photo_url ?? undefined} /><AvatarFallback className="bg-primary text-primary-foreground">{selected.full_name?.split(" ").map(n=>n[0]).join("").slice(0,2)}</AvatarFallback></Avatar>
                  <div>
                    <div className="font-medium">{selected.full_name}</div>
                    <div className="text-sm text-muted-foreground">{selected.course_id ? courseMap[selected.course_id]?.title : "No course selected"}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Notes for student</Label>
                  <Textarea rows={3} value={decisionNote} onChange={e => setDecisionNote(e.target.value)} placeholder="Optional message…" maxLength={500} />
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => decide("rejected")} className="text-destructive border-destructive/40 hover:bg-destructive/10">Reject</Button>
              <Button onClick={() => decide("approved")} className="gradient-gold text-accent-foreground">Approve</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminDashboard;
