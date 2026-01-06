'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Sun, Moon, ExternalLink, Copy, Plus, Star, ChevronDown, ChevronUp, Search, Zap, Activity, Info } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface SeoResults {
    domain: string;
    scanned_at: string;
    data_source: string;
    observed_keywords: Array<{ keyword: string }>;
    sampled_positions: Array<{ keyword: string; position: number }>;
    serp_competitors: {
        direct: Array<{ domain: string }>;
        content: Array<{ domain: string }>;
    };
    domain_age: {
        years: number | null;
        created: string | null;
        expires: string | null;
        registrar: string | null;
    };
    health_score: number;
    score_breakdown: Record<string, number>;
    recommendations: Array<{ text: string }>;
    suggested_keywords: Array<{ category: string; keywords: string[] }>;
    lighthouse_metrics?: {
        performance: { score: number; label: string; color: string };
        seo: { score: number; label: string; color: string };
        accessibility: { score: number; label: string; color: string };
        core_web_vitals: { lcp: string; fcp: string; cls: string | number };
        mobile_optimized: boolean;
    };
}

interface ScanData {
    scanId: string;
    url: string;
    domain: string;
    status: string;
    progress: number;
    currentStep: string;
    dataSource: string;
    createdAt: string;
    startedAt: string;
    completedAt: string;
    results?: SeoResults;
    errorMessage?: string;
}

// Keyword Chip Component with hover actions
function KeywordChip({ keyword, category, onCopy }: { keyword: string; category: string; onCopy: (kw: string) => void }) {
    const [showActions, setShowActions] = useState(false);
    const [copied, setCopied] = useState(false);

    // Color based on category
    const getCategoryColor = () => {
        if (category.toLowerCase().includes('transactional') || category.toLowerCase().includes('intent')) {
            return 'bg-emerald-500/10 border-emerald-500/30 hover:border-emerald-500/50';
        }
        if (category.toLowerCase().includes('informational') || category.toLowerCase().includes('educational')) {
            return 'bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50';
        }
        return 'bg-purple-500/10 border-purple-500/30 hover:border-purple-500/50';
    };

    const getDotColor = () => {
        if (category.toLowerCase().includes('transactional') || category.toLowerCase().includes('intent')) {
            return 'bg-emerald-400';
        }
        if (category.toLowerCase().includes('informational') || category.toLowerCase().includes('educational')) {
            return 'bg-blue-400';
        }
        return 'bg-purple-400';
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(keyword);
        setCopied(true);
        onCopy(keyword);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <div
            className={`relative group inline-flex items-center gap-2 px-3 py-1.5 rounded-full border backdrop-blur-sm transition-all duration-200 cursor-pointer max-w-[320px] ${getCategoryColor()}`}
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Category indicator dot */}
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${getDotColor()}`} />

            {/* Keyword text - truncated if too long */}
            <span className="text-[13px] text-foreground/90 truncate">{keyword}</span>

            {/* Hover actions overlay - Copy Only */}
            {showActions && (
                <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center bg-card/95 backdrop-blur-sm rounded-full border border-border/50 p-0.5 shadow-lg z-10">
                    <button
                        onClick={handleCopy}
                        className="p-1.5 rounded-full hover:bg-secondary/80 transition-colors flex items-center gap-1"
                        title="Copy keyword"
                    >
                        <Copy className={`w-3 h-3 ${copied ? 'text-emerald-400' : 'text-muted-foreground'}`} />
                        {copied && <span className="text-[10px] text-emerald-500 font-medium pr-1">Copied</span>}
                    </button>
                </div>
            )}
        </div>
    );
}
// Keyword Category Card - Controlled component with parent-managed state
const KeywordCategoryCard = ({
    category,
    keywords,
    onCopy,
    isExpanded,
    onToggleExpand
}: {
    category: string;
    keywords: string[];
    onCopy: (kw: string) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}) => {
    const [copied, setCopied] = useState<string | null>(null);

    const LIMIT = 5;
    const showExpand = keywords.length > LIMIT;
    const displayedKeywords = isExpanded ? keywords : keywords.slice(0, LIMIT);

    const copyKeyword = (kw: string) => {
        navigator.clipboard.writeText(kw);
        setCopied(kw);
        onCopy(kw);
        setTimeout(() => setCopied(null), 1500);
    };

    // Category styling
    const getStyle = () => {
        const cat = category.toLowerCase();
        if (cat.includes('transactional') || cat.includes('intent')) {
            return { dot: 'bg-emerald-500', label: 'Buying Intent' };
        }
        if (cat.includes('informational') || cat.includes('educational')) {
            return { dot: 'bg-blue-500', label: 'Top-of-Funnel' };
        }
        return { dot: 'bg-purple-500', label: 'Low Competition' };
    };
    const style = getStyle();

    return (
        <div className="bg-card rounded-xl border border-border/40 overflow-hidden h-full flex flex-col">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <div>
                    <h4 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${style.dot}`} />
                        {category}
                    </h4>
                    <p className="text-[11px] text-muted-foreground mt-0.5 ml-4">{style.label}</p>
                </div>
                <span className="text-[11px] font-medium bg-secondary px-2 py-0.5 rounded text-muted-foreground">
                    {keywords.length}
                </span>
            </div>

            {/* Keywords List */}
            <div className="flex-1">
                {displayedKeywords.map((kw, idx) => (
                    <div
                        key={`${category}-${idx}`}
                        className="group flex items-center justify-between px-5 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors"
                    >
                        <span className="text-[13px] text-foreground truncate max-w-[80%]">
                            {kw}
                        </span>
                        <button
                            onClick={() => copyKeyword(kw)}
                            className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                        >
                            <Copy className={`w-3.5 h-3.5 ${copied === kw ? 'text-emerald-500' : ''}`} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Expand/Collapse */}
            {showExpand && (
                <div className="px-5 py-3 border-t border-border/40">
                    <button
                        onClick={onToggleExpand}
                        className="text-[12px] font-medium text-primary hover:underline flex items-center gap-1"
                    >
                        {isExpanded ? (
                            <>Show less <ChevronUp className="w-3 h-3" /></>
                        ) : (
                            <>Show {keywords.length - LIMIT} more <ChevronDown className="w-3 h-3" /></>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default function SeoResultsPage() {
    const router = useRouter();
    const params = useParams();
    const scanId = params?.scanId as string;
    const [scanData, setScanData] = useState<ScanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [copiedKeyword, setCopiedKeyword] = useState<string | null>(null);
    const [displayProgress, setDisplayProgress] = useState(5);
    const [currentMessage, setCurrentMessage] = useState(0);
    // Separate expansion state for each category
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

    // Rotating status messages
    const statusMessages = [
        'Analyzing website content',
        'Comparing SERP competitors',
        'Evaluating keyword opportunities',
        'Scoring domain health',
        'Preparing recommendations',
    ];

    // Animation effect for progress and messages
    useEffect(() => {
        const isLoading = loading || (scanData && (scanData.status === 'ENQUEUED' || scanData.status === 'SCANNING'));

        if (isLoading) {
            // Progress animation - smooth increment, slows near end
            const progressInterval = setInterval(() => {
                setDisplayProgress(prev => {
                    const realProgress = scanData?.progress || 0;
                    // Use real progress if available, otherwise animate
                    const target = realProgress > 0 ? Math.min(realProgress, 95) : Math.min(prev + 1.5, 90);
                    return target;
                });
            }, 1000);

            // Message rotation - every 4 seconds
            const messageInterval = setInterval(() => {
                setCurrentMessage(prev => (prev + 1) % 5);
            }, 4000);

            return () => {
                clearInterval(progressInterval);
                clearInterval(messageInterval);
            };
        }
    }, [loading, scanData]);

    useEffect(() => {
        const savedTheme = localStorage.getItem('results-theme') as 'dark' | 'light' | null;
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.setAttribute('data-theme', savedTheme);
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('results-theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
    };

    useEffect(() => {
        if (!scanId) return;

        const fetchScan = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/seo-scan/${scanId}`);
                setScanData(res.data);

                if (res.data.status === 'ENQUEUED' || res.data.status === 'SCANNING') {
                    setTimeout(fetchScan, 2000);
                } else {
                    setLoading(false);
                }
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load scan');
                setLoading(false);
            }
        };

        fetchScan();
    }, [scanId]);

    const handleKeywordCopy = (kw: string) => {
        setCopiedKeyword(kw);
        setTimeout(() => setCopiedKeyword(null), 2000);
    };

    // Loading state - Clean, minimal design
    if (loading || (scanData && (scanData.status === 'ENQUEUED' || scanData.status === 'SCANNING'))) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="w-full max-w-md text-center">
                    {/* Spinner */}
                    <div className="mb-8">
                        <div className="w-12 h-12 mx-auto border-3 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>

                    {/* Title */}
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        Analyzing your domain
                    </h2>

                    {/* Rotating message */}
                    <p className="text-[14px] text-muted-foreground mb-8 h-5">
                        {statusMessages[currentMessage]}...
                    </p>

                    {/* Progress bar */}
                    <div className="bg-card rounded-xl p-6 border border-border/40 mb-6">
                        <div className="flex justify-between text-[12px] text-muted-foreground mb-3">
                            <span>Progress</span>
                            <span>{Math.round(displayProgress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                                style={{ width: `${displayProgress}%` }}
                            />
                        </div>

                        {/* Current step indicator */}
                        {scanData?.currentStep && (
                            <p className="text-[11px] text-muted-foreground/70 mt-3">
                                {scanData.currentStep}
                            </p>
                        )}
                    </div>

                    {/* Reassurance */}
                    <p className="text-[12px] text-muted-foreground mb-1">
                        This usually takes 2–3 minutes
                    </p>
                    <p className="text-[11px] text-muted-foreground/60 mb-4">
                        You can safely leave — we'll save your results
                    </p>

                    <button
                        onClick={() => router.push('/')}
                        className="text-[12px] text-primary hover:underline"
                    >
                        ← Start a new scan
                    </button>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !scanData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <p className="text-sm text-destructive mb-4">{error || 'Scan not found'}</p>
                    <button onClick={() => router.push('/')} className="text-sm text-foreground hover:underline">
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    // Failed state
    if (scanData.status === 'FAILED') {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center px-6">
                <div className="text-center max-w-md">
                    <h2 className="text-xl font-semibold text-foreground mb-2">Scan Failed</h2>
                    <p className="text-sm text-destructive mb-4">{scanData.errorMessage || 'An error occurred'}</p>
                    <button onClick={() => router.push('/')} className="text-sm text-foreground hover:underline">
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const results = scanData.results;
    if (!results) return null;

    return (
        <div className="min-h-screen bg-background text-foreground">
            {/* Copy notification toast */}
            {copiedKeyword && (
                <div className="fixed bottom-6 right-6 z-50 bg-card border border-border/50 rounded-lg px-4 py-2.5 shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[13px] text-foreground">Copied: {copiedKeyword}</span>
                </div>
            )}

            {/* Header */}
            <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                        <div className="h-5 w-px bg-border/50" />
                        <div>
                            <h1 className="text-base font-semibold text-foreground">{results.domain}</h1>
                            <p className="text-xs text-muted-foreground">
                                Scanned {new Date(results.scanned_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={toggleTheme}
                        className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/40 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Health Score Card */}
                <div className="mb-8">
                    <div className="rounded-xl p-8 bg-card border border-border/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Domain Health Score</p>
                                <div className="flex items-baseline gap-3">
                                    <span className="text-5xl font-bold text-foreground">{results.health_score}</span>
                                    <span className="text-lg text-muted-foreground">/ 100</span>
                                </div>
                                {/* Score Interpretation */}
                                <p className="text-[13px] text-muted-foreground mt-3">
                                    {results.health_score >= 80
                                        ? "Excellent foundation — focus on content expansion"
                                        : results.health_score >= 60
                                            ? "Strong foundation — optimization needed to grow rankings"
                                            : results.health_score >= 40
                                                ? "Room for improvement — address technical issues first"
                                                : "Needs attention — significant optimization required"
                                    }
                                </p>
                            </div>

                            {/* Detailed Metrics Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full lg:w-auto mt-6 lg:mt-0">
                                {/* Technical */}
                                <div className="space-y-1 text-center lg:text-right">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Technical</p>
                                    <p className="text-2xl font-bold text-foreground">{results.score_breakdown?.technical || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                </div>
                                {/* On-Page SEO */}
                                <div className="space-y-1 text-center lg:text-right">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">On-Page SEO</p>
                                    <div className="flex items-center justify-center lg:justify-end gap-1.5">
                                        <Search className="w-3.5 h-3.5 text-blue-500" />
                                        <p className="text-2xl font-bold text-foreground">{results.score_breakdown?.on_page_seo || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                    </div>
                                </div>
                                {/* Authority */}
                                <div className="space-y-1 text-center lg:text-right">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Authority</p>
                                    <p className="text-2xl font-bold text-foreground">{results.score_breakdown?.authority || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                </div>
                                {/* Performance */}
                                <div className="space-y-1 text-center lg:text-right">
                                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Performance</p>
                                    <div className="flex items-center justify-center lg:justify-end gap-1.5">
                                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                                        <p className="text-2xl font-bold text-foreground">{results.score_breakdown?.performance || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Core Web Vitals (if available) */}
                        {results.lighthouse_metrics && (
                            <div className="mt-8 pt-6 border-t border-border/30">
                                <div className="flex items-center gap-2 mb-4">
                                    <Activity className="w-4 h-4 text-emerald-500" />
                                    <h3 className="text-sm font-medium text-foreground">Core Web Vitals (Real User Metrics)</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* LCP */}
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-border/30 relative group">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <p className="text-xs text-muted-foreground">LCP (Loading)</p>
                                            <div className="group/tooltip relative">
                                                <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                                                    Largest Contentful Paint. Measures loading performance. A good score is 2.5s or less.
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground">{results.lighthouse_metrics.core_web_vitals.lcp}</p>
                                    </div>
                                    {/* FCP */}
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <p className="text-xs text-muted-foreground">FCP (First Paint)</p>
                                            <div className="group/tooltip relative">
                                                <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                                                    First Contentful Paint. Measures time until first content appears. Good score is 1.8s or less.
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground">{results.lighthouse_metrics.core_web_vitals.fcp}</p>
                                    </div>
                                    {/* CLS */}
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <p className="text-xs text-muted-foreground">CLS (Stability)</p>
                                            <div className="group/tooltip relative">
                                                <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                                                    Cumulative Layout Shift. Measures visual stability and unexpected movement. Good score is 0.1 or less.
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-sm font-semibold text-foreground">{results.lighthouse_metrics.core_web_vitals.cls}</p>
                                    </div>
                                    {/* Mobile Friendly */}
                                    <div className="p-3 bg-secondary/30 rounded-lg border border-border/30">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <p className="text-xs text-muted-foreground">Mobile Friendly</p>
                                            <div className="group/tooltip relative">
                                                <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-slate-800 text-white text-[10px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none">
                                                    Indicates if the page passes Google's mobile-friendly usability checks.
                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <p className={`text-sm font-semibold ${results.lighthouse_metrics.mobile_optimized ? 'text-emerald-500' : 'text-red-500'}`}>
                                            {results.lighthouse_metrics.mobile_optimized ? 'Yes' : 'Needs Optimization'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* End Core Web Vitals */}

                    </div>
                </div>

                {/* Grid Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Observed Keywords - Show ALL */}
                    <div className="bg-card rounded-xl p-6 border border-border/30">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <h3 className="text-sm font-semibold text-foreground">Observed Keywords</h3>
                            <span className="text-[11px] text-muted-foreground ml-auto">{results.observed_keywords.length}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {results.observed_keywords.length > 0 ? (
                                results.observed_keywords.map((kw, i) => (
                                    <span key={i} className="text-[13px] px-3 py-1.5 rounded-md bg-secondary text-foreground border border-border/30">
                                        {kw.keyword}
                                    </span>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground">No keywords detected</p>
                            )}
                        </div>
                    </div>

                    {/* SERP Positions - Dynamic colors for 1/2/3 */}
                    <div className="bg-card rounded-xl border border-border/30 overflow-hidden">
                        <div className="px-6 py-4 border-b border-border/40">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <h3 className="text-sm font-semibold text-foreground">SERP Positions</h3>
                            </div>
                        </div>
                        <div className="bg-card">
                            {results.sampled_positions.length > 0 ? (
                                results.sampled_positions.map((pos, i) => {
                                    // Dynamic styling based on position
                                    const positionStyle = pos.position === 1
                                        ? 'text-amber-500 font-bold' // Gold
                                        : pos.position === 2
                                            ? 'text-slate-400 font-bold' // Silver
                                            : pos.position === 3
                                                ? 'text-orange-500 font-bold' // Bronze
                                                : 'text-emerald-500 font-semibold';

                                    return (
                                        <div key={i} className="flex items-center justify-between px-6 py-3 border-b border-border/30 last:border-0 hover:bg-secondary/50 transition-colors">
                                            <span className="text-[13px] text-foreground truncate max-w-[200px]">
                                                {pos.keyword}
                                            </span>
                                            <span className={`text-[12px] ${positionStyle}`}>
                                                #{pos.position}
                                            </span>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                                    <p className="text-[13px] text-muted-foreground">No top-10 rankings yet</p>
                                    <p className="text-[11px] text-muted-foreground/70 mt-1">
                                        Target the suggested long-tail keywords
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Competitors - 2-column grid layout */}
                    <div className="bg-card rounded-xl p-6 border border-border/30">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <h3 className="text-sm font-semibold text-foreground">SERP Competitors</h3>
                        </div>
                        <div className="space-y-4">
                            {results.serp_competitors.direct.length > 0 && (
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Direct Competitors</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        {results.serp_competitors.direct.map((comp, i) => (
                                            <a
                                                key={i}
                                                href={`https://${comp.domain}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[13px] text-foreground hover:underline flex items-center gap-1.5 py-1 truncate"
                                            >
                                                {comp.domain}
                                                <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {results.serp_competitors.content.length > 0 && (
                                <div>
                                    <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-2">Content Competitors</p>
                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                        {results.serp_competitors.content.map((comp, i) => (
                                            <a
                                                key={i}
                                                href={`https://${comp.domain}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[13px] text-foreground hover:underline flex items-center gap-1.5 py-1 truncate"
                                            >
                                                {comp.domain}
                                                <ExternalLink className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {results.serp_competitors.direct.length === 0 && results.serp_competitors.content.length === 0 && (
                                <p className="text-sm text-muted-foreground">No competitors identified</p>
                            )}
                        </div>
                    </div>

                    {/* Domain Age */}
                    <div className="bg-card rounded-xl p-6 border border-border/30">
                        <h3 className="text-sm font-semibold text-foreground mb-4">Domain Authority Signals</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Domain Age</p>
                                <p className="text-xl font-semibold text-foreground">
                                    {results.domain_age.years !== null ? `${results.domain_age.years} years` : 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Registrar</p>
                                <p className="text-sm text-foreground truncate">
                                    {results.domain_age.registrar || 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Created</p>
                                <p className="text-sm text-foreground">
                                    {results.domain_age.created ? new Date(results.domain_age.created).toLocaleDateString() : 'Unknown'}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wide mb-1">Expires</p>
                                <p className="text-sm text-foreground">
                                    {results.domain_age.expires ? new Date(results.domain_age.expires).toLocaleDateString() : 'Unknown'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div >

                {/* Strategic Keyword Opportunities - Enhanced */}
                {
                    results.suggested_keywords && results.suggested_keywords.length > 0 && (
                        <div className="mb-8">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold text-foreground">Strategic Keyword Opportunities</h2>
                                    <p className="text-[13px] text-muted-foreground mt-1">
                                        Prioritized keywords you can act on • Hover to copy or save
                                    </p>
                                </div>
                                <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                        Transactional
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-blue-400" />
                                        Informational
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-purple-400" />
                                        Niche
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {results.suggested_keywords.map((group) => (
                                    <KeywordCategoryCard
                                        key={group.category}
                                        category={group.category}
                                        keywords={group.keywords}
                                        onCopy={handleKeywordCopy}
                                        isExpanded={expandedCategories[group.category] || false}
                                        onToggleExpand={() => {
                                            setExpandedCategories(prev => ({
                                                ...prev,
                                                [group.category]: !prev[group.category]
                                            }));
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )
                }

                {/* Recommendations */}
                {
                    results.recommendations.length > 0 && (
                        <div className="bg-card rounded-xl p-6 border border-border/30">
                            <h3 className="text-sm font-semibold text-foreground mb-4">Strategic Recommendations</h3>
                            <div className="space-y-3">
                                {results.recommendations.map((rec, i) => (
                                    <div key={i} className="flex items-start gap-3 py-3 border-b border-border/20 last:border-0">
                                        <span className="w-5 h-5 rounded text-[11px] text-muted-foreground flex items-center justify-center font-medium shrink-0">
                                            {i + 1}.
                                        </span>
                                        <p className="text-[14px] text-foreground">{rec.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                }
            </main >
        </div >
    );
}
