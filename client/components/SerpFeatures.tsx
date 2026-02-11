import { Zap, TrendingUp, Globe, Smartphone, Monitor, Target, AlertCircle } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface QuickWin {
    keyword: string;
    score: number;
    priority: string;
    current_position: number | null;
    difficulty: string;
    recommendation: string;
}

interface HighOpportunity {
    keyword: string;
    opportunity_score: number;
    total_opportunities: number;
    opportunities: Array<{
        type: string;
        description: string;
        action?: string;
    }>;
    current_position: number | null;
}

interface RegionalAnalysis {
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
}

interface DeviceComparison {
    keyword: string;
    desktop: { position: number | null };
    mobile: { position: number | null };
    difference: number;
    analysis: string;
    recommendation: string;
}

export function QuickWinsSection({ quickWins }: { quickWins: QuickWin[] }) {
    const { theme } = useTheme();
    if (!quickWins || quickWins.length === 0) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Quick Win Opportunities</h3>
                <span className="text-[11px] text-muted-foreground ml-auto">{quickWins.length} keywords</span>
            </div>
            <div className="space-y-3">
                {quickWins.map((qw, idx) => (
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
                                    <span className="text-sm font-medium text-foreground">{qw.keyword}</span>
                                    {qw.current_position && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                            #{qw.current_position}
                                        </span>
                                    )}
                                </div>
                                <p className="text-[12px] text-muted-foreground">{qw.recommendation}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-amber-500">{qw.score}</div>
                                <div className="text-[10px] text-muted-foreground">score</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] mt-2">
                            <span className={`px-2 py-0.5 rounded ${
                                qw.priority === 'High Priority' ? 'bg-emerald-500/10 text-emerald-500' :
                                qw.priority === 'Medium Priority' ? 'bg-amber-500/10 text-amber-500' :
                                'bg-gray-500/10 text-gray-500'
                            }`}>
                                {qw.priority}
                            </span>
                            <span className="text-muted-foreground">Difficulty: {qw.difficulty}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function HighOpportunitiesSection({ opportunities }: { opportunities: HighOpportunity[] }) {
    const { theme } = useTheme();
    if (!opportunities || opportunities.length === 0) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <Target className="w-4 h-4 text-emerald-500" />
                <h3 className="text-sm font-semibold text-foreground">High Opportunity Keywords</h3>
                <span className="text-[11px] text-muted-foreground ml-auto">{opportunities.length} keywords</span>
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
                                    {opp.current_position && (
                                        <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 text-amber-600">
                                            #{opp.current_position}
                                        </span>
                                    )}
                                </div>
                                <div className="text-[11px] text-muted-foreground mb-2">
                                    {opp.total_opportunities} opportunities detected
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-emerald-500">{opp.opportunity_score}</div>
                                <div className="text-[10px] text-muted-foreground">score</div>
                            </div>
                        </div>
                        {opp.opportunities.length > 0 && (
                            <div className="space-y-1 mt-2">
                                {opp.opportunities.slice(0, 2).map((opportunity, i) => (
                                    <div key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                                        <span className="text-emerald-500 mt-0.5">•</span>
                                        <span>{opportunity.description}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

export function RegionalRankingsSection({ regional }: { regional: RegionalAnalysis | null }) {
    if (!regional) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <Globe className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">Regional Rankings</h3>
                <span className="text-[11px] text-muted-foreground ml-auto">
                    {regional.keyword}
                </span>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-4">
                {regional.locations.map((loc, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-secondary/30 border border-border/20 text-center">
                        <div className="text-[11px] text-muted-foreground mb-1">{loc.location}</div>
                        <div className="text-lg font-bold text-foreground">
                            {loc.position ? `#${loc.position}` : '—'}
                        </div>
                    </div>
                ))}
            </div>
            {regional.analysis.ranking_in > 0 && (
                <div className="text-[12px] text-muted-foreground">
                    Ranking in {regional.analysis.ranking_in} of {regional.locations.length} locations
                    {regional.analysis.best_location && (
                        <span className="ml-2 text-emerald-500">
                            • Best: {regional.analysis.best_location} (#{regional.analysis.best_position})
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

export function DeviceComparisonSection({ device }: { device: DeviceComparison | null }) {
    if (!device) return null;

    return (
        <div className="rounded-xl p-6 border mb-6" style={{
            background: 'transparent',
            borderColor: '#FFC004'
        }}>
            <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center gap-1">
                    <Monitor className="w-4 h-4 text-purple-500" />
                    <Smartphone className="w-4 h-4 text-purple-500" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Mobile vs Desktop</h3>
                <span className="text-[11px] text-muted-foreground ml-auto">
                    {device.keyword}
                </span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/20 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Monitor className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">Desktop</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {device.desktop.position ? `#${device.desktop.position}` : '—'}
                    </div>
                </div>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border/20 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Smartphone className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[11px] text-muted-foreground">Mobile</span>
                    </div>
                    <div className="text-2xl font-bold text-foreground">
                        {device.mobile.position ? `#${device.mobile.position}` : '—'}
                    </div>
                </div>
            </div>
            <div className="p-3 rounded-lg bg-secondary/20 border border-border/10">
                <div className="text-[12px] text-muted-foreground mb-1">{device.analysis}</div>
                <div className="text-[11px] text-primary">{device.recommendation}</div>
            </div>
        </div>
    );
}
