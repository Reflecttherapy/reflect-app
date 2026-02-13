import React, { useEffect, useState } from "react";
import "./App.css";

const breathingPlan = [
  { label: "Inhale", seconds: 4 },
  { label: "Hold", seconds: 4 },
  { label: "Exhale", seconds: 6 },
];

function FaceIcon({ mood = "steady" }) {
  const mouth = {
    really: -0.9,
    struggling: -0.5,
    steady: 0,
    coping: 0.45,
    okay: 0.8,
  }[mood] ?? 0;

  const mouthY = 26;
  const mouthWidth = 16;
  const controlY = mouthY + mouth * 8;
  const d = `M ${24 - mouthWidth / 2} ${mouthY} Q 24 ${controlY} ${
    24 + mouthWidth / 2
  } ${mouthY}`;

  return (
    <svg width="26" height="26" viewBox="0 0 48 48" aria-hidden="true">
      <circle
        cx="24"
        cy="24"
        r="18"
        fill="none"
        stroke="rgba(60, 80, 75, 0.55)"
        strokeWidth="2.2"
      />
      <circle cx="18" cy="20" r="1.6" fill="rgba(60, 80, 75, 0.70)" />
      <circle cx="30" cy="20" r="1.6" fill="rgba(60, 80, 75, 0.70)" />
      <path
        d={d}
        fill="none"
        stroke="rgba(60, 80, 75, 0.70)"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
  
}

export default function App() {
  const [page, setPage] = useState("home");

  const [selectedTopic, setSelectedTopic] = useState(null);

  // Delete modal state (journal)
  const [deleteId, setDeleteId] = useState(null);

  // Latest mood
  const [moodValue, setMoodValue] = useState(() => {
    const saved = localStorage.getItem("reflect_mood_latest");
    return saved ? JSON.parse(saved) : null;
  });

  // Mood history (last 7)
  const [moodHistory, setMoodHistory] = useState(() => {
    return JSON.parse(localStorage.getItem("reflect_mood_history")) || [];
    
  });

  const saveMood = (level) => {
    const entry = { level, timestamp: new Date().toISOString() };
    const existing =
      JSON.parse(localStorage.getItem("reflect_mood_history")) || [];
    const updated = [entry, ...existing].slice(0, 7);

    localStorage.setItem("reflect_mood_history", JSON.stringify(updated));
    localStorage.setItem("reflect_mood_latest", JSON.stringify(entry));

    setMoodValue(entry);
    setMoodHistory(updated);
  };

  // Journal
  const journalPrompts = [
    "What feels heavy today?",
    "What is one small thing you managed today?",
    "What do you need more of right now?",
    "If your mind could speak kindly, what would it say?",
    "What has been taking up space in your head?",
  ];

  const [journalPrompt, setJournalPrompt] = useState(journalPrompts[0]);

  const [journalText, setJournalText] = useState(() => {
    return localStorage.getItem("reflect_journal_draft") || "";
  });

  const [journalEntries, setJournalEntries] = useState(() => {
    return JSON.parse(localStorage.getItem("reflect_journal_entries")) || [];
  });

  const latestJournal = journalEntries && journalEntries.length > 0 ? journalEntries[0] : null;

  // Autosave draft
  useEffect(() => {
    localStorage.setItem("reflect_journal_draft", journalText);
  }, [journalText]);

  const saveJournalEntry = () => {
    const text = journalText.trim();
    if (!text) return;

    const entry = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : String(Date.now()),
      prompt: journalPrompt,
      text,
      timestamp: new Date().toISOString(),
    };

    const updated = [entry, ...journalEntries].slice(0, 50);
    setJournalEntries(updated);
    localStorage.setItem("reflect_journal_entries", JSON.stringify(updated));

    setJournalText("");
    localStorage.removeItem("reflect_journal_draft");
  };

  const deleteJournalEntry = (id) => {
    const updated = journalEntries.filter((e) => e.id !== id);
    setJournalEntries(updated);
    localStorage.setItem("reflect_journal_entries", JSON.stringify(updated));
  };

  // Breathing tool state
  const [breathingRunning, setBreathingRunning] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState("idle"); // idle | inhale | hold | exhale | done
  const [breathingCount, setBreathingCount] = useState(0);
  const [breathingTotalSeconds, setBreathingTotalSeconds] = useState(0);

  const startBreathing = () => {
    setBreathingTotalSeconds(0);
    setBreathingPhase("inhale");
    setBreathingCount(4);
    setBreathingRunning(true);
  };

  const pauseBreathing = () => setBreathingRunning(false);

  const resetBreathing = () => {
    setBreathingRunning(false);
    setBreathingPhase("idle");
    setBreathingCount(0);
    setBreathingTotalSeconds(0);
  };

  // Breathing timer (inline step logic, no getBreathingStep)
  useEffect(() => {
    if (!breathingRunning) return;

    const tick = setInterval(() => {
      setBreathingTotalSeconds((prev) => {
        const next = prev + 1;

        if (next >= 60) {
          setBreathingRunning(false);
          setBreathingPhase("done");
          setBreathingCount(0);
          return 60;
        }

        const cycleSeconds = breathingPlan.reduce((sum, s) => sum + s.seconds, 0); // 14
        const withinCycle = next % cycleSeconds;

        let acc = 0;
        let current = { label: "Inhale", seconds: 4, remaining: 4 };

        for (let i = 0; i < breathingPlan.length; i++) {
          const step = breathingPlan[i];
          const start = acc;
          const end = acc + step.seconds;

          if (withinCycle >= start && withinCycle < end) {
            const elapsed = withinCycle - start;
            const remaining = step.seconds - elapsed;
            current = { ...step, remaining };
            break;
          }

          acc = end;
        }

        const phase =
          current.label === "Inhale"
            ? "inhale"
            : current.label === "Hold"
            ? "hold"
            : "exhale";

        setBreathingPhase(phase);
        setBreathingCount(current.remaining);

        return next;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [breathingRunning]);

  const moodKeyFromLevel = (level) => {
    if (level === "Really struggling") return "really";
    if (level === "Struggling") return "struggling";
    if (level === "Steady") return "steady";
    if (level === "Coping") return "coping";
    if (level === "Doing okay") return "okay";
    return "steady";
  };
  // -------------------------
  // Tools topics (content map)
  // -------------------------
  const TOOLS_TOPICS = {
    anxiety: {
      title: "Anxiety",
      intro: "A few gentle ideas you can try right now.",
      showBreathing: true,
      showGrounding: true,
      extraTools: [
        {
          heading: "Worry container (1 minute)",
          body: [
            "Write the worry in one sentence.",
            "Ask: can I act on this today? If yes, write one next step.",
            "If not, park it for later and return to what you are doing.",
          ],
        },
      ],
      prompts: [
        "What feels most loud in your mind right now?",
        "What would feel 5% easier in the next hour?",
      ],
    },

    stress: {
      title: "Stress",
      intro: "A small reset for your body and mind.",
      showBreathing: true,
      showGrounding: false,
      extraTools: [
        {
          heading: "30-second body reset",
          body: [
            "Drop your shoulders and unclench your jaw.",
            "Press your feet into the floor for 5 seconds.",
            "Slowly look left to right and notice three neutral objects.",
          ],
        },
        {
          heading: "Three priorities (today)",
          body: [
            "Pick one must-do.",
            "Pick one helpful thing.",
            "Pick one rest thing (even small).",
          ],
        },
      ],
      prompts: [
        "What is one pressure I can lower slightly today?",
        "What would I tell a friend in the same situation?",
      ],
    },

    depression: {
      title: "Depression",
      intro: "Small steps count. Choose what feels possible.",
      showBreathing: false,
      showGrounding: false,
      extraTools: [
        {
          heading: "Tiny activation (pick one)",
          body: [
            "Drink a glass of water.",
            "Open the curtains or step outside for 30 seconds.",
            "Wash your face or brush your teeth.",
            "Text one person: “Thinking of you.”",
          ],
        },
        {
          heading: "Kind sentence",
          body: [
            "Try: “This is hard, and I am doing my best today.”",
            "Or write your own sentence that feels believable.",
          ],
        },
      ],
      prompts: [
        "What is the smallest thing I can do in the next 10 minutes?",
        "What would ‘good enough’ look like today?",
      ],
    },

    bereavement: {
      title: "Bereavement",
      intro: "Grief is not a problem to solve. Go gently.",
      showBreathing: false,
      showGrounding: true,
      extraTools: [
        {
          heading: "A grounding anchor",
          body: [
            "Name one thing that is steady right now (a chair, the floor, your breath).",
            "Place a hand on your chest or stomach if that feels okay.",
            "Say: “This is grief. I can take the next minute.”",
          ],
        },
        {
          heading: "Memory (only if it feels okay)",
          body: [
            "Write one small memory (a moment, a phrase, a detail).",
            "Notice what comes up. There is no ‘right’ feeling.",
          ],
        },
      ],
      prompts: [
        "What do I need most in this moment: comfort, space, or connection?",
        "If I could speak to them for one minute, what would I say?",
      ],
    },
  };

  const renderExtraTools = (topicKey) => {
    const t = TOOLS_TOPICS[topicKey];
    if (!t?.extraTools?.length) return null;

    return t.extraTools.map((tool) => (
      <div className="card" key={tool.heading}>
        <h3 style={{ marginBottom: "10px" }}>{tool.heading}</h3>
        <ul className="tool-bullets">
          {tool.body.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
    ));
  };

  const renderPrompts = (topicKey) => {
    const t = TOOLS_TOPICS[topicKey];
    if (!t?.prompts?.length) return null;

    return (
      <div className="card">
        <h3 style={{ marginBottom: "10px" }}>Try a prompt</h3>
        <p className="small-note" style={{ marginBottom: "12px" }}>
          You can answer these in Journal if you want to save them.
        </p>
        <div className="grounding-list">
          {t.prompts.map((p) => (
            <div key={p}>{p}</div>
          ))}
        </div>
      </div>
    );
  };

  const renderPage = () => {
    switch (page) {
      case "home":
        return (
          <div>
            <div
              style={{
                background: "#EEF4F2",
                border: "1px solid rgba(63, 111, 100, 0.25)",
                padding: "14px 16px",
                borderRadius: "18px",
                marginBottom: "20px",
                fontSize: "13px",
                lineHeight: "1.4",
              }}
            >
              <strong>Important:</strong> Reflect is a support space while you
              wait. It is not therapy or crisis support. If you feel unsafe or
              need urgent help, go to the Support tab.
            </div>
<h1 style={{ marginBottom: "10px" }}>Reflect TEST</h1>


            <p style={{ marginBottom: "20px", lineHeight: "1.5" }}>
              Welcome to Reflect, I’m really glad you’re here. This space is here to support you
              while you’re waiting for therapy.
            </p>

            <div
              className="card"
              onClick={() => setPage("mood")}
              role="button"
              tabIndex={0}
            >
              <h3>Quick check-in</h3>
              <p>
                {moodValue?.level
  ? `Last check-in: ${moodValue.level} • ${new Date(
      moodValue.timestamp
    ).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })}`
  : "How are things feeling today?"}

              </p>
              {moodValue?.level && (
                <p className="small-note" style={{ marginTop: "6px" }}>
                  Stored only on this device
                </p>
              )}
            </div>

            <div
              className="card"
              onClick={() => setPage("journal")}
              role="button"
              tabIndex={0}
            >
              <h3>Journal</h3>
              <p>
  {journalEntries.length
    ? `Last entry: ${journalEntries[0].text.slice(0, 42)}${journalEntries[0].text.length > 42 ? "…" : ""}`
    : "Write freely, or use a prompt if it helps."}
</p>
<p className="small-note" style={{ marginTop: "6px" }}>
  Stored only on this device
</p>

            </div>
<div
  className="card"
  onClick={() => setPage("journal")}
  role="button"
  tabIndex={0}
>
  <h3>Last journal entry</h3>

  {latestJournal ? (
    <p style={{ marginBottom: "0px", lineHeight: "1.5" }}>
      {new Date(latestJournal.timestamp).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}{" "}
      •{" "}
      {latestJournal.text.length > 80
        ? latestJournal.text.slice(0, 80) + "…"
        : latestJournal.text}
    </p>
  ) : (
    <p style={{ marginBottom: "0px", lineHeight: "1.5" }}>
      No entries yet. Tap to start writing.
    </p>
  )}
</div>

            <div
              className="card"
              onClick={() => setPage("tools")}
              role="button"
              tabIndex={0}
            >
              <h3>Support tools</h3>
              <p>Breathing and grounding you can try at home.</p>
            </div>
          </div>
        );

      case "mood":
        return (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Mood check-in</h1>
            <p style={{ marginBottom: "18px", lineHeight: "1.5" }}>
              Take a moment. There is no right answer. Choose what fits best
              today.
            </p>

            <div className="card">
              <h3 style={{ marginBottom: "12px" }}>How are things feeling?</h3>

              <div className="mood-list">
                {[
                  { label: "Really struggling", key: "really", tone: "low" },
                  { label: "Struggling", key: "struggling", tone: "low" },
                  { label: "Steady", key: "steady", tone: "mid" },
                  { label: "Coping", key: "coping", tone: "high" },
                  { label: "Doing okay", key: "okay", tone: "high" },
                ].map((m) => (
                  <button
                    key={m.label}
                    className={`mood-item ${
                      moodValue?.level === m.label ? "selected" : ""
                    }`}
                    onClick={() => saveMood(m.label)}
                    data-tone={m.tone}
                  >
                    <span className="mood-label">{m.label}</span>
                    <span className="mood-face">
                      <FaceIcon mood={m.key} />
                    </span>
                  </button>
                ))}
              </div>

              {moodValue?.level && (
                <p className="small-note" style={{ marginTop: "12px" }}>
                  Saved: {moodValue.level}
                </p>
              )}

              {moodHistory.length > 0 && (
                <div className="mood-history">
                  <div className="history-label">Recent check-ins</div>
                  <div className="history-row">
                    {moodHistory.map((entry, index) => (
                      <div
                        key={entry.timestamp || index}
                        className={`history-dot ${index === 0 ? "is-new" : ""}`}
                      >
                        <FaceIcon mood={moodKeyFromLevel(entry.level)} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case "journal":
        return (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Journal</h1>
            <p style={{ marginBottom: "18px", lineHeight: "1.5" }}>
              This is your private space. Write as much or as
              little as you like.
            </p>

            <div className="card">
              <h3 style={{ marginBottom: "10px" }}>Optional prompt</h3>

              <select
                className="journal-select"
                value={journalPrompt}
                onChange={(e) => setJournalPrompt(e.target.value)}
              >
                {journalPrompts.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <div className="journal-prompt-preview">{journalPrompt}</div>

              <textarea
                className="journal-textarea"
                placeholder="Start writing here…"
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
              />

              <div className="journal-actions">
                <button className="primary-btn" onClick={saveJournalEntry}>
                  Save entry
                </button>
                <div className="small-note">
                  Saved privately on this device. Avoid names or identifying details.
                </div>
              </div>
            </div>

            <div style={{ height: "14px" }} />

            <div className="card">
              <h3 style={{ marginBottom: "12px" }}>Recent entries</h3>

              {journalEntries.length === 0 ? (
                <p className="small-note">
                  No entries yet. Your saved entries will appear here.
                </p>
              ) : (
                <div className="journal-entry-list">
                  {journalEntries.map((e) => {
                    const date = new Date(e.timestamp);
                    const pretty = date.toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    });

                    return (
                      <details key={e.id} className="journal-entry">
                        <summary className="journal-entry-summary">
                          <div className="journal-entry-row">
                            <div className="journal-entry-left">
                              <div className="journal-entry-date">{pretty}</div>
                              <div className="journal-entry-snippet">
                                {e.text.length > 70
                                  ? e.text.slice(0, 70) + "…"
                                  : e.text}
                              </div>
                            </div>

                            <button
                              type="button"
                              className="link-btn"
                              onClick={(evt) => {
                                evt.preventDefault();
                                evt.stopPropagation();
                                setDeleteId(e.id);
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        </summary>

                        <div className="journal-entry-body">
                          <div className="journal-entry-prompt">{e.prompt}</div>
                          <div className="journal-entry-text">{e.text}</div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );

          case "tools":
        return (
          <div>
            <h1 style={{ marginBottom: "10px" }}>Support tools</h1>
            <p style={{ marginBottom: "18px", lineHeight: "1.5" }}>
              Gentle tools you can try at home. There is no pressure to do them
              perfectly.
            </p>

            {/* Menu */}
            {!selectedTopic ? (
              <div className="card">
                <h3 style={{ marginBottom: "10px" }}>
                  What would you like support with?
                </h3>
                <p className="small-note" style={{ marginBottom: "12px" }}>
                  Choose a topic to see a few simple tools and a short
                  explanation.
                </p>

                <div className="topic-grid">
                  <button
                    type="button"
                    className="topic-btn"
                    onClick={() => setSelectedTopic("anxiety")}
                  >
                    Anxiety
                  </button>
                  <button
                    type="button"
                    className="topic-btn"
                    onClick={() => setSelectedTopic("stress")}
                  >
                    Stress
                  </button>
                  <button
                    type="button"
                    className="topic-btn"
                    onClick={() => setSelectedTopic("depression")}
                  >
                    Depression
                  </button>
                  <button
                    type="button"
                    className="topic-btn"
                    onClick={() => setSelectedTopic("bereavement")}
                  >
                    Bereavement
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Topic header */}
                <div className="card">
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => setSelectedTopic(null)}
                    style={{ marginBottom: "10px" }}
                  >
                    ← Back to topics
                  </button>

                  <h2 style={{ marginBottom: "6px" }}>
                    {TOOLS_TOPICS[selectedTopic]?.title || "Support"}
                  </h2>
                  <p className="small-note">
                    {TOOLS_TOPICS[selectedTopic]?.intro || ""}
                  </p>
                </div>

                <div style={{ height: "14px" }} />

                {/* Topic-specific tools */}
                {renderExtraTools(selectedTopic)}

                {TOOLS_TOPICS[selectedTopic]?.showBreathing && (
                  <>
                    <div style={{ height: "14px" }} />
                    {/* BREATHING (your existing card) */}
                    <div className="card">
                      <h3 style={{ marginBottom: "10px" }}>1-Minute Breathing</h3>
                      <p className="small-note" style={{ marginBottom: "12px" }}>
                        Breathe in for 4 • Hold for 4 • Out for 6
                      </p>

                      <div className="breathing-box">
                        {breathingPhase === "idle" && (
                          <div className="breathing-line">
                            Press start when you are ready.
                          </div>
                        )}

                        {breathingPhase !== "idle" && breathingPhase !== "done" && (
                          <>
                            <div className="breathing-line">
                              <strong>
                                {breathingPhase === "inhale"
                                  ? "Inhale"
                                  : breathingPhase === "hold"
                                  ? "Hold"
                                  : "Exhale"}
                              </strong>
                            </div>
                            <div className="breathing-count">{breathingCount}</div>
                          </>
                        )}

                        {breathingPhase === "done" && (
                          <div className="breathing-line">
                            Nice work. Take a moment to notice how you feel.
                          </div>
                        )}
                      </div>

                      <div className="breathing-actions">
                        {!breathingRunning ? (
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={startBreathing}
                          >
                            Start
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={pauseBreathing}
                          >
                            Pause
                          </button>
                        )}

                        <button
                          type="button"
                          className="link-btn"
                          onClick={resetBreathing}
                        >
                          Reset
                        </button>

                        <div className="small-note">
                          {Math.min(breathingTotalSeconds, 60)} / 60 seconds
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {TOOLS_TOPICS[selectedTopic]?.showGrounding && (
                  <>
                    <div style={{ height: "14px" }} />
                    {/* GROUNDING (your existing card) */}
                    <div className="card">
                      <h3 style={{ marginBottom: "10px" }}>5-4-3-2-1 Grounding</h3>

                      <div className="grounding-list">
                        <div>5 things you can see</div>
                        <div>4 things you can feel</div>
                        <div>3 things you can hear</div>
                        <div>2 things you can smell</div>
                        <div>1 thing you can taste</div>
                      </div>

                      <p className="small-note" style={{ marginTop: "12px" }}>
                        Move slowly. There is no rush.
                      </p>
                    </div>
                  </>
                )}

                <div style={{ height: "14px" }} />

                {/* Topic prompts at the bottom */}
                {renderPrompts(selectedTopic)}
              </>
            )}
          </div>
        );



      case "support":
  return (
    <div>
      <h1 style={{ marginBottom: "10px" }}>Support</h1>
      <p style={{ marginBottom: "18px", lineHeight: "1.5" }}>
        If you need more support, you are not alone. These services are available across the UK, including the North East.
      </p>

      <div
        className="card support-card"
        role="button"
        tabIndex={0}
        onClick={() => (window.location.href = "tel:999")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.location.href = "tel:999";
          }
        }}
      >
        <h3 style={{ marginBottom: "6px" }}>If you feel unsafe right now</h3>
        <p className="small-note" style={{ marginBottom: "12px" }}>
          If you are in immediate danger, call emergency services.
        </p>
        <a href="tel:999" className="support-number support-link">
  Call 999
</a>

      </div>

      <div
        className="card support-card"
        role="button"
        tabIndex={0}
        onClick={() => (window.location.href = "tel:111")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            window.location.href = "tel:111";
          }
        }}
      >
        <h3 style={{ marginBottom: "6px" }}>Urgent mental health support</h3>
        <p>
  NHS urgent mental health help is available 24/7. 
  Call NHS 111 to be connected to your local NHS crisis team.
</p>

<p className="small-note" style={{ marginTop: "6px" }}>
  In the North East, this connects you to your local NHS mental health crisis service.
</p>

        <a href="tel:111" className="support-number support-link">
  Call NHS 111
</a>

      </div>

      <div className="card">
        <h3 style={{ marginBottom: "10px" }}>Talk to someone now</h3>

        <div
          className="support-pill support-card"
          role="button"
          tabIndex={0}
          onClick={() => (window.location.href = "tel:116123")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              window.location.href = "tel:116123";
            }
          }}
          style={{ marginBottom: "10px" }}
        >
          <strong>Samaritans</strong>
          <a href="tel:116123" className="support-link">
  Call 116 123 (24/7, free)
</a>

        </div>

        <div
          className="support-pill support-card"
          role="button"
          tabIndex={0}
          onClick={() => (window.location.href = "sms:85258")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              window.location.href = "sms:85258";
            }
          }}
        >
          <strong>Shout (text support)</strong>
          <a href="sms:85258" className="support-link">
  Text 85258 (24/7)
</a>

        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: "6px" }}>Non-urgent support</h3>
        <p className="small-note">
          You can self-refer to NHS Talking Therapies via the NHS website, or speak to your GP about local support in your area.
        </p>
      </div>

      <div className="card">
        <p className="small-note" style={{ margin: 0 }}>
          Reflect is a supportive tool while you wait. It is not therapy and cannot replace professional or emergency care.
        </p>
      </div>
    </div>
  );



      default:
        return <div>Home Page</div>;
    }
  };

  return (
    
    <div className="app-container">
       {/* Background blobs */}
    <div className="bg-shape bg-shape-1" aria-hidden="true" />
    <div className="bg-shape bg-shape-2" aria-hidden="true" />
    <div className="bg-shape bg-shape-3" aria-hidden="true" />
      <div className="content">{renderPage()}</div>

      <div className="bottom-nav">
        <button
          className={page === "home" ? "active" : ""}
          onClick={() => setPage("home")}
        >
          Home
        </button>
        <button
          className={page === "journal" ? "active" : ""}
          onClick={() => setPage("journal")}
        >
          Journal
        </button>
        <button
          className={page === "mood" ? "active" : ""}
          onClick={() => setPage("mood")}
        >
          Mood
        </button>
        <button
          className={page === "tools" ? "active" : ""}
          onClick={() => setPage("tools")}
        >
          Tools
        </button>
        <button
          className={page === "support" ? "active" : ""}
          onClick={() => setPage("support")}
        >
          Support
        </button>
      </div>

      {deleteId && (
        <div className="modal-overlay" onClick={() => setDeleteId(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: "8px" }}>Delete entry?</h3>
            <p className="small-note" style={{ marginBottom: "14px" }}>
              This will remove it from this device.
            </p>

            <div className="modal-actions">
              <button className="secondary-btn" onClick={() => setDeleteId(null)}>
                Cancel
              </button>
              <button
                className="primary-btn"
                onClick={() => {
                  deleteJournalEntry(deleteId);
                  setDeleteId(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
}
