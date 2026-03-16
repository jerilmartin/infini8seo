import { Target, Lightbulb, MapPin, TrendingUp, FileText, BarChart3 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface KeywordCluster {
    name: string;
    keywords: string[];
    priority: string;
    action: string;
}

interface ContentGap {
    topic: string;
    competitors: string[];
    opportunity: string;
    action: string;
}

interface FeaturedSnippetOpportunity {
    keyword: string;
    owner: string;
    format: string;
    recommendation: string;
}

interface LocalSEO {
    has_local_intent: boolean;
    recommendations: string[];
}

interface CompetitorStrategy {
    patterns: string[];
    strengths: string[];
    weaknesses: string[];
}

interface ContentQuality {
    score: number;
    improvements: string[];
}

export function KeywordClustersSection({ clusters }: { clusters: KeywordCluster[] }) {
    const { theme } = useTheme();
    if (!clusters || clusters.length === 0) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Keyword Clusters & Topic Mapping</h3>
                <span className="text-[11px] text-muted-foreground ml-auto">{clusters.length} clusters</span>
            </div>
            <div className="space-y-3">
                {clusters.map((cluster, idx) => (
                    <div 
                        key={idx} 
                        className="p-4 rounded-lg border border-border/20 cursor-pointer transition-all"
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
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-foreground">{cluster.name}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded ${
                                        cluster.priority === 'High' ? 'bg-emerald-500/10 text-emerald-500' :
                                        cluster.priority === 'Medium' ? 'bg-amber-500/10 text-amber-500' :
                                        'bg-gray-500/10 text-gray-500'
                                    }`}>
                                        {cluster.priority} Priority
                                    </span>
                                </div>
                                <p className="text-[12px] text-muted-foreground mb-2">{cluster.action}</p>
                                <div className="flex flex-wrap gap-1.5">
                                    {cluster.keywords.slice(0, 5).map((kw, i) => (
                                        <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-secondary text-foreground border border-border/30">
                                            {kw}
                                        </span>
                                    ))}
                                    {cluster.keywords.length > 5 && (
                                        <span className="text-[11px] px-2 py-0.5 text-muted-foreground">
                                            +{cluster.keywords.length - 5} more
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ContentGapsSection({ gaps }: { gaps: ContentGap[] }) {
    const { theme } = useTheme();
    if (!gaps || gaps.length === 0) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <FileText className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-foreground">Content Gap Analysis</h3>
                <span className="text-[11px] text-muted-foreground ml-auto">{gaps.length} gaps identified</span>
            </div>
            <div className="space-y-3">
                {gaps.map((gap, idx) => (
                    <div 
                        key={idx} 
                        className="p-4 rounded-lg border border-border/20 cursor-pointer transition-all"
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
                        <div className="mb-2">
                            <h4 className="text-sm font-medium text-foreground mb-1">{gap.topic}</h4>
                            <p className="text-[12px] text-muted-foreground mb-2">{gap.opportunity}</p>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">Competitors covering this:</span>
                                <div className="flex gap-1">
                                    {gap.competitors.slice(0, 3).map((comp, i) => (
                                        <span key={i} className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-500">
                                            {comp}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-border/20">
                            <p className="text-[11px] text-primary">→ {gap.action}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function FeaturedSnippetSection({ opportunities }: { opportunities: FeaturedSnippetOpportunity[] }) {
    const { theme } = useTheme();
    if (!opportunities || opportunities.length === 0) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Featured Snippet Opportunities</h3>
                <span className="text-[11px] text-muted-foreground ml-auto">{opportunities.length} opportunities</span>
            </div>
            <div className="space-y-3">
                {opportunities.map((opp, idx) => (
                    <div 
                        key={idx} 
                        className="p-4 rounded-lg border border-border/20 cursor-pointer transition-all"
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
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium text-foreground">{opp.keyword}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-500">
                                        {opp.format}
                                    </span>
                                </div>
                                <p className="text-[11px] text-muted-foreground mb-1">
                                    Currently owned by: <span className="text-foreground font-medium">{opp.owner}</span>
                                </p>
                                <p className="text-[12px] text-muted-foreground">{opp.recommendation}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function LocalSEOSection({ localSeo }: { localSeo: LocalSEO | null }) {
    if (!localSeo || !localSeo.has_local_intent) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">Local SEO Insights</h3>
            </div>
            <div className="space-y-2">
                {localSeo.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/20">
                        <span className="text-emerald-500 mt-0.5">•</span>
                        <span className="text-[13px] text-foreground">{rec}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function CompetitorStrategySection({ strategy }: { strategy: CompetitorStrategy | null }) {
    if (!strategy) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Competitor Strategy Analysis</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {strategy.patterns.length > 0 && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/20">
                        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Patterns</h4>
                        <ul className="space-y-1.5">
                            {strategy.patterns.map((pattern, idx) => (
                                <li key={idx} className="text-[12px] text-foreground flex items-start gap-2">
                                    <span className="text-amber-500 mt-0.5">•</span>
                                    <span>{pattern}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {strategy.strengths.length > 0 && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/20">
                        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Their Strengths</h4>
                        <ul className="space-y-1.5">
                            {strategy.strengths.map((strength, idx) => (
                                <li key={idx} className="text-[12px] text-foreground flex items-start gap-2">
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    <span>{strength}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {strategy.weaknesses.length > 0 && (
                    <div className="p-4 rounded-lg bg-secondary/30 border border-border/20">
                        <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Gaps to Exploit</h4>
                        <ul className="space-y-1.5">
                            {strategy.weaknesses.map((weakness, idx) => (
                                <li key={idx} className="text-[12px] text-foreground flex items-start gap-2">
                                    <span className="text-amber-500 mt-0.5">•</span>
                                    <span>{weakness}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

export function ContentQualitySection({ quality }: { quality: ContentQuality | null }) {
    if (!quality) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-4 h-4 text-purple-500" />
                <h3 className="text-sm font-semibold text-foreground">Content Quality Score</h3>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-2xl font-bold text-foreground">{quality.score}</span>
                    <span className="text-[11px] text-muted-foreground">/100</span>
                </div>
            </div>
            <div className="mb-4">
                <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                            quality.score >= 80 ? 'bg-emerald-500' :
                            quality.score >= 60 ? 'bg-amber-500' :
                            quality.score >= 40 ? 'bg-amber-500' :
                            'bg-red-500'
                        }`}
                        style={{ width: `${quality.score}%` }}
                    />
                </div>
            </div>
            {quality.improvements.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-[11px] font-semibold text-muted-foreground uppercase mb-2">Improvements Needed</h4>
                    {quality.improvements.map((improvement, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-secondary/30 border border-border/20">
                            <span className="text-purple-500 mt-0.5">•</span>
                            <span className="text-[13px] text-foreground">{improvement}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
