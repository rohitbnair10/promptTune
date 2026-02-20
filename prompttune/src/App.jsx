import { useState, useEffect, useRef } from "react";

const FREE_LIMIT = 3;
const getRunsUsed = () => { try { return parseInt(localStorage.getItem("ek_runs") || "0"); } catch(e) { return 0; } };
const setRunsUsed = (n) => { try { localStorage.setItem("ek_runs", String(n)); } catch(e) {} };
const getSavedKey = () => { try { return localStorage.getItem("ek_key") || ""; } catch(e) { return ""; } };
const saveKey = (k) => { try { localStorage.setItem("ek_key", k); } catch(e) {} };
const getSavedProvider = () => { try { return localStorage.getItem("ek_provider") || "anthropic"; } catch(e) { return "anthropic"; } };
const saveProvider = (p) => { try { localStorage.setItem("ek_provider", p); } catch(e) {} };

async function callAI(prompt, system) {
  const body = { model: "claude-sonnet-4-20250514", max_tokens: 1000, messages: [{ role: "user", content: prompt }] };
  if (system) body.system = system;
  const t0 = performance.now();
  const res = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Error ${res.status}`);
  const text = data.content?.map(b => b.text || "").join("") || "";
  const usage = data.usage || {};
  return { text, latency: Math.round(performance.now() - t0), inputTokens: usage.input_tokens || 0, outputTokens: usage.output_tokens || 0 };
}

// ═══ Scroll-triggered visibility hook ═══
function useReveal(threshold = 0.15) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return [ref, visible];
}

// ═══ Animated counter ═══
function Counter({ end, suffix = "", duration = 1200 }) {
  const [val, setVal] = useState(0);
  const [ref, vis] = useReveal();
  useEffect(() => {
    if (!vis) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * end));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [vis, end, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ═══ Typewriter ═══
function Typewriter({ text, speed = 40, delay = 0 }) {
  const [shown, setShown] = useState(0);
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  useEffect(() => {
    if (!started || shown >= text.length) return;
    const t = setTimeout(() => setShown(s => s + 1), speed);
    return () => clearTimeout(t);
  }, [started, shown, text, speed]);
  return <>{text.slice(0, shown)}<span style={{ borderRight: shown < text.length ? "2px solid #f59e0b" : "none", animation: "blink 0.8s infinite" }}>&nbsp;</span></>;
}

// ═══ Floating particles ═══
function Particles() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    let w = c.width = c.offsetWidth;
    let h = c.height = c.offsetHeight;
    const pts = Array.from({ length: 40 }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 2 + 0.5, a: Math.random() * 0.3 + 0.05,
    }));
    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(245,158,11,${p.a})`;
        ctx.fill();
      });
      // Draw lines between close particles
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(245,158,11,${0.06 * (1 - dist / 120)})`;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    const onResize = () => { w = c.width = c.offsetWidth; h = c.height = c.offsetHeight; };
    window.addEventListener("resize", onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

// ═══ Animated prompt demo ═══
function PromptDemo() {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const ts = [setTimeout(() => setPhase(1), 600), setTimeout(() => setPhase(2), 1800), setTimeout(() => setPhase(3), 3000), setTimeout(() => setPhase(4), 4200)];
    return () => ts.forEach(clearTimeout);
  }, []);

  const box = (active, color) => ({
    background: "#0a0a0a", border: `1px solid ${active ? color + "40" : "#1a1a1a"}`,
    borderRadius: 10, padding: "12px 14px", fontSize: 11, lineHeight: 1.6,
    transition: "all 0.5s cubic-bezier(0.16,1,0.3,1)", fontFamily: "'IBM Plex Mono', monospace",
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ ...box(phase >= 1, "#f59e0b"), opacity: phase >= 0 ? 1 : 0, transform: `translateX(${phase >= 0 ? 0 : 20}px)` }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#888", letterSpacing: 1, marginBottom: 4 }}>INPUT</div>
        <span style={{ color: "#aaa" }}>You are a helpful assistant that answers questions about our product.</span>
      </div>
      <div style={{ ...box(phase >= 2, "#f59e0b"), opacity: phase >= 1 ? 1 : 0, transform: `translateX(${phase >= 1 ? 0 : 20}px)` }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 4 }}>◈ WEAKNESSES</div>
        <span style={{ color: "#aaa" }}><span style={{ color: "#f59e0b" }}>▸</span> No output constraints <span style={{ color: "#f59e0b" }}>▸</span> Vague scope <span style={{ color: "#f59e0b" }}>▸</span> Missing tone</span>
      </div>
      <div style={{ ...box(phase >= 3, "#10b981"), opacity: phase >= 2 ? 1 : 0, transform: `translateX(${phase >= 2 ? 0 : 20}px)` }}>
        <div style={{ fontSize: 8, fontWeight: 700, color: "#10b981", letterSpacing: 1, marginBottom: 4 }}>✓ OPTIMIZED</div>
        <span style={{ color: "#7a9a7a" }}>Concise product support agent. 1-3 sentences. Professional, empathetic. If unsure, escalate.</span>
      </div>
      <div style={{ display: "flex", gap: 6, opacity: phase >= 3 ? 1 : 0, transition: "all 0.5s", transform: `translateY(${phase >= 3 ? 0 : 10}px)` }}>
        {[{ l: "Accuracy", v: "+3", c: "#10b981" }, { l: "Cost", v: "-28%", c: "#10b981" }, { l: "Speed", v: "-340ms", c: "#10b981" }].map((m, i) => (
          <div key={i} style={{ flex: 1, background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 8, padding: "6px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: m.c, fontFamily: "'Space Mono'" }}>{m.v}</div>
            <div style={{ fontSize: 7, color: "#888", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{m.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════
export default function App() {
  const toolRef = useRef(null);
  const [sysPrompt, setSysPrompt] = useState("");
  const [userInput, setUserInput] = useState("");
  const [criteria, setCriteria] = useState("");
  const [goal, setGoal] = useState("accuracy");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState(() => getSavedKey());
  const [provider, setProvider] = useState(() => getSavedProvider());
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [runsUsed, setRunsUsedState] = useState(() => getRunsUsed());
  const [step, setStep] = useState("");

  const freeLeft = FREE_LIMIT - runsUsed;
  const canRun = apiKey || freeLeft > 0;

  const scrollToTool = () => setTimeout(() => toolRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

  // Scroll-triggered sections
  const [r1, v1] = useReveal(); const [r2, v2] = useReveal(); const [r3, v3] = useReveal();
  const [r4, v4] = useReveal(); const [r5, v5] = useReveal();

  const run = async () => {
    if (!canRun) { setShowKeyModal(true); return; }
    setLoading(true); setError(""); setResult(null);
    const goalMap = {
      accuracy: "Maximize how well the output meets the criteria. Add explicit constraints, guardrails, output format rules.",
      cost: "Minimize total tokens. Make the system prompt shorter. Instruct the AI to respond concisely.",
      latency: "Minimize response time. Add strict length limits. Prioritize speed.",
    };
    try {
      setStep("Testing current prompt...");
      const origTest = await callAI(userInput, sysPrompt);
      setStep("Generating optimized prompt...");
      const optRes = await callAI(`You are an expert prompt engineer. Improve this system prompt.

CURRENT SYSTEM PROMPT:
${sysPrompt}

SAMPLE USER INPUT:
${userInput}

SUCCESS CRITERIA:
${criteria}

OPTIMIZATION GOAL: ${goal.toUpperCase()}
${goalMap[goal]}

Evaluate CURRENT accuracy 1-10 and estimate IMPROVED accuracy.

Respond ONLY in JSON:
{
  "improved_prompt": "full improved system prompt",
  "input_format": "recommended user input format",
  "changes": ["change 1", "change 2", "change 3"],
  "why": "one sentence",
  "current_accuracy": 7,
  "expected_accuracy": 9
}`, null);
      const raw = optRes.text;
      const cleaned = raw.replace(/```json\n?|```/g, "").trim();
      var fixed = cleaned;
      try { JSON.parse(fixed); } catch(e) {
        // Fix unescaped newlines inside JSON strings
        fixed = fixed.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t");
        // Restore structural newlines after colons, commas, braces
        fixed = fixed.replace(/\\n(\s*["\]},{[])/g, "\n$1");
      }
      let parsed;
      try { parsed = JSON.parse(fixed); } catch(e) {
        const ex = k => { const m = raw.match(new RegExp(`"${k}"\\s*:\\s*"([\\s\\S]*?)(?:"|$)`)); return m ? m[1].replace(/\\n/g, "\n") : ""; };
        const en = k => { const m = raw.match(new RegExp(`"${k}"\\s*:\\s*(\\d+)`)); return m ? parseInt(m[1]) : 5; };
        const ea = k => { const m = raw.match(new RegExp(`"${k}"\\s*:\\s*\\[([\\s\\S]*?)\\]`)); return m ? (m[1].match(/"([^"]+)"/g)?.map(s => s.replace(/"/g, "")) || []) : []; };
        parsed = { improved_prompt: ex("improved_prompt"), input_format: ex("input_format"), changes: ea("changes"), why: ex("why"), current_accuracy: en("current_accuracy"), expected_accuracy: en("expected_accuracy") };
      }
      setStep("Testing optimized prompt...");
      const optTest = await callAI(userInput, parsed.improved_prompt);
      if (!apiKey) { const n = runsUsed + 1; setRunsUsed(n); setRunsUsedState(n); }
      const inR = (apiKey && provider === "openai") ? 0.15 : 3, outR = (apiKey && provider === "openai") ? 0.6 : 15;
      setResult({
        ...parsed,
        metrics: {
          orig: { latency: origTest.latency, totalTokens: origTest.inputTokens + origTest.outputTokens, cost: (origTest.inputTokens * inR + origTest.outputTokens * outR) / 1e6, response: origTest.text },
          opt: { latency: optTest.latency, totalTokens: optTest.inputTokens + optTest.outputTokens, cost: (optTest.inputTokens * inR + optTest.outputTokens * outR) / 1e6, response: optTest.text },
        },
      });
      setStep("");
    } catch (e) { setError(e.message); setStep(""); }
    setLoading(false);
  };

  const ready = sysPrompt.trim() && userInput.trim() && criteria.trim();
  const I = { width: "100%", padding: "12px 14px", borderRadius: 10, background: "#0c0c0c", border: "1px solid #1e1e1e", color: "#e0e0e0", fontSize: 13, fontFamily: "'IBM Plex Mono', monospace", outline: "none", resize: "vertical", lineHeight: 1.6, transition: "border-color 0.2s" };

  const reveal = (vis, delay = 0) => ({
    opacity: vis ? 1 : 0,
    transform: vis ? "translateY(0)" : "translateY(30px)",
    transition: `all 0.7s cubic-bezier(0.16,1,0.3,1) ${delay}s`,
  });

  return (
    <div style={{ minHeight: "100vh", background: "#060606", color: "#ccc", fontFamily: "'IBM Plex Mono', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Space+Mono:wght@400;700&family=Instrument+Serif&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        textarea:focus,input:focus{border-color:#f59e0b!important}
        ::selection{background:#f59e0b;color:#060606}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#1e1e1e;border-radius:2px}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes slideIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        @keyframes glow{0%,100%{box-shadow:0 0 20px #f59e0b15}50%{box-shadow:0 0 40px #f59e0b25}}
        .stagger>*{animation:slideIn 0.6s cubic-bezier(0.16,1,0.3,1) both}
        .stagger>*:nth-child(1){animation-delay:0s}.stagger>*:nth-child(2){animation-delay:0.1s}
        .stagger>*:nth-child(3){animation-delay:0.2s}.stagger>*:nth-child(4){animation-delay:0.3s}
        .stagger>*:nth-child(5){animation-delay:0.4s}.stagger>*:nth-child(6){animation-delay:0.5s}
      `}</style>

      {/* ════════════ HERO ════════════ */}
      <section style={{ position: "relative", minHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", overflow: "hidden" }}>
        <Particles />
        <div style={{ position: "absolute", top: "10%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, #f59e0b06 0%, transparent 70%)" }} />
        <div style={{ position: "absolute", bottom: "-10%", left: "-5%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #10b98106 0%, transparent 70%)" }} />

        {/* ── Top-center brand ── */}
        <div className="stagger" style={{ position: "relative", zIndex: 3, textAlign: "center", paddingTop: 24, paddingBottom: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <span style={{ fontSize: 26, color: "#f59e0b", fontWeight: 700 }}>♫</span>
            <span style={{ fontSize: 24, fontWeight: 700, color: "#f5f5f0", fontFamily: "'Instrument Serif', serif", letterSpacing: "-0.5px" }}>PromptTune</span>
          </div>
        </div>

        <div style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 1100, margin: "auto", padding: "20px 28px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "center" }}>
          {/* Left */}
          <div className="stagger">
            <h1 style={{ fontSize: 60, fontWeight: 400, color: "#f5f5f0", fontFamily: "'Instrument Serif', serif", lineHeight: 1.1, letterSpacing: "-1px", marginBottom: 20 }}>
              <Typewriter text="Your prompts are costing you more than you think." speed={35} />
            </h1>

            <p style={{ fontSize: 13, color: "#999", lineHeight: 1.8, marginBottom: 28, maxWidth: 440 }}>
              PromptTune tests your system prompt against your success criteria, optimizes it, and shows you the exact improvement in accuracy, cost, and latency. In seconds.
            </p>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 32 }}>
              <button onClick={scrollToTool} style={{
                padding: "14px 28px", borderRadius: 8, border: "none", cursor: "pointer",
                background: "#f59e0b", color: "#060606", fontSize: 13, fontWeight: 700,
                fontFamily: "'IBM Plex Mono'", animation: "glow 3s infinite",
                transition: "transform 0.2s",
              }}
                onMouseEnter={e => e.target.style.transform = "translateY(-2px) scale(1.02)"}
                onMouseLeave={e => e.target.style.transform = "translateY(0) scale(1)"}
              >▶ Try it free</button>
              <span style={{ fontSize: 10, color: "#777" }}>3 free evaluations · No signup needed</span>
            </div>

            {/* Trust logos */}
            <div style={{ display: "flex", gap: 20, alignItems: "center", opacity: 0.3 }}>
              <span style={{ fontSize: 10, color: "#888", letterSpacing: 0.5 }}>Works with</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#999" }}>Anthropic</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#999" }}>OpenAI</span>
            </div>
          </div>

          {/* Right — Demo */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <PromptDemo />
          </div>
        </div>
      </section>

      {/* ════════════ STATS BAR ════════════ */}
      <section ref={r1} style={{ borderTop: "1px solid #111", borderBottom: "1px solid #111", padding: "24px 24px", ...reveal(v1) }}>
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", justifyContent: "space-around", textAlign: "center" }}>
          {[
            { val: <Counter end={87} suffix="%" />, label: "avg accuracy improvement" },
            { val: <Counter end={34} suffix="%" />, label: "avg cost reduction" },
            { val: <Counter end={3} suffix="x" />, label: "faster than manual testing" },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 36, fontWeight: 700, color: "#f59e0b", fontFamily: "'Space Mono', monospace" }}>{s.val}</div>
              <div style={{ fontSize: 10, color: "#777", marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ════════════ VALUE PROPS ════════════ */}
      <section ref={r2} style={{ padding: "50px 24px" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 30, ...reveal(v2) }}>
            <h2 style={{ fontSize: 45, fontFamily: "'Instrument Serif', serif", color: "#f5f5f0", fontWeight: 400, lineHeight: 1.15 }}>
              Why your AI features are underperforming
            </h2>
            <p style={{ fontSize: 12, color: "#888", marginTop: 8 }}>Most teams ship prompts based on vibes. Here's what you're missing.</p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {[
              { icon: "◎", title: "Blind spots in your prompt", desc: "Missing output constraints, vague instructions, no guardrails — PromptTune catches what you can't see by testing against your own criteria.", color: "#f59e0b", delay: 0 },
              { icon: "$", title: "Token waste", desc: "Verbose prompts = expensive responses. PromptTune measures exact token counts and shows you where to cut without losing quality.", color: "#10b981", delay: 0.1 },
              { icon: "⚡", title: "Slow responses", desc: "Users abandon AI features that take too long. PromptTune adds length constraints and restructures prompts for speed.", color: "#3b82f6", delay: 0.2 },
            ].map((v, i) => (
              <div key={i} style={{
                background: "#0a0a0a", border: "1px solid #151515", borderRadius: 14, padding: 24,
                transition: "all 0.4s cubic-bezier(0.16,1,0.3,1)", cursor: "default",
                ...reveal(v2, v.delay + 0.2),
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = v.color + "35"; e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.background = "#0c0c0c"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "#151515"; e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.background = "#0a0a0a"; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, background: v.color + "10", border: `1px solid ${v.color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: v.color, marginBottom: 16 }}>{v.icon}</div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#ddd", marginBottom: 8 }}>{v.title}</h3>
                <p style={{ fontSize: 11, color: "#999", lineHeight: 1.7 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ HOW IT WORKS ════════════ */}
      <section ref={r3} style={{ padding: "50px 24px", borderTop: "1px solid #111" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 30, ...reveal(v3) }}>
            <h2 style={{ fontSize: 45, fontFamily: "'Instrument Serif', serif", color: "#f5f5f0", fontWeight: 400, lineHeight: 1.15 }}>Three steps. Real numbers.</h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
            {[
              { n: "01", title: "Paste your prompt", desc: "System prompt + sample user input + what good looks like.", icon: "📋" },
              { n: "02", title: "Pick your priority", desc: "Accuracy, cost, or speed — PromptTune optimizes for what matters.", icon: "🎯" },
              { n: "03", title: "See the difference", desc: "Side-by-side comparison with real metrics. Copy the winner.", icon: "📊" },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: "center", padding: "32px 20px", background: "#0a0a0a",
                border: "1px solid #151515", borderRadius: 14,
                ...reveal(v3, i * 0.15 + 0.2),
              }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", letterSpacing: 1, marginBottom: 8 }}>STEP {s.n}</div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#ddd", marginBottom: 8 }}>{s.title}</h4>
                <p style={{ fontSize: 11, color: "#999", lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════ TESTIMONIAL ════════════ */}
      <section ref={r4} style={{ padding: "40px 24px", borderTop: "1px solid #111" }}>
        <div style={{ maxWidth: 550, margin: "0 auto", textAlign: "center", ...reveal(v4) }}>
          <div style={{ fontSize: 40, color: "#555", fontFamily: "'Instrument Serif'", marginBottom: 12 }}>"</div>
          <p style={{ fontSize: 14, color: "#999", lineHeight: 1.8, fontStyle: "italic" }}>
            I was manually testing prompts for 2 hours. PromptTune found 3 issues and gave me an optimized version in 15 seconds. My response accuracy went from 6/10 to 9/10.
          </p>
          <div style={{ marginTop: 16, fontSize: 11, color: "#777" }}>— Built by a PM who ships AI products</div>
        </div>
      </section>

      {/* ════════════ CTA BANNER ════════════ */}
      <section ref={r5} style={{ padding: "40px 24px", borderTop: "1px solid #111" }}>
        <div style={{
          maxWidth: 700, margin: "0 auto", textAlign: "center",
          background: "#f59e0b08", border: "1px solid #f59e0b15",
          borderRadius: 16, padding: "36px 24px",
          ...reveal(v5),
        }}>
          <h3 style={{ fontSize: 22, fontFamily: "'Instrument Serif'", color: "#f5f5f0", fontWeight: 400, marginBottom: 10 }}>
            Ready to stop guessing?
          </h3>
          <p style={{ fontSize: 12, color: "#999", marginBottom: 20 }}>No signup. No credit card. Just paste your prompt.</p>
          <button onClick={scrollToTool} style={{
            padding: "14px 32px", borderRadius: 8, border: "none", cursor: "pointer",
            background: "#f59e0b", color: "#060606", fontSize: 13, fontWeight: 700,
            fontFamily: "'IBM Plex Mono'", transition: "transform 0.2s",
          }}
            onMouseEnter={e => e.target.style.transform = "scale(1.03)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          >▶ Optimize your first prompt</button>
        </div>
      </section>

      {/* ════════════ TOOL ════════════ */}
      <section ref={toolRef} id="tool" style={{ padding: "40px 24px 80px", borderTop: "1px solid #f59e0b10" }}>
        {showKeyModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowKeyModal(false)}>
            <div onClick={e => e.stopPropagation()} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, padding: 24, width: 420 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 6 }}>{freeLeft <= 0 && !apiKey ? "Free runs used up" : "API Key Settings"}</div>
              <p style={{ fontSize: 11, color: "#999", lineHeight: 1.6, marginBottom: 14 }}>{freeLeft <= 0 && !apiKey ? "Add your API key to continue. Stored locally only." : "Your key stays in your browser."}</p>
              <div style={{ fontSize: 9, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>PROVIDER</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[{ id: "anthropic", label: "Anthropic", desc: "Claude Sonnet 4", c: "#d97706" }, { id: "openai", label: "OpenAI", desc: "GPT-4o Mini", c: "#10b981" }].map(p => (
                  <button key={p.id} onClick={() => { setProvider(p.id); saveProvider(p.id); }} style={{ flex: 1, padding: 10, borderRadius: 8, cursor: "pointer", textAlign: "center", border: provider === p.id ? `1.5px solid ${p.c}` : "1px solid #1e1e1e", background: provider === p.id ? `${p.c}12` : "#0a0a0a", fontFamily: "'IBM Plex Mono'" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: provider === p.id ? p.c : "#666" }}>{p.label}</div>
                    <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{p.desc}</div>
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 9, color: "#888", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>API KEY</div>
              <input type="password" value={apiKey} onChange={e => { setApiKey(e.target.value); saveKey(e.target.value); }} placeholder={provider === "openai" ? "sk-proj-..." : "sk-ant-..."} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#0a0a0a", border: "1px solid #1e1e1e", color: "#e0e0e0", fontSize: 12, fontFamily: "'IBM Plex Mono'", outline: "none", marginBottom: 12 }} />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                {apiKey && <button onClick={() => { setApiKey(""); saveKey(""); }} style={{ padding: "8px 14px", borderRadius: 6, border: "1px solid #ef444440", background: "transparent", color: "#ef4444", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>Remove</button>}
                <button onClick={() => setShowKeyModal(false)} style={{ padding: "8px 14px", borderRadius: 6, border: "none", background: "#f59e0b", color: "#060606", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>{apiKey ? "Done" : "Close"}</button>
              </div>
            </div>
          </div>
        )}

        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "#f59e0b", fontSize: 18, fontWeight: 700 }}>♫</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: "#f5f5f0", fontFamily: "'Instrument Serif', serif" }}>PromptTune</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 10, color: apiKey ? "#10b981" : freeLeft > 0 ? "#444" : "#ef4444" }}>{apiKey ? `🔑 ${provider === "openai" ? "OpenAI" : "Anthropic"}` : `${freeLeft}/${FREE_LIMIT} free`}</span>
              <button onClick={() => setShowKeyModal(true)} style={{ padding: "4px 10px", borderRadius: 5, border: "1px solid #1e1e1e", background: "transparent", color: "#999", fontSize: 9, fontWeight: 600, cursor: "pointer", fontFamily: "'IBM Plex Mono'" }}>⚙ Key</button>
            </div>
          </div>

          <label style={{ fontSize: 9, color: "#888", fontWeight: 700, letterSpacing: 1, display: "block", marginBottom: 5 }}>SYSTEM PROMPT</label>
          <textarea rows={4} value={sysPrompt} onChange={e => setSysPrompt(e.target.value)} style={I} placeholder="You are a helpful assistant that..." />
          <label style={{ fontSize: 9, color: "#888", fontWeight: 700, letterSpacing: 1, display: "block", margin: "14px 0 5px" }}>SAMPLE USER INPUT</label>
          <textarea rows={2} value={userInput} onChange={e => setUserInput(e.target.value)} style={I} placeholder="A typical user message..." />
          <label style={{ fontSize: 9, color: "#888", fontWeight: 700, letterSpacing: 1, display: "block", margin: "14px 0 5px" }}>SUCCESS CRITERIA</label>
          <textarea rows={2} value={criteria} onChange={e => setCriteria(e.target.value)} style={I} placeholder="What makes a good response? Be specific." />

          <label style={{ fontSize: 9, color: "#888", fontWeight: 700, letterSpacing: 1, display: "block", margin: "18px 0 8px" }}>OPTIMIZE FOR</label>
          <div style={{ display: "flex", gap: 6 }}>
            {[{ id: "accuracy", icon: "◎", sub: "Best output" }, { id: "cost", icon: "$", sub: "Fewer tokens" }, { id: "latency", icon: "⚡", sub: "Faster" }].map(o => (
              <button key={o.id} onClick={() => setGoal(o.id)} style={{
                flex: 1, padding: 10, borderRadius: 8, cursor: "pointer", textAlign: "center",
                border: goal === o.id ? "1.5px solid #f59e0b" : "1px solid #1e1e1e",
                background: goal === o.id ? "#f59e0b10" : "#0c0c0c", fontFamily: "'IBM Plex Mono'",
                transition: "all 0.2s",
              }}>
                <div style={{ fontSize: 16 }}>{o.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: goal === o.id ? "#f59e0b" : "#666", marginTop: 2, textTransform: "capitalize" }}>{o.id}</div>
                <div style={{ fontSize: 8, color: "#888", marginTop: 1 }}>{o.sub}</div>
              </button>
            ))}
          </div>

          <button onClick={run} disabled={(!ready || loading) && canRun} style={{
            width: "100%", marginTop: 18, padding: 14, borderRadius: 10, border: "none",
            background: !canRun ? "#ef4444" : ready && !loading ? "#f59e0b" : "#151515",
            color: !canRun ? "#fff" : ready && !loading ? "#060606" : "#444",
            fontSize: 13, fontWeight: 700, cursor: ready || !canRun ? "pointer" : "default",
            fontFamily: "'IBM Plex Mono'", transition: "all 0.2s",
          }}>{loading ? `⏳ ${step || "Optimizing..."}` : !canRun ? "🔑 Add API Key to Continue" : "▶ Evaluate & Optimize"}</button>

          {error && <div style={{ marginTop: 12, padding: 10, background: "#1a0000", border: "1px solid #400", borderRadius: 8, color: "#f66", fontSize: 11 }}>{error}</div>}

          {result && (
            <div style={{ marginTop: 24 }} className="stagger">
              {result.metrics && (() => {
                const m = result.metrics, aO = result.current_accuracy || 5, aN = result.expected_accuracy || 7, aD = aN - aO;
                const lD = m.opt.latency - m.orig.latency, lP = m.orig.latency ? Math.round((lD / m.orig.latency) * 100) : 0;
                const cD = m.opt.cost - m.orig.cost, cP = m.orig.cost ? Math.round((cD / m.orig.cost) * 100) : 0;
                return (
                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    {[
                      { l: "Accuracy", o: `${aO}/10`, n: `${aN}/10`, d: `${aD > 0 ? "+" : ""}${aD}`, g: aD > 0, b: aD < 0, dt: aD > 0 ? "Better match" : "Same" },
                      { l: "Cost", o: `$${m.orig.cost.toFixed(4)}`, n: `$${m.opt.cost.toFixed(4)}`, d: `${cP > 0 ? "+" : ""}${cP}%`, g: cD < 0, b: cD > 0, dt: `${m.orig.totalTokens}→${m.opt.totalTokens} tok` },
                      { l: "Latency", o: `${(m.orig.latency / 1000).toFixed(1)}s`, n: `${(m.opt.latency / 1000).toFixed(1)}s`, d: `${lP > 0 ? "+" : ""}${lP}%`, g: lD < 0, b: lD > 0, dt: `${m.orig.latency}→${m.opt.latency}ms` },
                    ].map((x, i) => (
                      <div key={i} style={{ flex: 1, background: "#0a0a0a", border: `1px solid ${x.g ? "#10b98128" : x.b ? "#ef444428" : "#151515"}`, borderRadius: 10, padding: 12, textAlign: "center" }}>
                        <div style={{ fontSize: 11, color: "#888", marginBottom: 6 }}>{x.l}</div>
                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 6, marginBottom: 4 }}>
                          <span style={{ fontSize: 12, color: "#888" }}>{x.o}</span><span style={{ color: "#666" }}>→</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: x.g ? "#10b981" : x.b ? "#ef4444" : "#aaa" }}>{x.n}</span>
                        </div>
                        <div style={{ display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: x.g ? "#10b98115" : x.b ? "#ef444415" : "#151515", color: x.g ? "#10b981" : x.b ? "#ef4444" : "#555" }}>{x.d}{x.g ? " ✓" : x.b ? " ✗" : ""}</div>
                        <div style={{ fontSize: 8, color: "#777", marginTop: 4 }}>{x.dt}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {result.metrics && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                  {[{ l: "Current Output", t: result.metrics.orig.response, c: "#444" }, { l: "Optimized Output", t: result.metrics.opt.response, c: "#10b981" }].map((s, i) => (
                    <div key={i} style={{ background: "#0a0a0a", border: "1px solid #151515", borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 8, fontWeight: 700, color: s.c, letterSpacing: 1, marginBottom: 6, textTransform: "uppercase" }}>{s.l}</div>
                      <div style={{ fontSize: 11, color: "#aaa", lineHeight: 1.6, maxHeight: 110, overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{s.t}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ background: "#0a0a0a", border: "1px solid #f59e0b20", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#f59e0b", letterSpacing: 1 }}>OPTIMIZED SYSTEM PROMPT</span>
                  <button onClick={() => navigator.clipboard?.writeText(result.improved_prompt)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #f59e0b30", background: "transparent", color: "#f59e0b", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Copy</button>
                </div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.7, whiteSpace: "pre-wrap", padding: 10, background: "#060606", borderRadius: 8 }}>{result.improved_prompt}</div>
              </div>

              <div style={{ background: "#0a0a0a", border: "1px solid #151515", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#3b82f6", letterSpacing: 1 }}>RECOMMENDED INPUT FORMAT</span>
                  <button onClick={() => navigator.clipboard?.writeText(result.input_format)} style={{ padding: "3px 8px", borderRadius: 4, border: "1px solid #3b82f630", background: "transparent", color: "#3b82f6", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>Copy</button>
                </div>
                <div style={{ fontSize: 11, color: "#888", lineHeight: 1.7, whiteSpace: "pre-wrap", padding: 10, background: "#060606", borderRadius: 8 }}>{result.input_format}</div>
              </div>

              <div style={{ background: "#0a0a0a", border: "1px solid #151515", borderRadius: 10, padding: 16 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#999", letterSpacing: 1 }}>WHAT CHANGED</span>
                <div style={{ marginTop: 8 }}>{result.changes?.map((c, i) => (
                  <div key={i} style={{ fontSize: 11, color: "#aaa", marginBottom: 4, display: "flex", gap: 6 }}><span style={{ color: "#f59e0b" }}>→</span>{c}</div>
                ))}</div>
                <div style={{ fontSize: 11, color: "#888", marginTop: 10, fontStyle: "italic" }}>{result.why}</div>
              </div>

              <button onClick={() => { setSysPrompt(result.improved_prompt); setResult(null); toolRef.current?.scrollIntoView({ behavior: "smooth" }); }}
                style={{ marginTop: 14, padding: "10px 16px", borderRadius: 8, border: "none", background: "#f59e0b", color: "#060606", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "'IBM Plex Mono'" }}>
                ↻ Use optimized prompt & run again
              </button>
            </div>
          )}
        </div>
      </section>

      <footer style={{ padding: "30px 24px", borderTop: "1px solid #0e0e0e", textAlign: "center" }}>
        <span style={{ fontSize: 10, color: "#666" }}>Built by Rohit · PromptTune v1 · Powered by Claude & OpenAI</span>
      </footer>
    </div>
  );
}
