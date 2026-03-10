import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { useNavigate } from "react-router-dom";
import { Trophy, Star, Zap, ArrowLeft, RotateCcw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/services/api";

// ─── Types ────────────────────────────────────────────────────────────────────
type Participant = {
  _id: string;
  fullName: string;
  email: string | null;
  profilePicture: string | null;
  status: string;
};

type Phase = "intro" | "qualification" | "league" | "final" | "winner";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const shuffle = <T,>(arr: T[]): T[] => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const fireConfetti = () => {
  const opts = { particleCount: 120, spread: 80, origin: { y: 0.6 } };
  confetti({ ...opts, colors: ["#e03030", "#ffffff", "#ffd700"] });
  setTimeout(() => confetti({ ...opts, origin: { x: 0.1, y: 0.6 } }), 300);
  setTimeout(() => confetti({ ...opts, origin: { x: 0.9, y: 0.6 } }), 600);
};

// ─── Sub-components ──────────────────────────────────────────────────────────
const Avatar = ({ src, name, size = "md" }: { src: string | null; name: string; size?: "sm" | "md" | "lg" | "xl" }) => {
  const sizes = { sm: "w-10 h-10 text-sm", md: "w-14 h-14 text-base", lg: "w-20 h-20 text-xl", xl: "w-28 h-28 text-3xl" };
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return src ? (
    <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover ring-2 ring-primary/50`} />
  ) : (
    <div className={`${sizes[size]} rounded-full bg-primary/20 flex items-center justify-center font-display text-primary ring-2 ring-primary/50`}>
      {initials}
    </div>
  );
};

const ParticipantCard = ({ p, delay = 0, highlight = false }: { p: Participant; delay?: number; highlight?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 200 }}
    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-300 ${
      highlight
        ? "border-primary bg-primary/10 shadow-[0_0_30px_rgba(224,48,48,0.4)]"
        : "border-border bg-card/60"
    }`}
  >
    <Avatar src={p.profilePicture} name={p.fullName} size="md" />
    <span className="text-xs font-medium text-center text-foreground leading-tight line-clamp-2">{p.fullName}</span>
  </motion.div>
);

// ─── Phase 1: Qualification ───────────────────────────────────────────────────
const QualificationPhase = ({
  participants,
  onDone,
}: {
  participants: Participant[];
  onDone: (qualified: Participant[]) => void;
}) => {
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<Participant | null>(null);
  const [selected, setSelected] = useState<Participant[]>([]);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const pickNext = useCallback(() => {
    if (selected.length >= 10) return;
    setRolling(true);
    let ticks = 0;
    const maxTicks = 25 + Math.floor(Math.random() * 20);
    intervalRef.current = setInterval(() => {
      setDisplay(participants[Math.floor(Math.random() * participants.length)]);
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(intervalRef.current!);
        const remaining = participants.filter((p) => !selected.some((s) => s._id === p._id));
        const winner = remaining[Math.floor(Math.random() * remaining.length)];
        setSelected((prev) => {
          const next = [...prev, winner];
          if (next.length === 10) setDone(true);
          return next;
        });
        setDisplay(winner);
        setRolling(false);
      }
    }, 60);
  }, [participants, selected]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const autoRun = useCallback(async () => {
    for (let i = 0; i < 10; i++) {
      await new Promise<void>((res) => {
        let ticks = 0;
        const maxTicks = 20 + Math.floor(Math.random() * 15);
        const pool = participants.filter((p) => !selected.some((s) => s._id === p._id));
        const interval = setInterval(() => {
          setDisplay(participants[Math.floor(Math.random() * participants.length)]);
          ticks++;
          if (ticks >= maxTicks) {
            clearInterval(interval);
            const pick = pool[Math.floor(Math.random() * pool.length)];
            setSelected((prev) => [...prev, pick]);
            setDisplay(pick);
            setTimeout(res, 600);
          }
        }, 60);
      });
    }
    setDone(true);
  }, [participants, selected]);

  const handleStart = () => {
    setSelected([]);
    setDone(false);
    autoRun();
  };

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-sm text-primary font-medium">
          <Star className="h-4 w-4" /> Phase 1 — Qualification
        </div>
        <p className="text-muted-foreground text-sm">Sélection de 10 qualifiés parmi {participants.length} participants</p>
      </div>

      {/* Roulette display */}
      <div className="flex justify-center">
        <AnimatePresence mode="wait">
          {display && (
            <motion.div
              key={display._id + (rolling ? "roll" : "fixed")}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.05 }}
              className={`flex items-center gap-4 px-8 py-4 rounded-2xl border ${
                rolling ? "border-primary/50 bg-primary/5" : "border-primary bg-primary/10 shadow-[0_0_40px_rgba(224,48,48,0.5)]"
              }`}
            >
              <Avatar src={display.profilePicture} name={display.fullName} size="lg" />
              <div>
                <p className="font-display text-2xl tracking-wide text-foreground">{display.fullName}</p>
                {!rolling && <p className="text-primary text-sm font-medium mt-1">✓ QUALIFIÉ !</p>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {selected.length === 0 && !rolling && (
        <div className="flex justify-center">
          <Button
            onClick={handleStart}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider text-lg px-10 py-6 rounded-xl shadow-glow animate-pulse-glow"
          >
            <Zap className="h-5 w-5 mr-2" /> LANCER LA QUALIFICATION
          </Button>
        </div>
      )}

      {/* Selected grid */}
      {selected.length > 0 && (
        <div>
          <p className="text-center text-sm text-muted-foreground mb-4">{selected.length} / 10 qualifiés</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-w-2xl mx-auto">
            {selected.map((p, i) => (
              <ParticipantCard key={p._id} p={p} delay={i * 0.05} highlight={i === selected.length - 1} />
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => onDone(selected)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider px-8 py-4 rounded-xl shadow-glow"
          >
            Phase de Ligue →
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Phase 2: League ──────────────────────────────────────────────────────────
const LeaguePhase = ({
  qualified,
  onDone,
}: {
  qualified: Participant[];
  onDone: (finalists: Participant[]) => void;
}) => {
  const groups = [
    { label: "Groupe A", color: "border-blue-500/50 bg-blue-500/5", glow: "shadow-[0_0_20px_rgba(59,130,246,0.3)]" },
    { label: "Groupe B", color: "border-yellow-500/50 bg-yellow-500/5", glow: "shadow-[0_0_20px_rgba(234,179,8,0.3)]" },
    { label: "Groupe C", color: "border-green-500/50 bg-green-500/5", glow: "shadow-[0_0_20px_rgba(34,197,94,0.3)]" },
  ];

  // Computed once — avoids re-shuffling on every state update
  const split = useMemo(() => {
    const s = shuffle(qualified);
    return [s.slice(0, 4), s.slice(4, 7), s.slice(7, 10)];
  }, [qualified]);

  const [winners, setWinners] = useState<(Participant | null)[]>([null, null, null]);
  const [drawing, setDrawing] = useState<number | null>(null);
  const [displayMap, setDisplayMap] = useState<(Participant | null)[]>([null, null, null]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const drawGroup = (gi: number) => {
    if (drawing !== null) return;
    setDrawing(gi);
    let ticks = 0;
    const maxTicks = 30 + Math.floor(Math.random() * 20);
    // Capture the group slice once — stable reference inside the interval
    const group = split[gi];
    intervalRef.current = setInterval(() => {
      setDisplayMap((prev) => {
        const next = [...prev];
        next[gi] = group[Math.floor(Math.random() * group.length)];
        return next;
      });
      ticks++;
      if (ticks >= maxTicks) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        const w = group[Math.floor(Math.random() * group.length)];
        setWinners((prev) => { const n = [...prev]; n[gi] = w; return n; });
        setDisplayMap((prev) => { const n = [...prev]; n[gi] = w; return n; });
        setDrawing(null);
      }
    }, 80);
  };

  const allDone = winners.every(Boolean);

  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 text-sm text-yellow-400 font-medium">
          <Trophy className="h-4 w-4" /> Phase 2 — Ligue des Champions
        </div>
        <p className="text-muted-foreground text-sm">10 qualifiés → 3 groupes → 3 finalistes</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {groups.map((g, gi) => (
          <div key={gi} className={`border rounded-2xl p-4 space-y-4 ${g.color} ${winners[gi] ? g.glow : ""} transition-all duration-500`}>
            <h3 className="font-display text-lg tracking-wide text-center">{g.label}</h3>
            <div className="space-y-2">
              {split[gi].map((p) => (
                <div
                  key={p._id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all duration-300 ${
                    winners[gi]?._id === p._id
                      ? "bg-primary/20 border border-primary text-foreground font-semibold"
                      : displayMap[gi]?._id === p._id && drawing === gi
                      ? "bg-white/10 border border-white/30"
                      : "text-muted-foreground"
                  }`}
                >
                  <Avatar src={p.profilePicture} name={p.fullName} size="sm" />
                  <span className="truncate">{p.fullName}</span>
                  {winners[gi]?._id === p._id && <span className="ml-auto">🏆</span>}
                </div>
              ))}
            </div>
            {!winners[gi] && (
              <Button
                onClick={() => drawGroup(gi)}
                disabled={drawing !== null}
                size="sm"
                className="w-full bg-primary/80 hover:bg-primary text-primary-foreground font-display tracking-wider"
              >
                {drawing === gi ? "Tirage..." : "Tirer le gagnant"}
              </Button>
            )}
            {winners[gi] && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-2 pt-2"
              >
                <Avatar src={winners[gi]!.profilePicture} name={winners[gi]!.fullName} size="md" />
                <span className="text-xs font-semibold text-primary text-center">{winners[gi]!.fullName}</span>
                <span className="text-xs text-muted-foreground">Finaliste ✓</span>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {allDone && (
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => onDone(winners as Participant[])}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider px-8 py-4 rounded-xl shadow-glow"
          >
            Phase Finale →
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Phase 3: Final ───────────────────────────────────────────────────────────
const FinalPhase = ({ finalists, onDone }: { finalists: Participant[]; onDone: (winner: Participant) => void }) => {
  const [rolling, setRolling] = useState(false);
  const [display, setDisplay] = useState<Participant | null>(null);
  const [started, setStarted] = useState(false);

  const runFinal = () => {
    setStarted(true);
    setRolling(true);
    let speed = 80;
    let ticks = 0;
    const totalTicks = 50;

    const tick = () => {
      setDisplay(finalists[Math.floor(Math.random() * finalists.length)]);
      ticks++;
      if (ticks < totalTicks) {
        speed = 80 + (ticks / totalTicks) * 500;
        setTimeout(tick, speed);
      } else {
        const winner = finalists[Math.floor(Math.random() * finalists.length)];
        setDisplay(winner);
        setRolling(false);
        setTimeout(() => {
          fireConfetti();
          setTimeout(() => onDone(winner), 800);
        }, 600);
      }
    };
    setTimeout(tick, speed);
  };

  return (
    <div className="space-y-10">
      <div className="text-center space-y-2">
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="inline-flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-4 py-1.5 text-sm text-primary font-medium"
        >
          <Star className="h-4 w-4" /> Phase Finale — LE GRAND GAGNANT
        </motion.div>
        <p className="text-muted-foreground text-sm">3 finalistes · 1 seul gagnant</p>
      </div>

      {/* Finalists */}
      <div className="flex justify-center gap-6 flex-wrap">
        {finalists.map((p, i) => (
          <motion.div
            key={p._id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2 }}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-500 ${
              display?._id === p._id && rolling
                ? "border-primary scale-110 bg-primary/20 shadow-[0_0_40px_rgba(224,48,48,0.6)]"
                : "border-border bg-card/60"
            }`}
          >
            <Avatar src={p.profilePicture} name={p.fullName} size="lg" />
            <span className="text-sm font-medium text-center">{p.fullName}</span>
          </motion.div>
        ))}
      </div>

      {/* Spotlight */}
      {started && display && (
        <motion.div
          key={display._id + rolling.toString()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center"
        >
          <div className={`text-center px-10 py-6 rounded-3xl border ${rolling ? "border-primary/50 bg-primary/5" : "border-primary bg-primary/10 shadow-[0_0_60px_rgba(224,48,48,0.7)]"}`}>
            <Avatar src={display.profilePicture} name={display.fullName} size="xl" />
            <p className="font-display text-3xl mt-4 tracking-wide">{display.fullName}</p>
            {rolling && <p className="text-primary text-sm mt-2 animate-pulse">Tirage en cours...</p>}
          </div>
        </motion.div>
      )}

      {!started && (
        <div className="flex justify-center">
          <Button
            onClick={runFinal}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-wider text-xl px-12 py-7 rounded-2xl shadow-glow animate-pulse-glow"
          >
            <Trophy className="h-6 w-6 mr-3" /> LANCER LA FINALE !
          </Button>
        </div>
      )}
    </div>
  );
};

// ─── Winner Card ──────────────────────────────────────────────────────────────
const WinnerCard = ({ winner, total }: { winner: Participant; total: number }) => {
  const navigate = useNavigate();

  useEffect(() => {
    fireConfetti();
    const id = setInterval(fireConfetti, 3000);
    return () => clearInterval(id);
  }, []);

  const exportWinner = () => {
    const text = `🏆 GRAND GAGNANT DU SCOOTER SYM JET 4 RX\n\nNom : ${winner.fullName}\nEmail : ${winner.email || "N/A"}\nID : ${winner._id}\n\nDate : ${new Date().toLocaleString("fr-FR")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `gagnant-${Date.now()}.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 150, damping: 12 }}
      className="flex flex-col items-center text-center space-y-8"
    >
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="text-6xl"
      >
        🏆
      </motion.div>

      <div className="space-y-2">
        <p className="text-primary font-display text-xl tracking-widest">LE GRAND GAGNANT DU</p>
        <p className="font-display text-4xl md:text-6xl tracking-wide text-gradient">SYM JET 4 RX</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card-gradient border border-primary shadow-[0_0_80px_rgba(224,48,48,0.4)] rounded-3xl p-8 space-y-4"
      >
        <Avatar src={winner.profilePicture} name={winner.fullName} size="xl" />
        <p className="font-display text-4xl tracking-wide text-foreground">{winner.fullName}</p>
        {winner.email && <p className="text-muted-foreground text-sm">{winner.email}</p>}
        <div className="flex items-center justify-center gap-2 text-primary font-medium">
          <Star className="h-4 w-4" /> Félicitations ! <Star className="h-4 w-4" />
        </div>
      </motion.div>

      <p className="text-muted-foreground text-sm">Tiré parmi <span className="text-primary font-semibold">{total}</span> participants</p>

      <div className="flex gap-4 flex-wrap justify-center">
        <Button onClick={exportWinner} variant="outline" className="border-border gap-2">
          <Download className="h-4 w-4" /> Exporter le résultat
        </Button>
        <Button onClick={() => navigate("/")} variant="outline" className="border-border gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour au dashboard
        </Button>
        <Button onClick={() => window.location.reload()} className="bg-primary text-primary-foreground gap-2">
          <RotateCcw className="h-4 w-4" /> Nouveau tirage
        </Button>
      </div>
    </motion.div>
  );
};

// ─── Main DrawPage ────────────────────────────────────────────────────────────
const DrawPage = () => {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("intro");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [qualified, setQualified] = useState<Participant[]>([]);
  const [finalists, setFinalists] = useState<Participant[]>([]);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/participants?limit=500")
      .then(({ data }) => {
        const approved = data.participants.filter((p: Participant) => p.status === "approved");
        setParticipants(approved);
      })
      .catch(() => setError("Impossible de charger les participants"))
      .finally(() => setLoading(false));
  }, []);

  const phaseLabels: Record<Phase, string> = {
    intro: "Intro",
    qualification: "Qualification",
    league: "Phase de Ligue",
    final: "Finale",
    winner: "Gagnant",
  };

  const phaseOrder: Phase[] = ["intro", "qualification", "league", "final", "winner"];
  const currentIdx = phaseOrder.indexOf(phase);

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-4">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Trophy className="h-12 w-12 text-primary mx-auto" />
        </motion.div>
        <p className="text-muted-foreground">Chargement des participants...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between relative z-10">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>
        <h1 className="font-display text-xl tracking-wide">
          TIRAGE AU SORT — <span className="text-gradient">SYM JET 4 RX</span>
        </h1>
        <div className="text-sm text-muted-foreground">
          {participants.length} participant{participants.length > 1 ? "s" : ""} éligible{participants.length > 1 ? "s" : ""}
        </div>
      </header>

      {/* Progress bar */}
      {phase !== "intro" && (
        <div className="border-b border-border px-6 py-3 flex gap-2 relative z-10">
          {phaseOrder.filter(p => p !== "intro").map((p, i) => (
            <div key={p} className="flex items-center gap-2 flex-1">
              <div className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i < currentIdx ? "bg-primary" : i === currentIdx - 1 ? "bg-primary" : "bg-border"}`} />
              <span className={`text-xs whitespace-nowrap ${i === currentIdx - 1 ? "text-primary" : "text-muted-foreground"}`}>
                {phaseLabels[p]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="container mx-auto px-4 py-10 max-w-4xl relative z-10">
        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              className="text-center space-y-10 py-10"
            >
              <motion.div
                animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
                transition={{ repeat: Infinity, duration: 4 }}
                className="text-8xl"
              >
                🏆
              </motion.div>
              <div className="space-y-4">
                <h1 className="font-display text-5xl md:text-7xl tracking-wide">
                  GRAND <span className="text-gradient">TIRAGE</span>
                </h1>
                <p className="text-xl text-muted-foreground">SYM JET 4 RX · MEGA CYCLE × Blayah Scooteriste</p>
              </div>

              {error ? (
                <p className="text-destructive">{error}</p>
              ) : participants.length < 3 ? (
                <p className="text-warning">Il faut au moins 3 participants validés pour lancer le tirage.</p>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-center gap-8 text-center">
                    <div><div className="font-display text-4xl text-primary">{participants.length}</div><div className="text-sm text-muted-foreground">Participants éligibles</div></div>
                    <div className="w-px bg-border" />
                    <div><div className="font-display text-4xl text-foreground">3</div><div className="text-sm text-muted-foreground">Phases</div></div>
                    <div className="w-px bg-border" />
                    <div><div className="font-display text-4xl text-primary">1</div><div className="text-sm text-muted-foreground">Grand Gagnant</div></div>
                  </div>

                  <Button
                    onClick={() => setPhase("qualification")}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-display tracking-widest text-2xl px-14 py-8 rounded-2xl shadow-glow animate-pulse-glow"
                  >
                    <Zap className="h-7 w-7 mr-3" /> COMMENCER LE TIRAGE
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {phase === "qualification" && (
            <motion.div key="qual" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}>
              <QualificationPhase
                participants={shuffle(participants).slice(0, Math.min(participants.length, 50))}
                onDone={(q) => { setQualified(q); setPhase("league"); }}
              />
            </motion.div>
          )}

          {phase === "league" && (
            <motion.div key="league" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}>
              <LeaguePhase
                qualified={qualified}
                onDone={(f) => { setFinalists(f); setPhase("final"); }}
              />
            </motion.div>
          )}

          {phase === "final" && (
            <motion.div key="final" initial={{ opacity: 0, x: 100 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -100 }}>
              <FinalPhase
                finalists={finalists}
                onDone={(w) => { setWinner(w); setPhase("winner"); }}
              />
            </motion.div>
          )}

          {phase === "winner" && winner && (
            <motion.div key="winner" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <WinnerCard winner={winner} total={participants.length} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default DrawPage;
