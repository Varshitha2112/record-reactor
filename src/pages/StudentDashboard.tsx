import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, XCircle, Upload, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

interface Course { id: string; code: string; title: string; }
interface Student {
  id: string; user_id: string; full_name: string; date_of_birth: string | null;
  gender: string | null; address: string | null; phone: string | null;
  course_id: string | null; photo_url: string | null; document_urls: string[];
  status: "pending" | "approved" | "rejected"; admin_notes: string | null; student_code: string | null;
}

const studentSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  date_of_birth: z.string().optional().or(z.literal("")),
  gender: z.string().max(30).optional().or(z.literal("")),
});

const STATUS = {
  pending: { label: "Pending review", icon: Clock, cls: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Approved", icon: CheckCircle2, cls: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Rejected", icon: XCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const StudentDashboard = () => {
  const { user } = useAuth();
  const [student, setStudent] = useState<Student | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", date_of_birth: "", gender: "", course_id: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: c }] = await Promise.all([
      supabase.from("students").select("*").eq("user_id", user!.id).maybeSingle(),
      supabase.from("courses").select("id, code, title").order("code"),
    ]);
    setCourses((c ?? []) as Course[]);
    if (s) {
      setStudent(s as Student);
      setForm({
        full_name: s.full_name ?? "",
        phone: s.phone ?? "",
        address: s.address ?? "",
        date_of_birth: s.date_of_birth ?? "",
        gender: s.gender ?? "",
        course_id: s.course_id ?? "",
      });
    } else {
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user!.id).maybeSingle();
      setForm((f) => ({ ...f, full_name: profile?.full_name ?? "" }));
    }
    setLoading(false);
  };

  const save = async () => {
    const parsed = studentSchema.safeParse(form);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user!.id,
        full_name: form.full_name,
        phone: form.phone || null,
        address: form.address || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        course_id: form.course_id || null,
      };
      if (student) {
        const { error } = await supabase.from("students").update(payload).eq("id", student.id);
        if (error) throw error;
        toast.success("Profile updated");
      } else {
        const { error } = await supabase.from("students").insert(payload);
        if (error) throw error;
        toast.success("Application submitted for review");
      }
      load();
    } catch (e: any) { toast.error(e.message); } finally { setSaving(false); }
  };

  const uploadFile = async (file: File, kind: "photo" | "document") => {
    if (!user) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Max file size 10MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const folder = kind === "photo" ? "photos" : "documents";
      const path = `${user.id}/${folder}/${kind}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("student-files").upload(path, file, { upsert: false });
      if (error) throw error;
      if (kind === "photo") {
        // Store the storage path; resolve to a signed URL on render
        await supabase.from("profiles").update({ photo_url: path }).eq("id", user.id);
        if (student) await supabase.from("students").update({ photo_url: path }).eq("id", student.id);
        toast.success("Photo updated");
      } else {
        if (!student) { toast.error("Save your profile first"); return; }
        const docs = [...(student.document_urls ?? []), path];
        await supabase.from("students").update({ document_urls: docs }).eq("id", student.id);
        toast.success("Document uploaded");
      }
      load();
    } catch (e: any) { toast.error(e.message); } finally { setUploading(false); }
  };

  const removeDoc = async (path: string) => {
    if (!student) return;
    await supabase.storage.from("student-files").remove([path]);
    const docs = (student.document_urls ?? []).filter((p) => p !== path);
    await supabase.from("students").update({ document_urls: docs }).eq("id", student.id);
    load();
  };

  if (loading) return (
    <><AppHeader /><div className="container py-12"><div className="h-8 w-48 bg-muted rounded animate-pulse" /></div></>
  );

  const status = student ? STATUS[student.status] : null;
  const Icon = status?.icon;
  const initials = (form.full_name || user?.email || "S").split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 max-w-5xl">
        {/* Header card */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <Avatar className="h-20 w-20 ring-2 ring-accent/40 ring-offset-2 ring-offset-background">
            <AvatarImage src={student?.photo_url ?? undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground font-display text-xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.25em] text-accent font-medium">Student portal</p>
            <h1 className="font-display text-4xl mt-1">{form.full_name || "Welcome"}</h1>
            <p className="text-muted-foreground mt-1">{user?.email}</p>
          </div>
          {status && Icon && (
            <Badge variant="outline" className={`${status.cls} h-9 px-4 text-sm gap-1.5`}>
              <Icon className="h-4 w-4" /> {status.label}
            </Badge>
          )}
        </div>

        {student?.admin_notes && (
          <Card className="p-5 mb-6 border-l-4 border-l-accent bg-accent/5">
            <div className="text-xs uppercase tracking-widest text-accent font-medium">Note from admissions</div>
            <p className="mt-2 text-sm">{student.admin_notes}</p>
          </Card>
        )}

        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card className="p-6 mt-4">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Full name</Label>
                  <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={100} />
                </div>
                <div className="space-y-1.5">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date of birth</Label>
                  <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>Gender</Label>
                  <Input value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} maxLength={30} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Address</Label>
                  <Textarea rows={3} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={500} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Course</Label>
                  <Select value={form.course_id} onValueChange={(v) => setForm({ ...form, course_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Select a course" /></SelectTrigger>
                    <SelectContent>
                      {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2 flex flex-wrap items-center gap-3 pt-2">
                  <Button onClick={save} disabled={saving} className="gradient-hero text-primary-foreground hover:opacity-95">
                    {saving ? "Saving…" : student ? "Update profile" : "Submit application"}
                  </Button>
                  <label className="inline-flex">
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "photo")} />
                    <span className="inline-flex items-center gap-1.5 px-4 h-10 rounded-md border border-input bg-background hover:bg-muted cursor-pointer text-sm">
                      <Upload className="h-4 w-4" /> {uploading ? "Uploading…" : "Upload photo"}
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="documents">
            <Card className="p-6 mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-display text-xl">Documents</h3>
                  <p className="text-sm text-muted-foreground">Transcripts, ID, certificates. Max 10MB each.</p>
                </div>
                <label className="inline-flex">
                  <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && uploadFile(e.target.files[0], "document")} />
                  <span className="inline-flex items-center gap-1.5 px-4 h-10 rounded-md gradient-gold text-accent-foreground cursor-pointer text-sm font-medium shadow-soft">
                    <Upload className="h-4 w-4" /> Upload document
                  </span>
                </label>
              </div>
              {(!student || student.document_urls.length === 0) ? (
                <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
                  <p className="mt-3 text-sm text-muted-foreground">No documents uploaded yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {student.document_urls.map((path) => {
                    const name = path.split("/").pop() ?? path;
                    const { data: { publicUrl } } = supabase.storage.from("student-files").getPublicUrl(path);
                    return (
                      <div key={path} className="flex items-center justify-between p-3 rounded-md border border-border bg-card">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-9 w-9 place-items-center rounded bg-muted"><FileText className="h-4 w-4" /></div>
                          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm truncate hover:underline">{name}</a>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeDoc(path)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="status">
            <Card className="p-8 mt-4 text-center">
              {status && Icon ? (
                <>
                  <div className={`inline-grid place-items-center h-16 w-16 rounded-full ${status.cls} border`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <h3 className="font-display text-2xl mt-5">{status.label}</h3>
                  <p className="text-muted-foreground mt-2 max-w-md mx-auto">
                    {student?.status === "approved" && `Welcome to the registry. Your student code is ${student.student_code ?? "being assigned"}.`}
                    {student?.status === "pending" && "Your application is being reviewed by the admissions team."}
                    {student?.status === "rejected" && "Please review the admissions note above and contact support."}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">Submit your profile to begin tracking your application.</p>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default StudentDashboard;
