"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ─── Icon Components ─────────────────────────────────────────────
function UploadIcon() {
    return (
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    );
}

function SpinnerIcon({ size = 20 }) {
    return (
        <svg className="spinner" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}

function CheckCircleIcon({ size = 20, className = "" }) {
    return (
        <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
    );
}

// ─── CSV Parser ──────────────────────────────────────────────────
function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf("name");
    const emailIdx = headers.indexOf("email");
    const companyIdx = headers.indexOf("company");

    if (nameIdx === -1 || emailIdx === -1 || companyIdx === -1) return null;

    return lines
        .slice(1)
        .filter(Boolean)
        .map((line) => {
            const cols = line.split(",").map((c) => c.trim());
            return {
                name: cols[nameIdx] || "",
                email: cols[emailIdx] || "",
                company: cols[companyIdx] || "",
            };
        })
        .filter((l) => l.name && l.email && l.company);
}

// ─── Countdown Hook ──────────────────────────────────────────────
function useCountdown(seconds, active) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        if (!active) {
            setRemaining(seconds);
            return;
        }
        const interval = setInterval(() => {
            setRemaining((r) => (r <= 1 ? 0 : r - 1));
        }, 1000);
        return () => clearInterval(interval);
    }, [active, seconds]);

    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return {
        remaining,
        display: `${mins}:${secs.toString().padStart(2, "0")}`,
    };
}

// ─── Format elapsed time ─────────────────────────────────────────
function formatElapsed(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ─── Lock Icon ────────────────────────────────────────────────
function LockIcon() {
    return (
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
    );
}

export default function Home() {
    // ── Auth state ──────────────────────────────────────────────
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [authError, setAuthError] = useState("");
    const [authLoading, setAuthLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);

    // ── Check session on mount ──────────────────────────────────
    useEffect(() => {
        const session = sessionStorage.getItem("lead-mailer-auth");
        if (session === "authenticated") {
            setIsAuthenticated(true);
        }
        setCheckingSession(false);
    }, []);

    // ── Handle login ────────────────────────────────────────────
    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError("");

        try {
            const res = await fetch("/api/auth", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
            });
            const data = await res.json();

            if (data.success) {
                sessionStorage.setItem("lead-mailer-auth", "authenticated");
                setIsAuthenticated(true);
            } else {
                setAuthError("Wrong password. Try again.");
                setPassword("");
            }
        } catch {
            setAuthError("Something went wrong. Try again.");
        }
        setAuthLoading(false);
    };

    // state: "input" | "sending" | "done"
    const [currentState, setCurrentState] = useState("input");
    const [leads, setLeads] = useState([]);
    const [prompt, setPrompt] = useState("");
    const [fileName, setFileName] = useState("");
    const [statuses, setStatuses] = useState([]); // "pending" | "sending" | "sent" | "failed"
    const [subjects, setSubjects] = useState([]); // subject used for each lead
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isWaiting, setIsWaiting] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isSendingActive, setIsSendingActive] = useState(false);
    const fileInputRef = useRef(null);

    const countdown = useCountdown(120, isWaiting);

    // ── Elapsed timer ──────────────────────────────────────────────
    useEffect(() => {
        if (!isSendingActive) return;
        const interval = setInterval(() => {
            setElapsedTime((t) => t + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, [isSendingActive]);

    // ── Handle CSV Upload ──────────────────────────────────────────
    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setErrorMsg("");
        const reader = new FileReader();
        reader.onload = (ev) => {
            const parsed = parseCSV(ev.target.result);
            if (parsed === null) {
                setErrorMsg("CSV must have columns: name, email, company");
                return;
            }
            if (parsed.length === 0) {
                setErrorMsg("No valid rows found in CSV");
                return;
            }
            setLeads(parsed);
            setFileName(file.name);
        };
        reader.readAsText(file);
    };

    // ── Send Emails ────────────────────────────────────────────────
    const startSending = useCallback(async () => {
        if (leads.length === 0 || !prompt.trim()) return;

        setCurrentState("sending");
        setIsSendingActive(true);
        setElapsedTime(0);

        const newStatuses = leads.map(() => "pending");
        const newSubjects = leads.map(() => "");
        setStatuses([...newStatuses]);
        setSubjects([...newSubjects]);
        setActiveIndex(0);

        for (let i = 0; i < leads.length; i++) {
            setActiveIndex(i);
            newStatuses[i] = "sending";
            setStatuses([...newStatuses]);

            try {
                const res = await fetch("/api/send-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...leads[i], prompt }),
                });
                const data = await res.json();
                newStatuses[i] = data.success ? "sent" : "failed";
                if (data.subject) newSubjects[i] = data.subject;
            } catch {
                newStatuses[i] = "failed";
            }
            setStatuses([...newStatuses]);
            setSubjects([...newSubjects]);

            // Wait 2 minutes before next email (skip after last one)
            if (i < leads.length - 1) {
                setIsWaiting(true);
                await new Promise((resolve) => setTimeout(resolve, 120000));
                setIsWaiting(false);
            }
        }

        setIsSendingActive(false);
        setCurrentState("done");
    }, [leads, prompt]);

    // ── Reset ──────────────────────────────────────────────────────
    const resetAll = () => {
        setCurrentState("input");
        setLeads([]);
        setPrompt("");
        setFileName("");
        setStatuses([]);
        setSubjects([]);
        setActiveIndex(-1);
        setIsWaiting(false);
        setErrorMsg("");
        setElapsedTime(0);
        setIsSendingActive(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ── Derived counts ────────────────────────────────────────────
    const sentCount = statuses.filter((s) => s === "sent").length;
    const failedCount = statuses.filter((s) => s === "failed").length;
    const doneCount = sentCount + failedCount;

    // ── Loading screen while checking session ───────────────────
    if (checkingSession) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <SpinnerIcon size={32} />
            </div>
        );
    }

    // ── Login Screen ────────────────────────────────────────────
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
                <div className="w-full max-w-sm fade-in-up">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-6">
                            <LockIcon />
                        </div>
                        <h1 className="text-2xl font-bold text-white mb-2">Lead Mailer</h1>
                        <p className="text-sm text-[#8b8ba3]">Enter your password to continue</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-6 space-y-4">
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                autoFocus
                                className="w-full bg-[#0e0e16] border border-[#2a2a3d] rounded-xl px-4 py-3 text-white placeholder:text-[#3a3a50] text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
                            />

                            {authError && (
                                <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
                                    ⚠️ {authError}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={!password.trim() || authLoading}
                                className="w-full py-3.5 rounded-xl font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2
                                    disabled:bg-[#1a1a25] disabled:text-[#3a3a50] disabled:cursor-not-allowed
                                    bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
                            >
                                {authLoading ? <SpinnerIcon size={18} /> : "Unlock"}
                            </button>
                        </div>
                    </form>

                    <div className="text-center mt-6 text-[#2a2a3d] text-xs">
                        Secured Access · Lead Mailer
                    </div>
                </div>
            </div>
        );
    }


    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    //  RENDER
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-start justify-center px-4 py-12">
            <div className="w-full max-w-3xl">
                {/* ── HEADER ────────────────────────────────────────── */}
                <div className="text-center mb-10 fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6 tracking-wide">
                        <MailIcon />
                        EMAIL CAMPAIGN TOOL
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-[#8b8ba3] bg-clip-text text-transparent">
                        Lead Mailer
                    </h1>
                    <p className="mt-3 text-[#8b8ba3] text-base">
                        Send personalized emails to your leads
                    </p>
                </div>

                {/* ── STATE 1: INPUT FORM ───────────────────────────── */}
                {currentState === "input" && (
                    <div className="fade-in-up space-y-6">
                        {/* CSV Upload Card */}
                        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-6">
                            <label className="block text-sm font-medium text-[#8b8ba3] mb-3">
                                Upload Lead List (.csv)
                            </label>

                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileUpload}
                                className="hidden"
                                id="csv-upload"
                            />

                            <label
                                htmlFor="csv-upload"
                                className="flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed border-[#2a2a3d] hover:border-indigo-500/50 bg-[#0e0e16] cursor-pointer transition-all duration-300 group"
                            >
                                <div className="text-[#3a3a5d] group-hover:text-indigo-400 transition-colors duration-300">
                                    <UploadIcon />
                                </div>
                                {fileName ? (
                                    <div className="text-center">
                                        <p className="text-white font-medium">{fileName}</p>
                                        <p className="text-xs text-indigo-400 mt-1">
                                            {leads.length} leads loaded · Click to replace
                                        </p>
                                    </div>
                                ) : (
                                    <div className="text-center">
                                        <p className="text-[#8b8ba3] text-sm font-medium">
                                            Click to upload CSV
                                        </p>
                                        <p className="text-xs text-[#555570] mt-1">
                                            Columns: name, email, company
                                        </p>
                                    </div>
                                )}
                            </label>

                            {errorMsg && (
                                <p className="mt-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-4 py-2">
                                    ⚠️ {errorMsg}
                                </p>
                            )}
                        </div>

                        {/* Lead Preview Table */}
                        {leads.length > 0 && (
                            <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] overflow-hidden">
                                <div className="px-6 py-4 border-b border-[#1e1e2e] flex items-center justify-between">
                                    <h2 className="text-sm font-semibold text-white">
                                        Lead Preview
                                    </h2>
                                    <span className="text-xs text-[#555570] bg-[#1a1a25] px-3 py-1 rounded-full">
                                        {leads.length} {leads.length === 1 ? "lead" : "leads"}
                                    </span>
                                </div>
                                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-[#0e0e16]">
                                            <tr className="text-left text-[#555570] text-xs uppercase tracking-wider">
                                                <th className="px-6 py-3 font-medium">#</th>
                                                <th className="px-6 py-3 font-medium">Name</th>
                                                <th className="px-6 py-3 font-medium">Email</th>
                                                <th className="px-6 py-3 font-medium">Company</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leads.map((lead, i) => (
                                                <tr
                                                    key={i}
                                                    className="border-t border-[#1a1a25] hover:bg-[#16161f] transition-colors"
                                                >
                                                    <td className="px-6 py-3 text-[#555570] font-mono text-xs">
                                                        {i + 1}
                                                    </td>
                                                    <td className="px-6 py-3 text-white font-medium">
                                                        {lead.name}
                                                    </td>
                                                    <td className="px-6 py-3 text-[#8b8ba3]">
                                                        {lead.email}
                                                    </td>
                                                    <td className="px-6 py-3 text-[#8b8ba3]">
                                                        {lead.company}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Prompt Textarea */}
                        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-6">
                            <label className="block text-sm font-medium text-[#8b8ba3] mb-3">
                                Email Prompt
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder='e.g. "Send them an email about our website design services and how we can help their business grow online"'
                                rows={4}
                                className="w-full bg-[#0e0e16] border border-[#2a2a3d] rounded-xl px-4 py-3 text-white placeholder:text-[#3a3a50] text-sm focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300 resize-none"
                            />
                        </div>

                        {/* Info Banner */}
                        <div className="rounded-xl bg-indigo-500/5 border border-indigo-500/10 px-5 py-3 flex items-start gap-3">
                            <span className="text-indigo-400 mt-0.5 text-lg">ℹ️</span>
                            <div className="text-xs text-[#8b8ba3] leading-relaxed">
                                <p>
                                    Each email gets a <span className="text-indigo-400 font-medium">unique subject line</span> picked
                                    randomly from 8 templates. A <span className="text-indigo-400 font-medium">2-minute cooldown</span> runs
                                    between each send to avoid spam filters.
                                </p>
                                <p className="mt-1 text-[#555570]">
                                    Gmail limit: ~500 emails/day · Recommended: 100–150 per session
                                </p>
                            </div>
                        </div>

                        {/* Start Button */}
                        <button
                            onClick={startSending}
                            disabled={leads.length === 0 || !prompt.trim()}
                            className="w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-300 flex items-center justify-center gap-2
                disabled:bg-[#1a1a25] disabled:text-[#3a3a50] disabled:cursor-not-allowed
                bg-indigo-600 hover:bg-indigo-500 text-white hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
                        >
                            <MailIcon />
                            Start Sending — {leads.length}{" "}
                            {leads.length === 1 ? "Email" : "Emails"}
                        </button>
                    </div>
                )}

                {/* ── STATE 2: SENDING PROGRESS ─────────────────────── */}
                {currentState === "sending" && (
                    <div className="fade-in-up space-y-6">
                        {/* Progress Header */}
                        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-indigo-500/10">
                                        <SpinnerIcon size={18} />
                                    </div>
                                    <div>
                                        <h2 className="text-white font-semibold text-sm">
                                            Sending Emails
                                        </h2>
                                        <p className="text-xs text-[#555570] mt-0.5">
                                            {sentCount} of {leads.length} sent · Elapsed:{" "}
                                            {formatElapsed(elapsedTime)}
                                        </p>
                                    </div>
                                </div>
                                {isWaiting && (
                                    <div className="text-right pulse-glow rounded-xl px-4 py-2 bg-indigo-500/5 border border-indigo-500/20">
                                        <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-medium">
                                            Next email in
                                        </p>
                                        <p className="text-xl font-bold text-white font-mono">
                                            {countdown.display}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-1.5 bg-[#1a1a25] rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-700 ease-out"
                                    style={{
                                        width: `${(doneCount / leads.length) * 100}%`,
                                    }}
                                />
                            </div>

                            {/* ETA */}
                            <p className="text-[11px] text-[#3a3a50] mt-2">
                                Estimated time remaining:{" "}
                                {formatElapsed(
                                    (leads.length - doneCount - 1) * 120 + 5
                                )}
                            </p>
                        </div>

                        {/* Lead Status List */}
                        <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] overflow-hidden">
                            <div className="max-h-[420px] overflow-y-auto divide-y divide-[#1a1a25]">
                                {leads.map((lead, i) => {
                                    const status = statuses[i];
                                    const subjectUsed = subjects[i];
                                    return (
                                        <div
                                            key={i}
                                            className={`flex items-center gap-4 px-6 py-4 transition-all duration-300 slide-in ${status === "sending" ? "bg-indigo-500/5" : ""
                                                }`}
                                            style={{ animationDelay: `${i * 50}ms` }}
                                        >
                                            {/* Status Icon */}
                                            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
                                                {status === "sent" && (
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                                        <CheckCircleIcon
                                                            size={16}
                                                            className="text-emerald-400"
                                                        />
                                                    </div>
                                                )}
                                                {status === "failed" && (
                                                    <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 text-xs font-bold">
                                                        ✕
                                                    </div>
                                                )}
                                                {status === "sending" && (
                                                    <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                        <SpinnerIcon size={16} />
                                                    </div>
                                                )}
                                                {status === "pending" &&
                                                    i === activeIndex + 1 &&
                                                    isWaiting && (
                                                        <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400 text-sm">
                                                            ⏳
                                                        </div>
                                                    )}
                                                {status === "pending" &&
                                                    !(i === activeIndex + 1 && isWaiting) && (
                                                        <div className="w-8 h-8 rounded-full bg-[#1a1a25] flex items-center justify-center">
                                                            <div className="w-2.5 h-2.5 rounded-full bg-[#2a2a3d]" />
                                                        </div>
                                                    )}
                                            </div>

                                            {/* Lead Info */}
                                            <div className="flex-1 min-w-0">
                                                <p
                                                    className={`text-sm font-medium truncate ${status === "sent"
                                                        ? "text-emerald-400"
                                                        : status === "failed"
                                                            ? "text-red-400"
                                                            : status === "sending"
                                                                ? "text-white"
                                                                : "text-[#555570]"
                                                        }`}
                                                >
                                                    {status === "sent" &&
                                                        `✅ Email sent to ${lead.name}`}
                                                    {status === "failed" &&
                                                        `❌ Failed to send to ${lead.name}`}
                                                    {status === "sending" &&
                                                        `Sending to ${lead.name}...`}
                                                    {status === "pending" &&
                                                        i === activeIndex + 1 &&
                                                        isWaiting &&
                                                        `⏳ Waiting to send to ${lead.name}...`}
                                                    {status === "pending" &&
                                                        !(i === activeIndex + 1 && isWaiting) &&
                                                        lead.name}
                                                </p>
                                                <p
                                                    className={`text-xs mt-0.5 truncate ${status === "sent" || status === "sending"
                                                        ? "text-[#8b8ba3]"
                                                        : "text-[#3a3a50]"
                                                        }`}
                                                >
                                                    {lead.company} · {lead.email}
                                                    {status === "sent" && subjectUsed && (
                                                        <span className="text-[#555570]">
                                                            {" "}
                                                            · Subj: &quot;{subjectUsed}&quot;
                                                        </span>
                                                    )}
                                                </p>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="flex-shrink-0">
                                                {status === "sent" && (
                                                    <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
                                                        Sent
                                                    </span>
                                                )}
                                                {status === "failed" && (
                                                    <span className="text-[10px] font-medium uppercase tracking-wider text-red-400 bg-red-400/10 px-2.5 py-1 rounded-full">
                                                        Failed
                                                    </span>
                                                )}
                                                {status === "sending" && (
                                                    <span className="text-[10px] font-medium uppercase tracking-wider text-indigo-400 bg-indigo-400/10 px-2.5 py-1 rounded-full">
                                                        Sending
                                                    </span>
                                                )}
                                                {status === "pending" &&
                                                    i === activeIndex + 1 &&
                                                    isWaiting && (
                                                        <span className="text-[10px] font-medium uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full">
                                                            Next
                                                        </span>
                                                    )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── STATE 3: DONE ─────────────────────────────────── */}
                {currentState === "done" && (
                    <div className="fade-in-up flex flex-col items-center text-center py-12">
                        {/* Animated Checkmark */}
                        <div className="check-animate mb-8">
                            <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center">
                                <CheckCircleIcon size={48} className="text-emerald-400" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-white mb-3">
                            All emails sent successfully! 🎉
                        </h2>

                        <p className="text-[#8b8ba3] text-base max-w-md mb-2">
                            You emailed{" "}
                            <span className="text-white font-semibold">{sentCount}</span>{" "}
                            {sentCount === 1 ? "lead" : "leads"} in{" "}
                            <span className="text-white font-semibold">
                                {formatElapsed(elapsedTime)}
                            </span>
                            . Check your Gmail Sent folder to confirm.
                        </p>

                        {/* Stats Row */}
                        <div className="flex items-center gap-6 mt-6 mb-4">
                            <div className="flex items-center gap-2 text-sm text-emerald-400">
                                <CheckCircleIcon size={14} />
                                {sentCount} Sent
                            </div>
                            {failedCount > 0 && (
                                <div className="flex items-center gap-2 text-sm text-red-400">
                                    ✕ {failedCount} Failed
                                </div>
                            )}
                        </div>

                        {/* Subject lines used */}
                        {subjects.filter(Boolean).length > 0 && (
                            <div className="w-full max-w-md mt-4 mb-8 rounded-xl bg-[#12121a] border border-[#1e1e2e] p-4 text-left">
                                <p className="text-xs text-[#555570] uppercase tracking-wider font-medium mb-3">
                                    Subject lines used
                                </p>
                                <div className="space-y-2">
                                    {leads.map((lead, i) =>
                                        subjects[i] ? (
                                            <div
                                                key={i}
                                                className="flex items-start gap-2 text-xs"
                                            >
                                                <span className="text-emerald-400 mt-0.5 flex-shrink-0">
                                                    ✓
                                                </span>
                                                <span className="text-[#8b8ba3]">
                                                    <span className="text-white font-medium">
                                                        {lead.name}
                                                    </span>{" "}
                                                    — &quot;{subjects[i]}&quot;
                                                </span>
                                            </div>
                                        ) : null
                                    )}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={resetAll}
                            className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm tracking-wide transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/20 active:scale-[0.98]"
                        >
                            Start New Campaign
                        </button>
                    </div>
                )}

                {/* ── Footer ────────────────────────────────────────── */}
                <div className="text-center mt-12 text-[#2a2a3d] text-xs">
                    Lead Mailer · Built with Next.js
                </div>
            </div>
        </div>
    );
}
