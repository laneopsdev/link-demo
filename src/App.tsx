import { useState, useEffect, useRef, useCallback } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSoundFX } from "./hooks/useSoundFX";

const queryClient = new QueryClient();

const SUGGESTIONS = [
  {
    title: "Energy is climbing!",
    text: "Chat is reacting well. Consider a bundle or limited-time offer.",
  },
  {
    title: "Bundle question detected",
    text: "Someone is asking about deals. This is a good time to combine two items.",
  },
  {
    title: "Price reaction rising",
    text: "Viewers are responding to value. Hold attention with a quick countdown.",
  },
  {
    title: "Hot streak building",
    text: "You have momentum. Run something stronger before attention drops.",
  },
  {
    title: "Deal alert detected",
    text: "You mentioned a deal — push urgency now. Make them act in 30 seconds.",
  },
  {
    title: "Limited supply — go!",
    text: "You said 'limited.' Hammer the scarcity. How many are actually left?",
  },
  {
    title: "Chat is responding",
    text: "Chat energy is high. Ask a direct question to keep them engaged.",
  },
  {
    title: "Sold! Keep the streak",
    text: "You just moved product. Ride this momentum and pitch the next item.",
  },
];

const KEYWORD_MAP: Array<{ words: string[]; index: number }> = [
  { words: ["bundle", "combo", "package"], index: 1 },
  { words: ["price", "cost", "how much", "dollars", "bucks"], index: 2 },
  { words: ["deal", "discount", "off", "sale"], index: 4 },
  {
    words: ["limited", "running out", "almost gone", "last few", "only"],
    index: 5,
  },
  { words: ["chat", "comments", "everyone", "you guys", "squad"], index: 6 },
  { words: ["sold", "sold out", "gone", "grabbed", "just bought"], index: 7 },
];

function detectKeyword(text: string): number | null {
  const lower = text.toLowerCase();
  for (const { words, index } of KEYWORD_MAP) {
    if (words.some((w) => lower.includes(w))) return index;
  }
  return null;
}

const CATEGORY_LABELS: Record<number, string> = {
  1: "Bundle Language",
  2: "Price Talk",
  4: "Deal Energy",
  5: "Scarcity",
  6: "Chat Energy",
  7: "Sales Momentum",
};

const CATEGORY_TAKEAWAYS: Record<string, string> = {
  "Bundle Language":
    "Your audience lit up for bundles — lead with that offer next time.",
  "Price Talk":
    "Viewers reacted strongest to pricing. Anchor value early next session.",
  "Deal Energy":
    "Deal language drove your best moments. Open with an offer next time.",
  Scarcity:
    "Urgency worked well tonight. Create it earlier and watch sales spike.",
  "Chat Energy":
    "You had real crowd energy. Keep reading the chat — it drives conversions.",
  "Sales Momentum": "You closed strong. Build that streak faster next session.",
  None: "Solid session. Keep building rapport with your audience — consistency wins.",
};

interface SummaryData {
  duration: string;
  topCategory: string;
  totalTriggers: number;
  energyRating: string;
  energyEmoji: string;
  takeaway: string;
}

function buildSummaryData(
  secs: number,
  hits: Record<string, number>,
  score: number,
): SummaryData {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const duration =
    h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`;

  const totalTriggers = Object.values(hits).reduce((a, b) => a + b, 0);

  let topCategory = "None";
  let topCount = 0;
  for (const [cat, count] of Object.entries(hits)) {
    if (count > topCount) {
      topCategory = cat;
      topCount = count;
    }
  }

  const energyRating =
    score >= 90
      ? "Excellent"
      : score >= 83
        ? "High"
        : score >= 76
          ? "Good"
          : "Steady";
  const energyEmoji =
    score >= 90 ? "🔥" : score >= 83 ? "⚡" : score >= 76 ? "💪" : "🎯";
  const takeaway =
    CATEGORY_TAKEAWAYS[topCategory] ?? CATEGORY_TAKEAWAYS["None"];

  return {
    duration,
    topCategory,
    totalTriggers,
    energyRating,
    energyEmoji,
    takeaway,
  };
}

function LiveApp() {
  const [seconds, setSeconds] = useState(0);
  const [viewers, setViewers] = useState(142);
  const [score, setScore] = useState(82);
  const [aiIndex, setAiIndex] = useState(0);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const { status, transcripts, interimText, start, stop, isSupported } =
    useSpeechRecognition();
  const { playStart, playStop } = useSoundFX();
  const isListening = status === "listening";
  const isDenied = status === "denied";

  // Session summary state
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const keywordHitsRef = useRef<Record<string, number>>({});

  const triggerStop = useCallback(() => {
    playStop();
    stop();
    const data = buildSummaryData(seconds, keywordHitsRef.current, score);
    setSummary(data);
    setShowSummary(true);
  }, [playStop, stop, seconds, score]);

  const handleOrbTap = useCallback(() => {
    if (isListening) {
      triggerStop();
    } else {
      playStart();
      start();
    }
  }, [isListening, triggerStop, playStart, start]);

  const handleToggleTap = useCallback(() => {
    if (isListening) {
      triggerStop();
    } else {
      playStart();
      start();
    }
  }, [isListening, triggerStop, playStart, start]);

  // Auto-start mic (no sound on auto-start — only on user tap)
  useEffect(() => {
    if (isSupported) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll transcript
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcripts, interimText]);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Viewers drift
  useEffect(() => {
    const id = setInterval(() => {
      setViewers((v) => Math.max(80, v + Math.floor(Math.random() * 14) - 6));
    }, 3500);
    return () => clearInterval(id);
  }, []);

  // Momentum score drift
  useEffect(() => {
    const id = setInterval(() => {
      setScore((s) =>
        Math.max(72, Math.min(96, s + Math.floor(Math.random() * 5) - 2)),
      );
    }, 2500);
    return () => clearInterval(id);
  }, []);

  // AI suggestions rotate (fallback timer)
  useEffect(() => {
    const id = setInterval(() => {
      setAiIndex((i) => (i + 1) % 4); // only cycle first 4 generic ones when idle
    }, 5000);
    return () => clearInterval(id);
  }, []);

  // Keyword detection — override AI suggestion + track category hits
  const lastSeenTranscriptId = useRef(-1);
  useEffect(() => {
    if (transcripts.length === 0) return;
    const latest = transcripts[transcripts.length - 1];
    if (latest.id === lastSeenTranscriptId.current) return;
    lastSeenTranscriptId.current = latest.id;
    const matched = detectKeyword(latest.text);
    if (matched !== null) {
      setAiIndex(matched);
      const label = CATEGORY_LABELS[matched] ?? "Other";
      keywordHitsRef.current = {
        ...keywordHitsRef.current,
        [label]: (keywordHitsRef.current[label] ?? 0) + 1,
      };
    }
  }, [transcripts]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((s % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const ai = SUGGESTIONS[aiIndex];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700;900&display=swap');

        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        html, body {
          width: 100%;
          min-height: 100%;
          font-family: 'Space Grotesk', Arial, sans-serif;
          background: #03040a;
          color: white;
          overflow: hidden;
        }

        body {
          background:
            radial-gradient(circle at 50% 18%, rgba(180,50,255,.38), transparent 34%),
            radial-gradient(circle at 50% 80%, rgba(0,170,255,.14), transparent 35%),
            #03040a;
        }

        .ru-app {
          width: 100%;
          max-width: 430px;
          height: 100vh;
          margin: 0 auto;
          padding: 12px 12px 10px;
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        /* Top bar */
        .ru-topbar {
          height: 50px;
          border: 1px solid rgba(255,255,255,.08);
          background: rgba(255,255,255,.045);
          border-radius: 22px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 7px;
          box-shadow: 0 0 24px rgba(150,60,255,.18);
          flex-shrink: 0;
        }
        .ru-live-badge {
          background: #ff1f64;
          color: white;
          font-weight: 900;
          padding: 11px 15px;
          border-radius: 17px;
          font-size: 15px;
          box-shadow: 0 0 20px rgba(255,31,100,.45);
          user-select: none;
        }
        .ru-pill {
          background: rgba(0,0,0,.28);
          padding: 10px 13px;
          border-radius: 16px;
          font-weight: 900;
          color: #e6dbff;
          font-size: 14px;
        }

        /* Mic zone */
        .ru-mic-zone {
          flex: .6;
          min-height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }
        .ru-mic-orb {
          width: 220px;
          height: 220px;
          border-radius: 50%;
          position: relative;
          background:
            radial-gradient(circle, rgba(255,255,255,.05), rgba(0,0,0,.88) 60%),
            #05020d;
          border: 8px solid transparent;
          background-clip: padding-box;
          box-shadow:
            0 0 0 8px rgba(180,80,255,.08),
            0 0 42px rgba(255,55,220,.45),
            0 0 70px rgba(60,160,255,.28),
            inset 0 0 35px rgba(255,255,255,.035);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          cursor: pointer;
        }
        .ru-mic-orb::before {
          content: "";
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          padding: 8px;
          background: conic-gradient(#ff3bd4, #7c5cff, #38bdf8, #ff3bd4);
          -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: ru-spin 4s linear infinite;
        }
        .ru-mic-orb.paused::before {
          animation-play-state: paused;
          opacity: 0.35;
        }
        .ru-mic-icon {
          font-size: 58px;
          filter: drop-shadow(0 0 18px rgba(255,255,255,.25));
          z-index: 2;
        }
        .ru-mic-title {
          z-index: 2;
          margin-top: 10px;
          font-weight: 900;
          font-size: 18px;
          text-align: center;
          padding: 0 12px;
        }
        .ru-mic-sub {
          z-index: 2;
          margin-top: 4px;
          color: #b9afd4;
          font-size: 13px;
        }

        /* Wave bars */
        .ru-wave {
          position: absolute;
          width: 50px;
          height: 90px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .ru-wave.left { left: 4px; }
        .ru-wave.right { right: 4px; }
        .ru-wave span {
          width: 5px;
          border-radius: 20px;
          background: linear-gradient(to top, #ff3bd4, #38bdf8);
          animation: ru-bars 1s infinite ease-in-out;
        }
        .ru-wave.paused span { animation-play-state: paused; opacity: 0.25; }
        .ru-wave span:nth-child(1) { height: 30px; animation-delay: .1s; }
        .ru-wave span:nth-child(2) { height: 52px; animation-delay: .2s; }
        .ru-wave span:nth-child(3) { height: 72px; animation-delay: .3s; }
        .ru-wave span:nth-child(4) { height: 46px; animation-delay: .4s; }

        /* AI card */
        .ru-ai-card {
          background: linear-gradient(135deg, rgba(130,25,220,.42), rgba(10,10,25,.86));
          border: 1px solid rgba(255,255,255,.1);
          border-radius: 25px;
          padding: 14px;
          display: grid;
          grid-template-columns: 56px 1fr;
          gap: 12px;
          align-items: center;
          box-shadow: 0 0 28px rgba(160,50,255,.22);
          flex-shrink: 0;
        }
        .ru-bot {
          width: 54px;
          height: 54px;
          border-radius: 50%;
          background: linear-gradient(135deg, #8b5cf6, #ff3bd4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 25px;
          box-shadow: 0 0 22px rgba(255,61,212,.5);
        }
        .ru-ai-label {
          color: #d38cff;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .08em;
          margin-bottom: 5px;
        }
        .ru-ai-title {
          font-size: 22px;
          font-weight: 900;
          line-height: 1.05;
          margin-bottom: 5px;
          transition: opacity 0.3s;
        }
        .ru-ai-text {
          color: #d7d0ee;
          line-height: 1.3;
          font-size: 14px;
          transition: opacity 0.3s;
        }

        /* Stat grid */
        .ru-stat-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          flex-shrink: 0;
        }
        .ru-stat {
          min-height: 78px;
          border-radius: 20px;
          padding: 10px;
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.08);
          box-shadow: inset 0 0 18px rgba(255,255,255,.025);
        }
        .ru-stat-label {
          font-size: 10px;
          font-weight: 900;
          color: #55f59a;
          margin-bottom: 7px;
        }
        .ru-stat-label.red { color: #ff416d; }
        .ru-stat-main {
          font-size: 28px;
          font-weight: 900;
        }
        .ru-stat-main small { font-size: 13px; color: #aaa0bc; }
        .ru-stat-sub {
          font-weight: 800;
          margin-top: 4px;
          font-size: 12px;
        }
        .ru-green { color: #55f59a; }
        .ru-barline {
          margin-top: 8px;
          height: 6px;
          background: rgba(255,255,255,.1);
          border-radius: 20px;
          overflow: hidden;
        }
        .ru-barfill {
          height: 100%;
          background: #55f59a;
          border-radius: 20px;
          box-shadow: 0 0 14px rgba(85,245,154,.6);
          transition: width 0.6s ease;
        }

        /* Live transcript panel */
        .ru-transcript-panel {
          border-radius: 23px;
          background: rgba(255,255,255,.045);
          border: 1px solid rgba(255,255,255,.08);
          padding: 12px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          height: 130px;
        }
        .ru-scan-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 9px;
          flex-shrink: 0;
        }
        .ru-scan-title {
          font-weight: 900;
          font-size: 16px;
        }
        .ru-mic-toggle {
          background: none;
          border: 1px solid rgba(255,255,255,.18);
          border-radius: 12px;
          color: #b9afd4;
          font-size: 12px;
          font-weight: 800;
          padding: 4px 10px;
          cursor: pointer;
          font-family: inherit;
        }
        .ru-mic-toggle.active {
          border-color: #ff3bd4;
          color: #ff3bd4;
        }
        .ru-transcript-feed {
          flex: 1;
          overflow-y: auto;
          scrollbar-width: none;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ru-transcript-feed::-webkit-scrollbar { display: none; }
        .ru-transcript-line {
          font-size: 13px;
          color: rgba(255,255,255,.75);
          line-height: 1.4;
          padding-left: 10px;
          border-left: 2px solid rgba(255,61,212,.3);
          animation: ru-slidein 0.25s ease;
        }
        .ru-transcript-interim {
          font-size: 13px;
          color: rgba(185,175,212,.6);
          font-style: italic;
          padding-left: 10px;
          border-left: 2px solid rgba(255,255,255,.1);
        }
        .ru-transcript-empty {
          font-size: 13px;
          color: #b9afd4;
          font-style: italic;
          padding: 4px 2px;
        }
        .ru-error-msg {
          font-size: 13px;
          color: #ffc940;
          padding: 4px 2px;
          line-height: 1.4;
        }

        /* Nav */
        .ru-nav {
          height: 68px;
          border-radius: 25px;
          background: rgba(0,0,0,.65);
          border: 1px solid rgba(255,255,255,.08);
          display: flex;
          align-items: center;
          justify-content: space-around;
          box-shadow: 0 0 28px rgba(0,0,0,.45);
          flex-shrink: 0;
        }
        .ru-nav-item {
          color: #aaa1c6;
          font-size: 11px;
          font-weight: 800;
          text-align: center;
          cursor: pointer;
        }
        .ru-nav-item .ru-nav-icon {
          display: block;
          font-size: 21px;
          margin-bottom: 3px;
        }
        .ru-nav-item.active { color: #ff3bd4; }
        .ru-plus {
          width: 58px;
          height: 58px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed, #ff3bd4);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 38px;
          box-shadow: 0 0 28px rgba(255,61,212,.7);
          transform: translateY(-10px);
          cursor: pointer;
          user-select: none;
        }

        /* Keyframes */
        @keyframes ru-spin { to { transform: rotate(360deg); } }
        @keyframes ru-bars {
          0%, 100% { transform: scaleY(.55); opacity: .45; }
          50%       { transform: scaleY(1.08); opacity: 1; }
        }
        @keyframes ru-slidein {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-height: 720px) {
          .ru-app { gap: 7px; padding: 9px 10px 8px; }
          .ru-topbar { height: 46px; }
          .ru-mic-zone { min-height: 190px; }
          .ru-mic-orb { width: 200px; height: 200px; }
          .ru-mic-icon { font-size: 52px; }
          .ru-ai-card { padding: 12px; }
          .ru-ai-title { font-size: 20px; }
          .ru-ai-text { font-size: 13px; }
          .ru-stat { min-height: 72px; padding: 9px; }
          .ru-stat-main { font-size: 25px; }
          .ru-scanner { padding: 10px; }
          .ru-nav { height: 64px; }
        }

        /* Session summary overlay */
        .ru-overlay {
          position: fixed;
          inset: 0;
          background: rgba(3, 4, 10, 0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 100;
          animation: ru-fadein 0.3s ease forwards;
        }
        .ru-summary-card {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 430px;
          z-index: 101;
          padding: 0 12px 28px;
          animation: ru-slideup 0.42s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .ru-summary-inner {
          background: linear-gradient(160deg, rgba(110,20,200,.55), rgba(8,8,22,.95));
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 28px;
          padding: 24px 22px 20px;
          box-shadow:
            0 0 60px rgba(160,50,255,.25),
            0 0 0 1px rgba(255,255,255,.05) inset;
        }
        .ru-summary-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,61,212,.15);
          border: 1px solid rgba(255,61,212,.3);
          border-radius: 20px;
          padding: 5px 12px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: .1em;
          color: #ff3bd4;
          margin-bottom: 16px;
        }
        .ru-summary-duration {
          font-size: 42px;
          font-weight: 900;
          line-height: 1;
          letter-spacing: -.02em;
          background: linear-gradient(90deg, #fff 60%, #d38cff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: 18px;
        }
        .ru-summary-stats {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 8px;
          margin-bottom: 18px;
        }
        .ru-summary-stat {
          background: rgba(255,255,255,.05);
          border: 1px solid rgba(255,255,255,.07);
          border-radius: 16px;
          padding: 10px 8px;
          text-align: center;
        }
        .ru-summary-stat-val {
          font-size: 18px;
          font-weight: 900;
          color: #fff;
          line-height: 1.1;
        }
        .ru-summary-stat-label {
          font-size: 9px;
          font-weight: 700;
          color: #9b8ec4;
          letter-spacing: .07em;
          text-transform: uppercase;
          margin-top: 4px;
        }
        .ru-summary-takeaway {
          background: rgba(255,255,255,.04);
          border-left: 3px solid #ff3bd4;
          border-radius: 0 14px 14px 0;
          padding: 12px 14px;
          font-size: 14px;
          font-weight: 600;
          color: #e8deff;
          line-height: 1.45;
          margin-bottom: 20px;
        }
        .ru-summary-close {
          width: 100%;
          height: 52px;
          border-radius: 18px;
          border: none;
          background: linear-gradient(135deg, #7c3aed, #ff3bd4);
          color: white;
          font-family: inherit;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: .04em;
          cursor: pointer;
          box-shadow: 0 0 28px rgba(255,61,212,.4);
          transition: opacity .15s;
        }
        .ru-summary-close:active { opacity: .8; }
        @keyframes ru-fadein {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ru-slideup {
          from { transform: translateX(-50%) translateY(100%); }
          to   { transform: translateX(-50%) translateY(0); }
        }
      `}</style>

      <div className="ru-app">
        {/* Top bar */}
        <div className="ru-topbar">
          <div className="ru-live-badge">● LIVE</div>
          <div className="ru-pill" data-testid="text-timer">
            {formatTime(seconds)}
          </div>
          <div className="ru-pill" data-testid="text-viewers">
            👁 {viewers}
          </div>
        </div>

        {/* Mic orb zone */}
        <div className="ru-mic-zone">
          <div className={`ru-wave left${isListening ? "" : " paused"}`}>
            <span />
            <span />
            <span />
            <span />
          </div>

          <div
            className={`ru-mic-orb${isListening ? "" : " paused"}`}
            data-testid="button-mic-orb"
            onClick={handleOrbTap}
          >
            <div className="ru-mic-icon">🎙️</div>
            <div className="ru-mic-title">
              {isDenied
                ? "Mic access denied"
                : !isSupported
                  ? "Not supported"
                  : isListening
                    ? "RunUp is listening..."
                    : "Tap to start"}
            </div>
            <div className="ru-mic-sub">
              {isDenied
                ? "Allow mic in settings"
                : !isSupported
                  ? "Use Chrome or Edge"
                  : isListening
                    ? "Tap to pause"
                    : "Mic is paused"}
            </div>
          </div>

          <div className={`ru-wave right${isListening ? "" : " paused"}`}>
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        {/* AI suggestion card */}
        <div className="ru-ai-card">
          <div className="ru-bot">👾</div>
          <div>
            <div className="ru-ai-label">✦ AI SUGGESTION</div>
            <div className="ru-ai-title" data-testid="text-ai-title">
              {ai.title}
            </div>
            <div className="ru-ai-text" data-testid="text-ai-text">
              {ai.text}
            </div>
          </div>
        </div>

        {/* Live Transcript — under AI card */}
        <div className="ru-transcript-panel">
          <div className="ru-scan-head">
            <div className="ru-scan-title">LIVE TRANSCRIPT</div>
            {isSupported && !isDenied && (
              <button
                data-testid="button-mic-toggle"
                className={`ru-mic-toggle${isListening ? " active" : ""}`}
                onClick={handleToggleTap}
              >
                {isListening ? "⏸ Pause" : "▶ Start"}
              </button>
            )}
          </div>
          <div className="ru-transcript-feed" ref={transcriptRef}>
            {!isSupported && (
              <div className="ru-error-msg">
                Live transcription isn't supported here. Try Chrome or Edge.
              </div>
            )}
            {isDenied && (
              <div className="ru-error-msg">
                Mic denied — allow access in browser settings, then tap the orb.
              </div>
            )}
            {isSupported &&
              !isDenied &&
              transcripts.length === 0 &&
              !interimText && (
                <div className="ru-transcript-empty">
                  {isListening
                    ? "Listening… start talking."
                    : "Tap the orb to start."}
                </div>
              )}
            {transcripts.map((t) => (
              <div
                key={t.id}
                className="ru-transcript-line"
                data-testid={`text-transcript-${t.id}`}
              >
                {t.text}
              </div>
            ))}
            {interimText && (
              <div className="ru-transcript-interim">{interimText}</div>
            )}
          </div>
        </div>

        {/* Stat grid */}
        <div className="ru-stat-grid">
          <div className="ru-stat">
            <div className="ru-stat-label">MOMENTUM</div>
            <div className="ru-stat-main" data-testid="text-score">
              {score}
              <small>/100</small>
            </div>
            <div className="ru-barline">
              <div className="ru-barfill" style={{ width: `${score}%` }} />
            </div>
          </div>
          <div className="ru-stat">
            <div className="ru-stat-label">ENERGY</div>
            <div className="ru-stat-main ru-green">High</div>
            <div className="ru-stat-sub ru-green">Rising ↗</div>
          </div>
          <div className="ru-stat">
            <div className="ru-stat-label red">HOT STREAK</div>
            <div className="ru-stat-main">🔥 3</div>
            <div className="ru-stat-sub" style={{ color: "#aaa0bc" }}>
              items
            </div>
          </div>
        </div>

        {/* Bottom nav */}
        <div className="ru-nav">
          <div className="ru-nav-item active" data-testid="nav-home">
            <span className="ru-nav-icon">⌂</span>Home
          </div>
          <div className="ru-nav-item" data-testid="nav-scanner">
            <span className="ru-nav-icon">📷</span>Scanner
          </div>
          <div className="ru-plus" data-testid="nav-plus">
            +
          </div>
          <div className="ru-nav-item" data-testid="nav-history">
            <span className="ru-nav-icon">◷</span>History
          </div>
          <div className="ru-nav-item" data-testid="nav-insights">
            <span className="ru-nav-icon">▮▮▮</span>Insights
          </div>
        </div>
      </div>

      {/* Session summary overlay + slide-up card */}
      {showSummary && summary && (
        <>
          <div className="ru-overlay" onClick={() => setShowSummary(false)} />
          <div className="ru-summary-card" data-testid="summary-card">
            <div className="ru-summary-inner">
              <div className="ru-summary-badge">✦ SESSION RECAP</div>

              <div className="ru-summary-duration">{summary.duration}</div>

              <div className="ru-summary-stats">
                <div className="ru-summary-stat">
                  <div className="ru-summary-stat-val">
                    {summary.energyEmoji} {summary.energyRating}
                  </div>
                  <div className="ru-summary-stat-label">Energy</div>
                </div>
                <div className="ru-summary-stat">
                  <div className="ru-summary-stat-val">
                    {summary.totalTriggers}
                  </div>
                  <div className="ru-summary-stat-label">Triggers</div>
                </div>
                <div className="ru-summary-stat">
                  <div
                    className="ru-summary-stat-val"
                    style={{ fontSize: "13px" }}
                  >
                    {summary.topCategory === "None" ? "—" : summary.topCategory}
                  </div>
                  <div className="ru-summary-stat-label">Top Signal</div>
                </div>
              </div>

              <div className="ru-summary-takeaway" data-testid="text-takeaway">
                {summary.takeaway}
              </div>

              <button
                className="ru-summary-close"
                data-testid="button-summary-close"
                onClick={() => {
                  setShowSummary(false);
                  keywordHitsRef.current = {};
                }}
              >
                Start New Session
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LiveApp />
    </QueryClientProvider>
  );
}
