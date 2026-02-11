'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Sun, Moon, ExternalLink, Copy, Plus, Star, ChevronDown, ChevronUp, Search, Zap, Activity, Info } from 'lucide-react';
import { api } from '@/utils/api';
import { QuickWinsSection, HighOpportunitiesSection, RegionalRankingsSection, DeviceComparisonSection } from '@/components/SerpFeatures';
import { KeywordClustersSection, ContentGapsSection, FeaturedSnippetSection, LocalSEOSection, CompetitorStrategySection, ContentQualitySection } from '@/components/AdvancedSerpFeatures';
import { CompetitorTrackingSection, ActionItemsSection, ContentRecommendationsSection, RankingHistorySection } from '@/components/AdvancedSeoFeatures';
import Navbar from '@/components/Navbar';
import { useTheme } from '@/contexts/ThemeContext';

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
    recommendations: Array<{ text: string; title?: string; impact?: string }>;
    suggested_keywords: Array<{ category: string; keywords: Array<{ word: string; intent: string }> }>;
    lighthouse_metrics?: {
        performance: { score: number; label: string; color: string };
        seo: { score: number; label: string; color: string };
        accessibility: { score: number; label: string; color: string };
        core_web_vitals: { lcp: string; fcp: string; cls: string | number };
        mobile_optimized: boolean;
    };
    visibility_percentage?: number;
    entity_verification?: {
        recognized: boolean;
        name?: string;
        types?: string[];
        score?: number;
        description?: string;
    };
    content_salience?: Array<{
        entity: string;
        type: string;
        weight: number;
        label: string;
    }>;
    // New SERP features
    quick_wins?: Array<{
        keyword: string;
        score: number;
        priority: string;
        current_position: number | null;
        difficulty: string;
        recommendation: string;
    }>;
    high_opportunity_keywords?: Array<{
        keyword: string;
        opportunity_score: number;
        total_opportunities: number;
        opportunities: Array<{
            type: string;
            description: string;
            action?: string;
        }>;
        current_position: number | null;
    }>;
    regional_analysis?: {
        keyword: string;
        locations: Array<{
            location: string;
            position: number | null;
        }>;
        analysis: {
            avg_position: number | null;
            best_location: string;
            best_position: number;
            worst_location: string;
            worst_position: number;
            ranking_in: number;
            not_ranking_in: number;
        };
    } | null;
    device_comparison?: {
        keyword: string;
        desktop: { position: number | null };
        mobile: { position: number | null };
        difference: number;
        analysis: string;
        recommendation: string;
    } | null;
    // V2 Advanced Features
    keyword_clusters?: Array<{
        name: string;
        keywords: string[];
        priority: string;
        action: string;
    }>;
    content_gaps?: Array<{
        topic: string;
        competitors: string[];
        opportunity: string;
        action: string;
    }>;
    featured_snippet_opportunities?: Array<{
        keyword: string;
        owner: string;
        format: string;
        recommendation: string;
    }>;
    local_seo_insights?: {
        has_local_intent: boolean;
        recommendations: string[];
    } | null;
    competitor_strategy?: {
        patterns: string[];
        strengths: string[];
        weaknesses: string[];
    } | null;
    content_quality_score?: {
        score: number;
        improvements: string[];
    } | null;
    // Advanced Features
    tracked_competitors?: Array<{
        domain: string;
        appearances: number;
        avg_position: number;
        keywords_ranking_for: string[];
        serp_features_owned: {
            featured_snippets?: number;
            paa?: number;
            local_pack?: number;
            shopping?: number;
        };
    }>;
    action_items?: Array<{
        id: string;
        title: string;
        description: string;
        priority: number;
        impact: 'High' | 'Medium' | 'Low';
        effort: 'High' | 'Medium' | 'Low';
        timeline: string;
        category: string;
        status: 'pending' | 'in_progress' | 'completed' | 'skipped';
    }>;
    content_recommendations?: Array<{
        id: string;
        topic: string;
        keyword: string;
        search_intent: string;
        difficulty: string;
        opportunity_score: number;
        estimated_traffic: number;
        competitors_ranking: string[];
        reason: string;
    }>;
    ranking_history?: Array<{
        keyword: string;
        history: Array<{
            date: string;
            position: number | null;
            has_featured_snippet: boolean;
        }>;
    }>;
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
    keywords: Array<{ word: string; intent: string }>;
    onCopy: (kw: string) => void;
    isExpanded: boolean;
    onToggleExpand: () => void;
}) => {
    const [copied, setCopied] = useState<string | null>(null);
    const { theme } = useTheme();

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
        <div className="rounded-xl border overflow-hidden h-full flex flex-col" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
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
            <div className="flex-1" style={{ background: theme === 'light' ? '#FFFEF9' : 'transparent' }}>
                {displayedKeywords.map((kwObj, idx) => (
                    <div
                        key={`${category}-${idx}`}
                        className="group flex flex-col px-5 py-3 border-b border-border/30 last:border-0 transition-all cursor-pointer"
                        style={{
                            transition: 'all 0.2s ease',
                            background: theme === 'light' ? '#FFFEF9' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                            if (theme === 'light') {
                                e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                            } else {
                                e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                            }
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = theme === 'light' ? '#FFFEF9' : 'transparent';
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] font-medium text-foreground truncate max-w-[80%]">
                                {kwObj.word}
                            </span>
                            <button
                                onClick={() => copyKeyword(kwObj.word)}
                                className="p-1.5 rounded opacity-0 group-hover:opacity-100 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
                            >
                                <Copy className={`w-3.5 h-3.5 ${copied === kwObj.word ? 'text-emerald-500' : ''}`} />
                            </button>
                        </div>
                        {kwObj.intent && (
                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
                                {kwObj.intent}
                            </span>
                        )}
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
    const { theme } = useTheme();
    const scanId = params?.scanId as string;
    const [scanData, setScanData] = useState<ScanData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
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
        if (!scanId) return;

        const fetchScan = async () => {
            try {
                const res = await api.get(`/api/seo-scan/${scanId}`);
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

    // Loading state - Clean, minimal design matching Figma
    if (loading || (scanData && (scanData.status === 'ENQUEUED' || scanData.status === 'SCANNING'))) {
        return (
            <div 
                className="min-h-screen transition-colors duration-300 relative overflow-hidden" 
                style={{ 
                    background: theme === 'dark' ? '#000000' : '#FFFEF9',
                    color: theme === 'dark' ? '#ffffff' : '#000000'
                }}
            >
                {/* Dark mode golden blur from right toward center */}
                {theme === 'dark' && (
                    <div 
                        className="absolute pointer-events-none z-0"
                        style={{
                            top: '35%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '60%',
                            height: '55%',
                            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255, 192, 4, 0.15) 0%, rgba(255, 192, 4, 0.08) 40%, transparent 70%)',
                            filter: 'blur(80px)'
                        }}
                    />
                )}
                
                {/* Light mode golden blur at bottom */}
                {theme === 'light' && (
                    <div 
                        className="absolute bottom-0 left-0 right-0 pointer-events-none"
                        style={{
                            height: '50%',
                            background: 'radial-gradient(ellipse 120% 100% at 50% 100%, rgba(255, 192, 4, 0.12) 0%, rgba(255, 192, 4, 0.06) 50%, transparent 100%)',
                            filter: 'blur(60px)'
                        }}
                    />
                )}
                
                {/* Navbar */}
                <Navbar />

                {/* Content */}
                <div className="flex items-center justify-center px-6 relative z-10" style={{ minHeight: 'calc(100vh - 73px)' }}>
                    <div className="w-full max-w-md text-center">
                        {/* Title - Montserrat SemiBold 36px */}
                        <h2 
                            className="font-semibold mb-2" 
                            style={{ 
                                fontSize: '36px', 
                                lineHeight: '1.2',
                                color: theme === 'dark' ? '#FFFFFF' : '#000000'
                            }}
                        >
                            Analyzing your domain
                        </h2>

                        {/* Rotating message - Regular 20px */}
                        <p 
                            className="mb-8" 
                            style={{ 
                                fontSize: '20px', 
                                lineHeight: '1.4',
                                color: theme === 'dark' ? '#888888' : '#000000'
                            }}
                        >
                            {statusMessages[currentMessage]}
                        </p>

                        {/* Progress bar with percentage inside on the right */}
                        <div className="mb-8">
                            <div className="relative w-full max-w-sm mx-auto">
                                {/* Progress bar container with transparent background and border */}
                                <div className="relative h-10 bg-transparent rounded-full border-2 border-[#FFC004] overflow-hidden">
                                    {/* Progress fill - gradient from #A88000 to #FFC004 */}
                                    <div
                                        className="h-full transition-all duration-700 ease-out"
                                        style={{ 
                                            width: `${displayProgress}%`,
                                            background: 'linear-gradient(90deg, #A88000 0%, #FFC004 100%)'
                                        }}
                                    />
                                </div>
                                
                                {/* Percentage text inside on the right */}
                                <div className="absolute inset-0 flex items-center justify-end pr-5">
                                    <span 
                                        className="font-semibold z-10" 
                                        style={{ 
                                            fontSize: '20px',
                                            color: theme === 'dark' ? '#FFFFFF' : '#000000'
                                        }}
                                    >
                                        {Math.round(displayProgress)} %
                                    </span>
                                </div>
                            </div>

                            {/* Current step indicator */}
                            {scanData?.currentStep && (
                                <p 
                                    className="mt-3" 
                                    style={{ 
                                        fontSize: '12px',
                                        color: theme === 'dark' ? '#888888' : '#000000'
                                    }}
                                >
                                    {scanData.currentStep}
                                </p>
                            )}
                        </div>

                        {/* Reassurance - Regular 20px */}
                        <p 
                            className="mb-1" 
                            style={{ 
                                fontSize: '20px', 
                                lineHeight: '1.4',
                                color: theme === 'dark' ? '#888888' : '#000000'
                            }}
                        >
                            This usually takes 2–3 minutes
                        </p>
                        <p 
                            className="mb-6" 
                            style={{ 
                                fontSize: '16px', 
                                lineHeight: '1.4',
                                color: theme === 'dark' ? 'rgba(136, 136, 136, 0.7)' : '#000000'
                            }}
                        >
                            You can safely leave — we'll save your results
                        </p>

                        {/* Start new scan button - Regular 20px */}
                        <button
                            onClick={() => router.push('/')}
                            className="text-[#FFC004] hover:text-[#FFC004]/80 transition-colors inline-flex items-center gap-1"
                            style={{ fontSize: '20px' }}
                        >
                            <span>←</span> Start a new scan
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !scanData) {
        return (
            <div 
                className="min-h-screen flex items-center justify-center px-6"
                style={{ 
                    background: theme === 'dark' 
                        ? 'radial-gradient(ellipse 120% 80% at 50% 20%, #3d2f1a 0%, #2a2015 20%, #1a1510 40%, #0f0d0a 60%, #000000 100%)'
                        : '#FFFEF9',
                    color: theme === 'dark' ? '#ffffff' : '#000000'
                }}
            >
                <div className="text-center max-w-md">
                    <p className="text-sm text-destructive mb-4">{error || 'Scan not found'}</p>
                    <button onClick={() => router.push('/')} className="text-sm hover:underline" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                        Go back
                    </button>
                </div>
            </div>
        );
    }

    // Failed state
    if (scanData.status === 'FAILED') {
        return (
            <div 
                className="min-h-screen flex items-center justify-center px-6"
                style={{ 
                    background: theme === 'dark' 
                        ? 'radial-gradient(ellipse 120% 80% at 50% 20%, #3d2f1a 0%, #2a2015 20%, #1a1510 40%, #0f0d0a 60%, #000000 100%)'
                        : '#FFFEF9',
                    color: theme === 'dark' ? '#ffffff' : '#000000'
                }}
            >
                <div className="text-center max-w-md">
                    <h2 className="text-xl font-semibold mb-2">Scan Failed</h2>
                    <p className="text-sm text-destructive mb-4">{scanData.errorMessage || 'An error occurred'}</p>
                    <button onClick={() => router.push('/')} className="text-sm hover:underline" style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}>
                        Try again
                    </button>
                </div>
            </div>
        );
    }

    const results = scanData.results;
    if (!results) return null;

    return (
        <div 
            className="min-h-screen text-foreground transition-colors duration-300 relative overflow-hidden"
            style={{ 
                background: theme === 'dark' ? '#000000' : '#FFFEF9',
                color: theme === 'dark' ? '#ffffff' : '#000000'
            }}
        >
            {/* Dark mode golden blur from right toward center */}
            {theme === 'dark' && (
                <div 
                    className="absolute pointer-events-none z-0"
                    style={{
                        top: '35%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '60%',
                        height: '55%',
                        background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255, 192, 4, 0.15) 0%, rgba(255, 192, 4, 0.08) 40%, transparent 70%)',
                        filter: 'blur(80px)'
                    }}
                />
            )}
            
            {/* Light mode golden blur - diagonal from top-left to bottom-right */}
            {theme === 'light' && (
                <div 
                    className="absolute pointer-events-none z-0"
                    style={{
                        top: '0',
                        left: '0',
                        right: '0',
                        bottom: '0',
                        background: 'linear-gradient(to bottom right, transparent 0%, transparent 25%, rgba(171, 128, 0, 0.08) 40%, rgba(171, 128, 0, 0.12) 50%, rgba(171, 128, 0, 0.08) 60%, transparent 75%, transparent 100%)',
                        filter: 'blur(350px)'
                    }}
                />
            )}
            
            {/* Copy notification toast */}
            {copiedKeyword && (
                <div className="fixed bottom-6 right-6 z-50 bg-card border border-border/50 rounded-lg px-4 py-2.5 shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-2">
                    <Copy className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[13px] text-foreground">Copied: {copiedKeyword}</span>
                </div>
            )}

            {/* Navbar */}
            <Navbar />

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
                {/* Domain Name Header */}
                <div className="mb-6">
                    <h1 className="text-4xl font-bold text-foreground">{results.domain}</h1>
                </div>

                {/* Health Score Card */}
                <div className="mb-8">
                    <div className="rounded-xl p-8" style={{
                        background: 'transparent'
                    }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">Domain Health Score</p>
                                <div className="flex items-baseline gap-3 mb-3">
                                    <span className="text-5xl font-bold" style={{ color: '#FFC004' }}>{results.health_score}</span>
                                    <span className="text-lg text-muted-foreground">/ 100</span>
                                </div>
                                
                                {/* Progress Bar */}
                                <div className="w-64 mb-3">
                                    <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#5E4702' }}>
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${results.health_score}%`,
                                                background: 'linear-gradient(90deg, #A88000 0%, #FFC004 100%)',
                                                borderRadius: '9999px'
                                            }}
                                        />
                                    </div>
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

                            {/* Visibility Percentage - Premium Circular Metric */}
                            <div className="hidden md:flex flex-col items-center justify-center p-6 group relative">
                                <div className="relative w-24 h-24 mb-2">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            className="text-muted/10"
                                        />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="8"
                                            fill="transparent"
                                            strokeDasharray={251.2}
                                            strokeDashoffset={251.2 - (251.2 * (results.visibility_percentage || 0)) / 100}
                                            className="text-primary transition-all duration-1000 ease-out"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-xl font-bold" style={{ color: '#FFC004' }}>{results.visibility_percentage || 0}%</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>Visibility</p>
                                    <Info className="w-3 h-3 text-primary/50 cursor-help" />
                                </div>
                                {/* Tooltip */}
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                    Percentage of checked keywords where your site ranks in top 100. Higher visibility = more keywords ranking.
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                </div>
                            </div>

                            {/* Detailed Metrics Grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 w-full lg:w-auto mt-6 lg:mt-0">
                                {/* Technical */}
                                <div className="space-y-1 text-center lg:text-right group relative">
                                    <div className="flex items-center justify-center lg:justify-end gap-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Technical</p>
                                        <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: '#FFC004' }}>{results.score_breakdown?.technical || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                        HTTPS, robots.txt, sitemap, mobile-friendly, page speed, and crawlability
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                                {/* On-Page SEO */}
                                <div className="space-y-1 text-center lg:text-right group relative">
                                    <div className="flex items-center justify-center lg:justify-end gap-1.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">On-Page SEO</p>
                                        <Search className="w-3.5 h-3.5 text-blue-500" />
                                        <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: '#FFC004' }}>{results.score_breakdown?.on_page_seo || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                        Title tags, meta descriptions, headings, content quality, keyword usage, and internal linking
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                                {/* Authority */}
                                <div className="space-y-1 text-center lg:text-right group relative">
                                    <div className="flex items-center justify-center lg:justify-end gap-1">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Authority</p>
                                        <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: '#FFC004' }}>{results.score_breakdown?.authority || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                        Domain age, Knowledge Graph recognition, brand authority, and backlink profile
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                    </div>
                                </div>
                                {/* Performance */}
                                <div className="space-y-1 text-center lg:text-right group relative">
                                    <div className="flex items-center justify-center lg:justify-end gap-1.5">
                                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Performance</p>
                                        <Zap className="w-3.5 h-3.5 text-amber-500" />
                                        <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                                    </div>
                                    <p className="text-2xl font-bold" style={{ color: '#FFC004' }}>{results.score_breakdown?.performance || 0}<span className="text-xs text-muted-foreground font-normal">/25</span></p>
                                    {/* Tooltip */}
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-3 bg-slate-800 text-white text-[11px] leading-relaxed rounded-md shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                                        Page load speed, Core Web Vitals (LCP, FCP, CLS), and overall site performance
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
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
                    <div className="rounded-xl p-6 border" style={{
                        background: 'transparent',
                        borderColor: '#FFC004'
                    }}>
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
                    <div className="rounded-xl border overflow-hidden" style={{
                        background: 'transparent',
                        borderColor: '#FFC004'
                    }}>
                        <div className="px-6 py-4 border-b border-border/40">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                <h3 className="text-sm font-semibold text-foreground">SERP Positions</h3>
                            </div>
                        </div>
                        <div style={{ background: 'transparent' }}>
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
                    <div className="rounded-xl p-6 border" style={{
                        background: 'transparent',
                        borderColor: '#FFC004'
                    }}>
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
                    <div className="rounded-xl p-6 border" style={{
                        background: 'transparent',
                        borderColor: '#FFC004'
                    }}>
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

                    {/* SCIENTIFIC EXTRACTIONS - Power Data */}
                    <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                        {/* Entity Verification */}
                        <div className="rounded-xl border overflow-hidden" style={{
                            background: 'transparent',
                            borderColor: '#FFC004'
                        }}>
                            <div className="px-6 py-4 border-b border-border/40 bg-primary/5">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-foreground">Google Entity Verification</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                {results.entity_verification?.recognized ? (
                                    <div className="space-y-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="text-lg font-bold text-foreground">{results.entity_verification.name}</h4>
                                                <p className="text-xs text-primary font-medium">{results.entity_verification.types?.join(' • ')}</p>
                                            </div>
                                            <div className="bg-emerald-500/10 text-emerald-500 text-[10px] font-bold py-1 px-2 rounded-full border border-emerald-500/20">
                                                VERIFIED ENTITY
                                            </div>
                                        </div>
                                        <p className="text-[13px] text-muted-foreground leading-relaxed">
                                            {results.entity_verification.description}
                                        </p>
                                        <div className="flex items-center gap-4 pt-2">
                                            <div className="text-center">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Authority Score</p>
                                                <p className="text-lg font-bold text-foreground">{(results.entity_verification.score || 0).toFixed(1)}</p>
                                            </div>
                                            <div className="h-8 w-px bg-border/40" />
                                            <div className="text-center">
                                                <p className="text-[10px] text-muted-foreground uppercase font-bold">Source</p>
                                                <p className="text-[13px] font-medium text-foreground">Knowledge Graph</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                                            <Search className="w-5 h-5 text-muted-foreground/50" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">No Entity Match</p>
                                        <p className="text-[12px] text-muted-foreground mt-1 px-4">Brand not yet recognized as a distinct entity in Google's Knowledge Graph.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Content Salience (NLP) */}
                        <div className="rounded-xl border overflow-hidden" style={{
                            background: 'transparent',
                            borderColor: '#FFC004'
                        }}>
                            <div className="px-6 py-4 border-b border-border/40 bg-primary/5">
                                <div className="flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-primary" />
                                    <h3 className="text-sm font-semibold text-foreground">Content Salience Analysis</h3>
                                </div>
                            </div>
                            <div className="p-6">
                                {results.content_salience && results.content_salience.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-[11px] text-muted-foreground uppercase tracking-widest mb-4">Prime Topics Detected (Scientific Extraction)</p>
                                        {results.content_salience.slice(0, 5).map((entity, i) => (
                                            <div key={i} className="space-y-1.5">
                                                <div className="flex items-center justify-between text-[12px]">
                                                    <span className="font-semibold text-foreground">{entity.entity}</span>
                                                    <span className="text-muted-foreground">{(entity.weight * 100).toFixed(1)}% weight</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-primary rounded-full"
                                                        style={{ width: `${entity.weight * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-3">
                                            <Zap className="w-5 h-5 text-muted-foreground/50" />
                                        </div>
                                        <p className="text-sm font-medium text-foreground">NLP Analysis Pending</p>
                                        <p className="text-[12px] text-muted-foreground mt-1 px-4">Content volume too low for high-confidence salience extraction.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div >

                {/* New SERP Intelligence Sections */}
                {results.quick_wins && results.quick_wins.length > 0 && (
                    <QuickWinsSection quickWins={results.quick_wins} />
                )}

                {results.high_opportunity_keywords && results.high_opportunity_keywords.length > 0 && (
                    <HighOpportunitiesSection opportunities={results.high_opportunity_keywords} />
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {results.regional_analysis && (
                        <RegionalRankingsSection regional={results.regional_analysis} />
                    )}

                    {results.device_comparison && (
                        <DeviceComparisonSection device={results.device_comparison} />
                    )}
                </div>

                {/* V2 Advanced Features */}
                {results.keyword_clusters && results.keyword_clusters.length > 0 && (
                    <KeywordClustersSection clusters={results.keyword_clusters} />
                )}

                {results.content_gaps && results.content_gaps.length > 0 && (
                    <ContentGapsSection gaps={results.content_gaps} />
                )}

                {results.featured_snippet_opportunities && results.featured_snippet_opportunities.length > 0 && (
                    <FeaturedSnippetSection opportunities={results.featured_snippet_opportunities} />
                )}

                {results.local_seo_insights && (
                    <LocalSEOSection localSeo={results.local_seo_insights} />
                )}

                {results.competitor_strategy && (
                    <CompetitorStrategySection strategy={results.competitor_strategy} />
                )}

                {results.content_quality_score && (
                    <ContentQualitySection quality={results.content_quality_score} />
                )}

                {/* ADVANCED SEO FEATURES - NEW */}
                
                {/* Competitor Tracking */}
                {results.tracked_competitors && results.tracked_competitors.length > 0 && (
                    <CompetitorTrackingSection competitors={results.tracked_competitors} />
                )}

                {/* Action Items */}
                {results.action_items && results.action_items.length > 0 && (
                    <ActionItemsSection items={results.action_items} />
                )}

                {/* Content Recommendations */}
                {results.content_recommendations && results.content_recommendations.length > 0 && (
                    <ContentRecommendationsSection recommendations={results.content_recommendations} />
                )}

                {/* Ranking History */}
                {results.ranking_history && results.ranking_history.length > 0 && (
                    <RankingHistorySection history={results.ranking_history} />
                )}

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
                {results.recommendations && results.recommendations.length > 0 && (
                    <div className="rounded-xl p-8 border mb-12" style={{
                        background: 'transparent',
                        borderColor: '#FFC004'
                    }}>
                        <h3 className="text-base font-semibold text-foreground mb-6 flex items-center gap-2">
                            <Activity className="w-4 h-4 text-primary" />
                            Strategic Action Plan
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {results.recommendations.map((rec, i) => (
                                <div 
                                    key={i} 
                                    className="flex flex-col p-5 rounded-xl border border-border/20 transition-all group cursor-pointer"
                                    style={{
                                        background: 'transparent',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (theme === 'light') {
                                            e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 192, 4, 0.5)';
                                        } else {
                                            e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                                            e.currentTarget.style.borderColor = 'rgba(255, 192, 4, 0.5)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-primary/10 px-2 py-0.5 rounded">
                                            Task 0{i + 1}
                                        </span>
                                        {rec.impact && (
                                            <span className={`text-[10px] font-bold uppercase py-0.5 px-2 rounded ${rec.impact.toLowerCase().includes('high') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                                {rec.impact} Impact
                                            </span>
                                        )}
                                    </div>
                                    {rec.title && (
                                        <h4 className="text-[15px] font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                            {rec.title}
                                        </h4>
                                    )}
                                    <p className="text-[13px] text-muted-foreground leading-relaxed">
                                        {rec.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main >
        </div >
    );
}
