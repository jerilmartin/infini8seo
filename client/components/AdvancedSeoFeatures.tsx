'use client';

import { useState } from 'react';
import { TrendingUp, Target, Lightbulb, Users, Clock, CheckCircle2, Circle, ArrowRight, ExternalLink, Copy, ChevronDown, ChevronUp, Star, Zap, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

// ============================================================================
// 1. COMPETITOR TRACKING COMPONENT
// ============================================================================
interface CompetitorData {
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
}

export function CompetitorTrackingSection({ competitors }: { competitors: CompetitorData[] }) {
    const [expanded, setExpanded] = useState<string | null>(null);
    const { theme } = useTheme();

    return (
        <div className="mb-8">
            <div className="rounded-xl border overflow-hidden" style={{
                background: 'transparent',
                borderColor: '#FFC004'
            }}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-border/40 bg-gradient-to-r from-purple-500/5 to-pink-500/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="w-5 h-5 text-purple-500" />
                                <h2 className="text-lg font-semibold text-foreground">Competitor Intelligence</h2>
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                Track top {competitors.length} competitors across your keyword landscape
                            </p>
                        </div>
                        <div className="bg-purple-500/10 text-purple-500 text-xs font-bold py-1.5 px-3 rounded-full border border-purple-500/20">
                            {competitors.length} TRACKED
                        </div>
                    </div>
                </div>

                {/* Competitors List */}
                <div className="divide-y divide-border/30">
                    {competitors.map((comp, idx) => (
                        <div 
                            key={comp.domain} 
                            className="p-6 transition-all cursor-pointer"
                            style={{
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (theme === 'light') {
                                    e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                                } else {
                                    e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <span className="text-xs font-bold text-muted-foreground">#{idx + 1}</span>
                                        <a
                                            href={`https://${comp.domain}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-base font-semibold text-foreground hover:text-primary flex items-center gap-2 group"
                                        >
                                            {comp.domain}
                                            <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </a>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm">
                                        <span className="text-muted-foreground">
                                            <span className="font-semibold text-foreground">{comp.appearances}</span> keyword appearances
                                        </span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="text-muted-foreground">
                                            Avg position: <span className="font-semibold text-emerald-500">#{comp.avg_position.toFixed(1)}</span>
                                        </span>
                                    </div>
                                </div>

                                {/* SERP Features Badges */}
                                <div className="flex flex-wrap gap-2 justify-end">
                                    {comp.serp_features_owned.featured_snippets && comp.serp_features_owned.featured_snippets > 0 && (
                                        <div className="bg-amber-500/10 text-amber-600 text-xs font-medium py-1 px-2.5 rounded-full border border-amber-500/20">
                                            {comp.serp_features_owned.featured_snippets} Snippets
                                        </div>
                                    )}
                                    {comp.serp_features_owned.paa && comp.serp_features_owned.paa > 0 && (
                                        <div className="bg-amber-500/10 text-amber-600 text-xs font-medium py-1 px-2.5 rounded-full border border-amber-500/20">
                                            {comp.serp_features_owned.paa} PAA
                                        </div>
                                    )}
                                    {comp.serp_features_owned.local_pack && comp.serp_features_owned.local_pack > 0 && (
                                        <div className="bg-green-500/10 text-green-600 text-xs font-medium py-1 px-2.5 rounded-full border border-green-500/20">
                                            Local Pack
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Expandable Keywords */}
                            {comp.keywords_ranking_for.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => setExpanded(expanded === comp.domain ? null : comp.domain)}
                                        className="text-xs font-medium text-primary hover:underline flex items-center gap-1"
                                    >
                                        {expanded === comp.domain ? (
                                            <>Hide keywords <ChevronUp className="w-3 h-3" /></>
                                        ) : (
                                            <>Show {comp.keywords_ranking_for.length} keywords <ChevronDown className="w-3 h-3" /></>
                                        )}
                                    </button>
                                    {expanded === comp.domain && (
                                        <div className="mt-3 flex flex-wrap gap-2">
                                            {comp.keywords_ranking_for.slice(0, 15).map((kw, i) => (
                                                <span
                                                    key={i}
                                                    className="text-xs px-2.5 py-1 rounded-md bg-secondary border border-border/30 text-foreground"
                                                >
                                                    {kw}
                                                </span>
                                            ))}
                                            {comp.keywords_ranking_for.length > 15 && (
                                                <span className="text-xs text-muted-foreground py-1">
                                                    +{comp.keywords_ranking_for.length - 15} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 2. ACTION ITEMS COMPONENT
// ============================================================================
interface ActionItem {
    id: string;
    title: string;
    description: string;
    priority: number;
    impact: 'High' | 'Medium' | 'Low';
    effort: 'High' | 'Medium' | 'Low';
    timeline: string;
    category: string;
    status: 'pending' | 'in_progress' | 'completed' | 'skipped';
}

export function ActionItemsSection({ items }: { items: ActionItem[] }) {
    const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const { theme } = useTheme();

    const filteredItems = items.filter(item => {
        if (filter === 'all') return true;
        return item.status === filter;
    });

    const getImpactColor = (impact: string) => {
        if (impact === 'High') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (impact === 'Medium') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    };

    const getEffortColor = (effort: string) => {
        if (effort === 'Low') return 'text-emerald-500';
        if (effort === 'Medium') return 'text-amber-500';
        return 'text-red-500';
    };

    return (
        <div className="mb-8">
            <div className="rounded-xl border overflow-hidden" style={{
                background: 'transparent',
                borderColor: '#FFC004'
            }}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-border/40 bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="w-5 h-5 text-emerald-500" />
                                <h2 className="text-lg font-semibold text-foreground">Prioritized Action Items</h2>
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                Strategic tasks ranked by impact and effort
                            </p>
                        </div>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilter('all')}
                            className="text-xs font-medium py-1.5 px-3 rounded-full transition-all"
                            style={filter === 'all' ? (theme === 'light' ? {
                                background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                                color: '#000000'
                            } : {
                                background: '#241A06',
                                color: '#FFFFFF'
                            }) : {
                                background: 'transparent',
                                color: theme === 'light' ? '#000000' : '#888888'
                            }}
                        >
                            All ({items.length})
                        </button>
                        <button
                            onClick={() => setFilter('pending')}
                            className="text-xs font-medium py-1.5 px-3 rounded-full transition-all"
                            style={filter === 'pending' ? (theme === 'light' ? {
                                background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                                color: '#000000'
                            } : {
                                background: '#241A06',
                                color: '#FFFFFF'
                            }) : {
                                background: 'transparent',
                                color: theme === 'light' ? '#000000' : '#888888'
                            }}
                        >
                            Pending ({items.filter(i => i.status === 'pending').length})
                        </button>
                        <button
                            onClick={() => setFilter('completed')}
                            className="text-xs font-medium py-1.5 px-3 rounded-full transition-all"
                            style={filter === 'completed' ? (theme === 'light' ? {
                                background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                                color: '#000000'
                            } : {
                                background: '#241A06',
                                color: '#FFFFFF'
                            }) : {
                                background: 'transparent',
                                color: theme === 'light' ? '#000000' : '#888888'
                            }}
                        >
                            Completed ({items.filter(i => i.status === 'completed').length})
                        </button>
                    </div>
                </div>

                {/* Action Items List */}
                <div className="divide-y divide-border/30">
                    {filteredItems.map((item, idx) => (
                        <div 
                            key={item.id} 
                            className="p-6 transition-all group cursor-pointer"
                            style={{
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                                if (theme === 'light') {
                                    e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                                } else {
                                    e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent';
                            }}
                        >
                            <div className="flex items-start gap-4">
                                {/* Priority Badge */}
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                    <span className="text-xs font-bold text-primary">{item.priority}</span>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                            {item.title}
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold py-1 px-2.5 rounded-full border ${getImpactColor(item.impact)}`}>
                                                {item.impact} Impact
                                            </span>
                                        </div>
                                    </div>

                                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                                        {item.description}
                                    </p>

                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Zap className={`w-3.5 h-3.5 ${getEffortColor(item.effort)}`} />
                                            {item.effort} Effort
                                        </span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5" />
                                            {item.timeline}
                                        </span>
                                        <span>•</span>
                                        <span className="bg-secondary px-2 py-0.5 rounded text-foreground">
                                            {item.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Icon */}
                                <div className="flex-shrink-0">
                                    {item.status === 'completed' ? (
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground/30" />
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 3. CONTENT RECOMMENDATIONS COMPONENT
// ============================================================================
interface ContentRecommendation {
    id: string;
    topic: string;
    keyword: string;
    search_intent: string;
    difficulty: string;
    opportunity_score: number;
    estimated_traffic: number;
    competitors_ranking: string[];
    reason: string;
}

export function ContentRecommendationsSection({ recommendations }: { recommendations: ContentRecommendation[] }) {
    const [copied, setCopied] = useState<string | null>(null);
    const { theme } = useTheme();

    const copyTopic = async (topic: string) => {
        await navigator.clipboard.writeText(topic);
        setCopied(topic);
        setTimeout(() => setCopied(null), 2000);
    };

    const getDifficultyColor = (difficulty: string) => {
        if (difficulty === 'Easy') return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        if (difficulty === 'Medium') return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        if (difficulty === 'Hard') return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
        return 'text-red-500 bg-red-500/10 border-red-500/20';
    };

    const getIntentIcon = (intent: string) => {
        if (intent === 'transactional') return '💰';
        if (intent === 'informational') return '📚';
        return '🔍';
    };

    return (
        <div className="mb-8">
            <div className="rounded-xl border overflow-hidden" style={{
                background: 'transparent',
                borderColor: '#FFC004'
            }}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-border/40 bg-gradient-to-r from-blue-500/5 to-cyan-500/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Lightbulb className="w-5 h-5 text-amber-500" />
                                <h2 className="text-lg font-semibold text-foreground">Content Recommendations</h2>
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                Blog topics to close content gaps and capture new rankings
                            </p>
                        </div>
                        <div className="bg-amber-500/10 text-amber-600 text-xs font-bold py-1.5 px-3 rounded-full border border-amber-500/20">
                            {recommendations.length} TOPICS
                        </div>
                    </div>
                </div>

                {/* Recommendations Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                    {recommendations.map((rec) => (
                        <div
                            key={rec.id}
                            className="p-5 rounded-xl border border-border/30 transition-all group cursor-pointer"
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
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{getIntentIcon(rec.search_intent)}</span>
                                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                            {rec.search_intent}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors leading-snug">
                                        {rec.topic}
                                    </h3>
                                </div>
                                <button
                                    onClick={() => copyTopic(rec.topic)}
                                    className="p-2 rounded-lg hover:bg-secondary transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Copy className={`w-4 h-4 ${copied === rec.topic ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                                </button>
                            </div>

                            {/* Keyword */}
                            <div className="mb-3">
                                <span className="text-xs text-muted-foreground">Target keyword:</span>
                                <p className="text-sm font-medium text-foreground mt-0.5">{rec.keyword}</p>
                            </div>

                            {/* Metrics */}
                            <div className="flex items-center gap-3 mb-3">
                                <span className={`text-xs font-bold py-1 px-2.5 rounded-full border ${getDifficultyColor(rec.difficulty)}`}>
                                    {rec.difficulty}
                                </span>
                                <div className="flex items-center gap-1">
                                    <Star className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-xs font-semibold text-foreground">{rec.opportunity_score}/100</span>
                                </div>
                                {rec.estimated_traffic > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        ~{rec.estimated_traffic.toLocaleString()} searches/mo
                                    </span>
                                )}
                            </div>

                            {/* Reason */}
                            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                                {rec.reason}
                            </p>

                            {/* Competitors */}
                            {rec.competitors_ranking.length > 0 && (
                                <div className="pt-3 border-t border-border/30">
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Competitors ranking: {rec.competitors_ranking.slice(0, 3).join(', ')}
                                        {rec.competitors_ranking.length > 3 && ` +${rec.competitors_ranking.length - 3} more`}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// 4. RANKING HISTORY COMPONENT
// ============================================================================
interface RankingHistoryData {
    keyword: string;
    history: Array<{
        date: string;
        position: number | null;
        has_featured_snippet: boolean;
    }>;
}

export function RankingHistorySection({ history }: { history: RankingHistoryData[] }) {
    const [selectedKeyword, setSelectedKeyword] = useState<string>(history[0]?.keyword || '');
    const { theme } = useTheme();

    const selectedData = history.find(h => h.keyword === selectedKeyword);

    const getPositionChange = (data: RankingHistoryData) => {
        const validPositions = data.history.filter(h => h.position !== null);
        if (validPositions.length < 2) return null;
        
        const latest = validPositions[validPositions.length - 1].position!;
        const previous = validPositions[validPositions.length - 2].position!;
        return previous - latest; // Positive = improvement
    };

    return (
        <div className="mb-8">
            <div className="rounded-xl border overflow-hidden" style={{
                background: 'transparent',
                borderColor: '#FFC004'
            }}>
                {/* Header */}
                <div className="px-6 py-5 border-b border-border/40 bg-gradient-to-r from-amber-500/5 to-amber-500/5">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                                <h2 className="text-lg font-semibold text-foreground">Ranking Progress Over Time</h2>
                            </div>
                            <p className="text-[13px] text-muted-foreground">
                                Track keyword position changes week over week
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    {/* Keyword Selector */}
                    <div className="mb-6">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 block">
                            Select Keyword
                        </label>
                        <select
                            value={selectedKeyword}
                            onChange={(e) => setSelectedKeyword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-lg border border-border bg-secondary text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {history.map((h) => {
                                const change = getPositionChange(h);
                                return (
                                    <option key={h.keyword} value={h.keyword}>
                                        {h.keyword} {change !== null && (change > 0 ? `↑${change}` : change < 0 ? `↓${Math.abs(change)}` : '→')}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    {/* Timeline */}
                    {selectedData && (
                        <div className="space-y-3">
                            {selectedData.history.map((point, idx) => (
                                <div 
                                    key={idx} 
                                    className="flex items-center gap-4 p-4 rounded-lg border border-border/30 cursor-pointer transition-all"
                                    style={{
                                        background: 'transparent',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (theme === 'light') {
                                            e.currentTarget.style.background = 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)';
                                        } else {
                                            e.currentTarget.style.background = 'rgba(171, 128, 0, 0.2)';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                    }}
                                >
                                    <div className="flex-shrink-0 w-24">
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </p>
                                    </div>
                                    <div className="flex-1 flex items-center gap-3">
                                        {point.position !== null ? (
                                            <>
                                                <span className="text-lg font-bold text-emerald-500">#{point.position}</span>
                                                {point.has_featured_snippet && (
                                                    <span className="text-xs bg-amber-500/10 text-amber-600 py-0.5 px-2 rounded-full border border-amber-500/20">
                                                        Featured Snippet
                                                    </span>
                                                )}
                                            </>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">Not ranking</span>
                                        )}
                                    </div>
                                    {idx < selectedData.history.length - 1 && selectedData.history[idx + 1].position !== null && point.position !== null && (
                                        <div className="flex-shrink-0">
                                            {selectedData.history[idx + 1].position! < point.position ? (
                                                <span className="text-xs font-medium text-emerald-500 flex items-center gap-1">
                                                    ↑ {point.position - selectedData.history[idx + 1].position!}
                                                </span>
                                            ) : selectedData.history[idx + 1].position! > point.position ? (
                                                <span className="text-xs font-medium text-red-500 flex items-center gap-1">
                                                    ↓ {selectedData.history[idx + 1].position! - point.position}
                                                </span>
                                            ) : (
                                                <span className="text-xs font-medium text-muted-foreground">→</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Empty State */}
                    {!selectedData && (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">No historical data available yet</p>
                            <p className="text-xs text-muted-foreground/70 mt-1">Run weekly scans to track progress</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
