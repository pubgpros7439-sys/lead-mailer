"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

// ─── Time Ago Helper ──────────────────────────────────────────
function timeAgo(dateStr) {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffDay > 30) return `${Math.floor(diffDay / 30)}mo ago`;
    if (diffDay > 0) return `${diffDay}d ago`;
    if (diffHr > 0) return `${diffHr}h ago`;
    if (diffMin > 0) return `${diffMin}m ago`;
    return "just now";
}

// ─── Icons ────────────────────────────────────────────────────
function SearchIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
    );
}

function ChartIcon() {
    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 3v18h18" />
            <path d="m19 9-5 5-4-4-3 3" />
        </svg>
    );
}

function MailIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
        </svg>
    );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESULTS PAGE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function ResultsPage() {
    const [leads, setLeads] = useState([]);
    const [filter, setFilter] = useState("all"); // "all" | "replied" | "no-reply"
    const [search, setSearch] = useState("");
    const [loaded, setLoaded] = useState(false);

    // ── Load from localStorage ──────────────────────────────────
    useEffect(() => {
        const data = JSON.parse(localStorage.getItem("lead-mailer-results") || "[]");
        setLeads(data);
        setLoaded(true);
    }, []);

    // ── Toggle replied status ───────────────────────────────────
    const toggleReplied = (id) => {
        setLeads((prev) => {
            const updated = prev.map((lead) =>
                lead.id === id ? { ...lead, replied: !lead.replied } : lead
            );
            localStorage.setItem("lead-mailer-results", JSON.stringify(updated));
            return updated;
        });
    };

    // ── Stats ───────────────────────────────────────────────────
    const totalSent = leads.length;
    const repliedCount = leads.filter((l) => l.replied).length;
    const noReplyCount = totalSent - repliedCount;
    const replyRate = totalSent > 0 ? Math.round((repliedCount / totalSent) * 100) : 0;

    // ── Filtered & searched leads ───────────────────────────────
    const filteredLeads = useMemo(() => {
        let result = leads;

        if (filter === "replied") result = result.filter((l) => l.replied);
        if (filter === "no-reply") result = result.filter((l) => !l.replied);

        if (search.trim()) {
            const q = search.toLowerCase();
            result = result.filter(
                (l) =>
                    l.name.toLowerCase().includes(q) ||
                    l.company.toLowerCase().includes(q) ||
                    l.email.toLowerCase().includes(q)
            );
        }

        return result;
    }, [leads, filter, search]);

    if (!loaded) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <svg className="spinner" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0a0a0f] flex items-start justify-center px-4 py-12">
            <div className="w-full max-w-4xl">
                {/* ── NAV ───────────────────────────────────────────── */}
                <nav className="flex items-center justify-center gap-2 mb-8 fade-in-up">
                    <Link href="/" className="px-4 py-2 rounded-xl text-[#555570] hover:text-[#8b8ba3] hover:bg-[#12121a] text-xs font-medium tracking-wide transition-all duration-300">
                        Campaign
                    </Link>
                    <span className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold tracking-wide">
                        Results
                    </span>
                </nav>

                {/* ── HEADER ────────────────────────────────────────── */}
                <div className="text-center mb-10 fade-in-up">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium mb-6 tracking-wide">
                        <ChartIcon />
                        CAMPAIGN ANALYTICS
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-[#8b8ba3] bg-clip-text text-transparent">
                        Campaign Results
                    </h1>
                    <p className="mt-3 text-[#8b8ba3] text-base">
                        Track replies and measure your outreach performance
                    </p>
                </div>

                {/* ── STATS ─────────────────────────────────────────── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 fade-in-up">
                    {/* Total Sent */}
                    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-5 text-center">
                        <p className="text-xs text-[#555570] uppercase tracking-wider font-medium mb-2">Total Sent</p>
                        <p className="text-3xl font-bold text-white">{totalSent}</p>
                    </div>
                    {/* Replied */}
                    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-5 text-center">
                        <p className="text-xs text-[#555570] uppercase tracking-wider font-medium mb-2">Replied</p>
                        <p className="text-3xl font-bold text-emerald-400">{repliedCount}</p>
                    </div>
                    {/* No Reply */}
                    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-5 text-center">
                        <p className="text-xs text-[#555570] uppercase tracking-wider font-medium mb-2">No Reply</p>
                        <p className="text-3xl font-bold text-[#555570]">{noReplyCount}</p>
                    </div>
                    {/* Reply Rate */}
                    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-5 text-center">
                        <p className="text-xs text-[#555570] uppercase tracking-wider font-medium mb-2">Reply Rate</p>
                        <p className="text-3xl font-bold text-indigo-400">{replyRate}%</p>
                    </div>
                </div>

                {/* ── FILTERS & SEARCH ──────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6 fade-in-up">
                    {/* Filter Buttons */}
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#12121a] border border-[#1e1e2e]">
                        {[
                            { key: "all", label: "All", count: totalSent },
                            { key: "replied", label: "Replied", count: repliedCount },
                            { key: "no-reply", label: "No Reply", count: noReplyCount },
                        ].map((f) => (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${filter === f.key
                                        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
                                        : "text-[#555570] hover:text-[#8b8ba3] border border-transparent"
                                    }`}
                            >
                                {f.label} <span className="ml-1 opacity-60">{f.count}</span>
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="flex-1 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#3a3a50]">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, company, or email..."
                            className="w-full bg-[#12121a] border border-[#1e1e2e] rounded-xl pl-9 pr-4 py-2.5 text-white placeholder:text-[#3a3a50] text-xs focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-300"
                        />
                    </div>
                </div>

                {/* ── TABLE ─────────────────────────────────────────── */}
                {filteredLeads.length === 0 ? (
                    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] p-12 text-center fade-in-up">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#1a1a25] mb-4">
                            <MailIcon />
                        </div>
                        <p className="text-[#555570] text-sm">
                            {totalSent === 0
                                ? "No emails sent yet. Run a campaign first!"
                                : "No leads match your filters."}
                        </p>
                        {totalSent === 0 && (
                            <Link
                                href="/"
                                className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all duration-300"
                            >
                                Start Campaign
                            </Link>
                        )}
                    </div>
                ) : (
                    <div className="rounded-2xl bg-[#12121a] border border-[#1e1e2e] overflow-hidden fade-in-up">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-[#555570] text-[10px] uppercase tracking-wider border-b border-[#1a1a25]">
                                        <th className="px-5 py-3.5 font-medium">Name</th>
                                        <th className="px-5 py-3.5 font-medium">Company</th>
                                        <th className="px-5 py-3.5 font-medium hidden sm:table-cell">Email</th>
                                        <th className="px-5 py-3.5 font-medium">Sent</th>
                                        <th className="px-5 py-3.5 font-medium text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredLeads.map((lead) => (
                                        <tr
                                            key={lead.id}
                                            className="border-t border-[#1a1a25] hover:bg-[#16161f] transition-colors duration-200"
                                        >
                                            <td className="px-5 py-3.5">
                                                <p className="text-white font-medium text-sm">{lead.name}</p>
                                            </td>
                                            <td className="px-5 py-3.5 text-[#8b8ba3]">{lead.company}</td>
                                            <td className="px-5 py-3.5 text-[#8b8ba3] hidden sm:table-cell">
                                                <span className="text-xs">{lead.email}</span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-xs text-[#555570]">{timeAgo(lead.sentAt)}</span>
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                <button
                                                    onClick={() => toggleReplied(lead.id)}
                                                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wider transition-all duration-300 cursor-pointer active:scale-95 ${lead.replied
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                                                            : "bg-[#1a1a25] text-[#555570] border border-[#2a2a3d] hover:text-[#8b8ba3] hover:border-[#3a3a5d]"
                                                        }`}
                                                >
                                                    {lead.replied ? "Replied ✅" : "No Reply"}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── Footer ────────────────────────────────────────── */}
                <div className="text-center mt-12 text-[#2a2a3d] text-xs">
                    Lead Mailer · Campaign Results
                </div>
            </div>
        </div>
    );
}
