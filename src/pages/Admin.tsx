import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Users, CheckCircle, XCircle, AlertTriangle, Trophy, Search,
  Eye, Ban, Check, X, LogOut, Lock, Mail, Settings, Eye as EyeIcon, EyeOff,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

// ─── Config Dialog ────────────────────────────────────────────────────────────
const ConfigDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const { toast } = useToast();
  const [appId, setAppId] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFetching(true);
    api.get("/admin/config")
      .then(({ data }) => {
        setAppId(data.config.FACEBOOK_APP_ID || "");
        setAppSecret(""); // on ne pré-remplit pas le secret pour forcer une saisie explicite
      })
      .catch(() => toast({ title: "Erreur", description: "Impossible de charger la config", variant: "destructive" }))
      .finally(() => setFetching(false));
  }, [open, toast]);

  const handleSave = async () => {
    if (!appId.trim()) {
      toast({ title: "Champ requis", description: "L'App ID est obligatoire", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const payload: Record<string, string> = { FACEBOOK_APP_ID: appId.trim() };
      if (appSecret.trim()) payload.FACEBOOK_APP_SECRET = appSecret.trim();
      await api.put("/admin/config", payload);
      toast({ title: "Configuration sauvegardée", description: "Les paramètres Facebook sont mis à jour." });
      onClose();
    } catch {
      toast({ title: "Erreur", description: "Impossible de sauvegarder", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl tracking-wide flex items-center gap-2">
            <Settings className="h-5 w-5 text-primary" /> CONFIGURATION FACEBOOK
          </DialogTitle>
          <DialogDescription>
            Renseignez vos identifiants depuis{" "}
            <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">
              developers.facebook.com
            </a>
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <p className="text-center text-muted-foreground py-6">Chargement...</p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">App ID</label>
              <Input
                placeholder="123456789012345"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="bg-secondary border-border font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                App Secret{" "}
                <span className="text-muted-foreground font-normal">(laisser vide pour conserver l'actuel)</span>
              </label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  placeholder="Nouveau secret Facebook"
                  value={appSecret}
                  onChange={(e) => setAppSecret(e.target.value)}
                  className="bg-secondary border-border font-mono pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-secondary/50 border border-border p-3 text-xs text-muted-foreground space-y-1">
              <p>• Ces valeurs sont stockées en base de données et chiffrées côté serveur.</p>
              <p>• Elles sont prioritaires sur les variables d'environnement du serveur.</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} className="border-border">Annuler</Button>
          <Button onClick={handleSave} disabled={loading || fetching} className="bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider">
            {loading ? "Sauvegarde..." : "SAUVEGARDER"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type Participant = {
  _id: string;
  facebookId: string;
  fullName: string;
  email: string | null;
  profilePicture: string | null;
  status: "pending" | "approved" | "rejected";
  ipAddress: string | null;
  createdAt: string;
};

const LoginScreen = ({ onLogin }: { onLogin: (token: string) => void }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState("admin@contest.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      const { data } = await api.post("/admin/login", { email, password });
      localStorage.setItem("admin_token", data.token);
      onLogin(data.token);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Mot de passe incorrect";
      toast({ title: "Accès refusé", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="bg-card-gradient border border-border rounded-2xl p-8 shadow-card w-full max-w-sm space-y-6">
        <div className="text-center">
          <Lock className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-3xl font-display tracking-wide">ADMIN</h1>
          <p className="text-sm text-muted-foreground mt-2">Connectez-vous pour accéder au dashboard</p>
        </div>
        <div className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input type="email" placeholder="Email admin" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10 bg-secondary border-border" />
          </div>
          <Input type="password" placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="bg-secondary border-border" />
        </div>
        <Button onClick={handleLogin} disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider">
          {loading ? "Connexion..." : "CONNEXION"}
        </Button>
      </div>
    </div>
  );
};

const Admin = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Participant | null>(null);
  const [drawOpen, setDrawOpen] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [configOpen, setConfigOpen] = useState(false);

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get("/admin/participants");
      setParticipants(data.participants);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les participants", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { if (token) fetchParticipants(); }, [token, fetchParticipants]);

  const updateStatus = async (id: string, status: string) => {
    await api.patch(`/admin/participants/${id}/status`, { status });
    fetchParticipants();
    toast({ title: "Mis à jour", description: `Statut → "${status}"` });
  };

  const performDraw = () => {
    const eligible = participants.filter((p) => p.status === "approved");
    if (eligible.length === 0) { toast({ title: "Aucun participant éligible", variant: "destructive" }); return; }
    const idx = crypto.getRandomValues(new Uint32Array(1))[0] % eligible.length;
    setWinner(eligible[idx]);
    setDrawOpen(true);
  };

  const logout = () => { localStorage.removeItem("admin_token"); setToken(null); setParticipants([]); };

  if (!token) return <LoginScreen onLogin={setToken} />;

  const filtered = participants.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch = !search || p.fullName.toLowerCase().includes(q) || (p.email || "").toLowerCase().includes(q);
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: participants.length,
    pending: participants.filter((p) => p.status === "pending").length,
    approved: participants.filter((p) => p.status === "approved").length,
    rejected: participants.filter((p) => p.status === "rejected").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-display tracking-wide">DASHBOARD <span className="text-gradient">ADMIN</span></h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)} className="border-border text-foreground hover:bg-secondary">
            <Settings className="h-4 w-4 mr-2" /> Config Facebook
          </Button>
          <Button variant="outline" size="sm" onClick={logout} className="border-border text-foreground hover:bg-secondary">
            <LogOut className="h-4 w-4 mr-2" /> Déconnexion
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, icon: Users, color: "text-foreground" },
            { label: "En attente", value: stats.pending, icon: AlertTriangle, color: "text-warning" },
            { label: "Validés", value: stats.approved, icon: CheckCircle, color: "text-success" },
            { label: "Refusés", value: stats.rejected, icon: XCircle, color: "text-destructive" },
          ].map((s) => (
            <div key={s.label} className="bg-card-gradient border border-border rounded-xl p-5 shadow-card">
              <s.icon className={`h-5 w-5 ${s.color} mb-2`} />
              <div className={`text-3xl font-display ${s.color}`}>{s.value}</div>
              <div className="text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex gap-3 flex-1 w-full sm:w-auto">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-secondary border-border" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-secondary border-border"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="approved">Validés</SelectItem>
                <SelectItem value="rejected">Refusés</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() => navigate("/draw")}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider shadow-glow animate-pulse px-6 py-3 text-base"
          >
            <Trophy className="h-5 w-5 mr-2" /> COMMENCER LE TIRAGE AU SORT
          </Button>
        </div>

        <div className="bg-card-gradient border border-border rounded-xl shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Photo", "Nom", "Email", "Statut", "Date", "Actions"].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-sm font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Chargement...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">Aucun participant</td></tr>
                ) : filtered.map((p) => (
                  <tr key={p._id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                    <td className="px-4 py-3">
                      {p.profilePicture ? (
                        <img src={p.profilePicture} alt={p.fullName} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-sm font-display text-primary border border-border">{p.fullName[0]}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{p.fullName}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{p.email || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge className={p.status === "approved" ? "bg-success/20 text-success border-success/30" : p.status === "rejected" ? "bg-destructive/20 text-destructive border-destructive/30" : "bg-warning/20 text-warning border-warning/30"}>
                        {p.status === "approved" ? "Validé" : p.status === "rejected" ? "Refusé" : "En attente"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(p.createdAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setSelected(p)} className="text-muted-foreground hover:text-foreground"><Eye className="h-4 w-4" /></Button>
                        {p.status !== "approved" && <Button size="icon" variant="ghost" onClick={() => updateStatus(p._id, "approved")} className="text-success hover:text-success"><Check className="h-4 w-4" /></Button>}
                        {p.status !== "rejected" && <Button size="icon" variant="ghost" onClick={() => updateStatus(p._id, "rejected")} className="text-destructive hover:text-destructive"><X className="h-4 w-4" /></Button>}
                        {p.status !== "pending" && <Button size="icon" variant="ghost" onClick={() => updateStatus(p._id, "pending")} className="text-warning hover:text-warning"><Ban className="h-4 w-4" /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl tracking-wide">{selected?.fullName}</DialogTitle>
            <DialogDescription>Détails du participant Facebook</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              {selected.profilePicture && <div className="flex justify-center"><img src={selected.profilePicture} alt={selected.fullName} referrerPolicy="no-referrer" className="w-20 h-20 rounded-full border-2 border-primary object-cover" /></div>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Email :</span> <span className="text-foreground">{selected.email || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Statut :</span> <span className="text-foreground">{selected.status}</span></div>
                <div><span className="text-muted-foreground">IP :</span> <span className="text-foreground">{selected.ipAddress || "N/A"}</span></div>
                <div><span className="text-muted-foreground">Date :</span> <span className="text-foreground">{new Date(selected.createdAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</span></div>
              </div>
              <p className="text-xs text-muted-foreground break-all">Facebook ID : {selected.facebookId}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={drawOpen} onOpenChange={setDrawOpen}>
        <DialogContent className="bg-card border-border max-w-md text-center">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl tracking-wide">🎉 <span className="text-gradient">GAGNANT</span> 🎉</DialogTitle>
            <DialogDescription>Résultat du tirage au sort</DialogDescription>
          </DialogHeader>
          {winner && (
            <div className="space-y-4 py-4">
              {winner.profilePicture && <img src={winner.profilePicture} alt={winner.fullName} referrerPolicy="no-referrer" className="w-20 h-20 rounded-full border-2 border-primary object-cover mx-auto" />}
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto"><Trophy className="h-8 w-8 text-primary" /></div>
              <h3 className="text-2xl font-display tracking-wide text-foreground">{winner.fullName}</h3>
              {winner.email && <p className="text-sm text-muted-foreground">Email : {winner.email}</p>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setDrawOpen(false)} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider">FERMER</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
