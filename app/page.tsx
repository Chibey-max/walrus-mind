"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Session {
  sessionId: string;
  blobId: string;
  ts: number;
  n: number;
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [blobId, setBlobId] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const sessionId = useRef(`sess-${Date.now()}`);
  const chatRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const storedSessions = JSON.parse(localStorage.getItem("wm_sessions") || "[]") as unknown;
      setSessions(Array.isArray(storedSessions) ? (storedSessions as Session[]) : []);
    } catch {}
  }, []);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, loading]);

  const saveSession = useCallback((bid: string, count: number) => {
    setSessions((prev) => {
      const idx = prev.findIndex((s) => s.sessionId === sessionId.current);
      const entry: Session = { sessionId: sessionId.current, blobId: bid, ts: Date.now(), n: count };
      const next = idx > -1 ? prev.map((s, i) => (i === idx ? entry : s)) : [...prev, entry];
      try { localStorage.setItem("wm_sessions", JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearSessions = () => {
    setSessions([]);
    try { localStorage.removeItem("wm_sessions"); } catch {}
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, sessionId: sessionId.current, blobId }),
      });
      const data = await res.json();
      if (data.reply) {
        const updated: Message[] = [...next, { role: "assistant", content: data.reply }];
        setMessages(updated);
        if (data.blobId) { setBlobId(data.blobId); saveSession(data.blobId, updated.length); }
        if (data.checkpoint) {
          const checkpointNumber = Number(data.checkpoint);
          setCheckpoint(Number.isFinite(checkpointNumber) ? checkpointNumber.toLocaleString() : String(data.checkpoint));
        } else {
          setCheckpoint("unavailable");
        }
      } else {
        setMessages([...next, { role: "assistant", content: data.error || "ERR: check api keys" }]);
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "ERR: network failure" }]);
    }
    setLoading(false);
  };

  const trunc = (s: string, n: number) => s.length > n ? s.substring(0, n) + "…" : s;

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="app">
      {/* TOP BAR */}
      <div className="topbar">
        <div>
          <div className="logo">
            WALRUS<span className="logo-dot" /><span className="logo-em">MIND</span>
          </div>
          <div className="logo-sub">DECENTRALIZED AI MEMORY &gt; SUI × WALRUS</div>
        </div>
        <div className="badge">TATUM × WALRUS HACKATHON</div>
      </div>

      {/* STATUS ROW */}
      <div className="statusrow">
        <div className="sstat">
          <div className="slabel">Walrus Blob</div>
          <div className={`sval ${blobId ? "green" : "dim"}`}>
            <div className={`sdot ${blobId ? "g" : "off"}`} />
            <span>{blobId ? trunc(blobId, 20) : "no blob stored"}</span>
          </div>
        </div>
        <div className="sstat">
          <div className="slabel">Sui Checkpoint</div>
          <div className={`sval ${checkpoint ? "blue" : "dim"}`}>
            <div className={`sdot ${checkpoint ? "b" : "off"}`} />
            <span>{checkpoint ? `#${checkpoint}` : "waiting for rpc"}</span>
          </div>
        </div>
        <div className="sstat">
          <div className="slabel">MCP Server</div>
          <div className="sval pink">
            <div className="sdot p" />
            <span>walrus-mind:3001</span>
          </div>
        </div>
        <div className="sstat">
          <div className="slabel">Network</div>
          <div className="sval green">
            <div className="sdot g" />
            <span>sui mainnet</span>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="body">
        {/* CHAT */}
        <div className="chat" ref={chatRef}>
          {messages.length === 0 && !loading && (
            <div className="empty">
              <div className="empty-icon">
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  <circle cx="11" cy="11" r="3.5" stroke="#1aff66" strokeWidth="1.2" />
                  <path d="M11 3v2M11 17v2M3 11h2M17 11h2" stroke="#1aff66" strokeWidth="1.2" strokeLinecap="round" />
                  <circle cx="11" cy="11" r="8" stroke="#1aff66" strokeWidth="0.5" strokeDasharray="2 3" opacity="0.5" />
                </svg>
              </div>
              <div className="empty-txt">
                &gt; SYSTEM READY<br />
                &gt; EVERY REPLY STORED AS WALRUS BLOB<br />
                &gt; ANCHORED TO SUI VIA TATUM RPC<br />
                &gt; AWAITING INPUT_
              </div>
            </div>
          )}

          {messages.map((m, i) => {
            const isUser = m.role === "user";
            const isLastAssistant = !isUser && i === messages.length - 1;
            return (
              <div key={i} className={`mrow${isUser ? " u" : ""}`}>
                <div className={`av${isUser ? " u" : ""}`}>{isUser ? "ME" : "WM"}</div>
                <div className="mbody">
                  <div className={`bub${isUser ? " u" : ""}`}>{m.content}</div>
                  {isLastAssistant && blobId && (
                    <div className="bfoot">
                      <span className="chip">{trunc(blobId, 18)}</span>
                      <span>stored on walrus</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {loading && (
            <div className="typing-row">
              <div className="av">WM</div>
              <div className="tbub">
                <div className="td" /><div className="td" /><div className="td" />
              </div>
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="shd">
            <span>{"// SESSIONS"}</span>
            <button className="pbtn" onClick={clearSessions}>PURGE</button>
          </div>
          <div className="slist">
            {sessions.length === 0 ? (
              <div className="nosess">&gt; NO SESSIONS<br />STORED YET</div>
            ) : (
              [...sessions].reverse().map((s, i) => (
                <div
                  key={i}
                  className={`sitem${s.blobId === blobId ? " active" : ""}`}
                  onClick={() => setBlobId(s.blobId)}
                >
                  <div className="sblob">{trunc(s.blobId, 22)}</div>
                  <div className="smeta">{formatTime(s.ts)} · {s.n} msgs</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* INPUT */}
      <div className="inputbar">
        <div className="iwrap">
          <textarea
            ref={taRef}
            className="inp"
            rows={1}
            placeholder="> ENTER COMMAND..."
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 104) + "px";
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
          />
        </div>
        <button className="sbtn" onClick={handleSend} disabled={loading || !input.trim()}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
            <path d="M2 7.5h11M8.5 3l4.5 4.5L8.5 12" stroke="#07090f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div className="fl">WALRUS TESTNET · 5 EPOCH STORAGE · TATUM RPC VERIFIED</div>
        <div className="fr">SUBMIT BY JUN 6 · 17:00 UTC</div>
      </div>
    </div>
  );
}
