'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap, Target, TrendingUp, Plus, Minus, X, Loader2 } from 'lucide-react';
import axios from 'axios';
import dynamic from 'next/dynamic';

const GridScan = dynamic(() => import('./components/GridScan'), { ssr: false });

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MAX_TOTAL_BLOGS = 50;
const DEFAULT_TOTAL_BLOGS = 30;
const MIN_WORD_COUNT = 500;
const MAX_WORD_COUNT = 2500;
const DEFAULT_WORD_COUNT = 1200;

const BLOG_TYPES = [
  { key: 'functional', label: 'Functional', desc: 'How-to guides' },
  { key: 'transactional', label: 'Transactional', desc: 'Product content' },
  { key: 'commercial', label: 'Commercial', desc: 'Reviews & comparisons' },
  { key: 'informational', label: 'Informational', desc: 'Educational' }
] as const;

type BlogTypeKey = typeof BLOG_TYPES[number]['key'];
type BlogTypeAllocations = Record<BlogTypeKey, number>;

const DEFAULT_ALLOCATIONS: BlogTypeAllocations = {
  functional: 8, transactional: 8, commercial: 7, informational: 7
};

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'technical', label: 'Technical' },
  { value: 'casual', label: 'Casual' },
];

export default function Home() {
  const router = useRouter();
  const [niche, setNiche] = useState('');
  const [valuePropositions, setValuePropositions] = useState(['']);
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalBlogs, setTotalBlogs] = useState(DEFAULT_TOTAL_BLOGS);
  const [allocations, setAllocations] = useState<BlogTypeAllocations>(DEFAULT_ALLOCATIONS);
  const [targetWordCount, setTargetWordCount] = useState(DEFAULT_WORD_COUNT);

  const allocationSum = BLOG_TYPES.reduce((acc, t) => acc + allocations[t.key], 0);
  const remaining = totalBlogs - allocationSum;

  const adjustAllocations = (allocs: BlogTypeAllocations, newTotal: number): BlogTypeAllocations => {
    const sum = BLOG_TYPES.reduce((acc, t) => acc + allocs[t.key], 0);
    if (sum <= newTotal) return allocs;
    const updated = { ...allocs };
    let reduction = sum - newTotal;
    for (const { key } of [...BLOG_TYPES].reverse()) {
      if (reduction <= 0) break;
      const cut = Math.min(updated[key], reduction);
      updated[key] -= cut;
      reduction -= cut;
    }
    return updated;
  };

  const handleTotalChange = (value: number) => {
    const clamped = Math.max(1, Math.min(MAX_TOTAL_BLOGS, value));
    setTotalBlogs(clamped);
    setAllocations(prev => adjustAllocations(prev, clamped));
  };

  const handleAllocationChange = (key: BlogTypeKey, value: number) => {
    const otherSum = BLOG_TYPES.reduce((acc, t) => t.key === key ? acc : acc + allocations[t.key], 0);
    const maxAllowed = Math.max(0, totalBlogs - otherSum);
    setAllocations(prev => ({ ...prev, [key]: Math.max(0, Math.min(maxAllowed, value)) }));
  };

  const handleValuePropChange = (index: number, value: string) => {
    const updated = [...valuePropositions];
    updated[index] = value;
    setValuePropositions(updated);
  };

  const addValueProp = () => valuePropositions.length < 10 && setValuePropositions([...valuePropositions, '']);
  const removeValueProp = (index: number) => valuePropositions.length > 1 && setValuePropositions(valuePropositions.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!niche.trim()) return setError('Please enter a business niche');
    const validProps = valuePropositions.filter(vp => vp.trim());
    if (validProps.length === 0) return setError('Please enter at least one service specialty');
    if (allocationSum !== totalBlogs) return setError(`Allocations must equal ${totalBlogs}. Currently: ${allocationSum}`);

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/generate-content`, {
        niche: niche.trim(), valuePropositions: validProps, tone, totalBlogs,
        blogTypeAllocations: allocations, targetWordCount
      });
      router.push(`/progress/${response.data.jobId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to start content generation');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Grid Background */}
      <div className="fixed inset-0 -z-10">
        <GridScan
          linesColor="#1a1625"
          scanColor="#8b5cf6"
          scanOpacity={0.4}
          gridScale={0.06}
          noiseIntensity={0.015}
          scanGlow={0.5}
          scanSoftness={2}
          scanDuration={4}
          scanDelay={2}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
      </div>

      <div className="relative py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10 animate-fade-in-up">
            <div className="inline-flex p-3 rounded-2xl bg-primary/10 border border-primary/20 mb-6 glow-box">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold mb-3">
              <span className="gradient-text">Content Factory</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Generate SEO-optimized blog posts with AI-powered research
            </p>
          </div>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { icon: Zap, label: 'Deep Research', color: 'text-primary' },
              { icon: Target, label: 'Targeted', color: 'text-accent' },
              { icon: TrendingUp, label: 'SEO Ready', color: 'text-emerald-400' },
            ].map((f, i) => (
              <div key={i} className="card-hover text-center py-4 px-2 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <f.icon className={`w-5 h-5 ${f.color} mx-auto mb-2`} />
                <span className="text-xs text-muted-foreground">{f.label}</span>
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="card glow-box animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Niche */}
              <div>
                <label className="label">Business Niche</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., Digital Marketing, SaaS, Fitness"
                  className="input"
                  disabled={loading}
                />
              </div>

              {/* Value Props */}
              <div>
                <label className="label">Service Specialties</label>
                <div className="space-y-2">
                  {valuePropositions.map((vp, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={vp}
                        onChange={(e) => handleValuePropChange(i, e.target.value)}
                        placeholder="What makes your service unique?"
                        className="input flex-1"
                        disabled={loading}
                      />
                      {valuePropositions.length > 1 && (
                        <button type="button" onClick={() => removeValueProp(i)} className="btn-icon text-muted-foreground hover:text-destructive" disabled={loading}>
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {valuePropositions.length < 10 && (
                  <button type="button" onClick={addValueProp} className="mt-2 text-sm text-primary hover:text-accent font-medium inline-flex items-center gap-1" disabled={loading}>
                    <Plus className="w-3 h-3" /> Add another
                  </button>
                )}
              </div>

              {/* Total Blogs */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Blog Posts</label>
                  <span className="text-xl font-bold text-primary glow-text">{totalBlogs}</span>
                </div>
                <input type="range" min={1} max={MAX_TOTAL_BLOGS} value={totalBlogs} onChange={(e) => handleTotalChange(Number(e.target.value))} disabled={loading} />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span><span>{MAX_TOTAL_BLOGS}</span>
                </div>
              </div>

              {/* Blog Type Distribution */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="label mb-0">Distribution</label>
                  <span className={`badge ${remaining === 0 ? 'badge-success' : 'badge-warning'}`}>
                    {remaining === 0 ? 'Balanced' : `${remaining} left`}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {BLOG_TYPES.map((type) => (
                    <div key={type.key} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 border border-border/30">
                      <div>
                        <div className="text-sm font-medium text-foreground">{type.label}</div>
                        <div className="text-xs text-muted-foreground">{type.desc}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => handleAllocationChange(type.key, allocations[type.key] - 1)} className="btn-icon h-7 w-7" disabled={loading || allocations[type.key] === 0}>
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-semibold">{allocations[type.key]}</span>
                        <button type="button" onClick={() => handleAllocationChange(type.key, allocations[type.key] + 1)} className="btn-icon h-7 w-7" disabled={loading || remaining <= 0}>
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tone & Word Count */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Tone</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className="select" disabled={loading}>
                    {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Words</label>
                    <span className="text-sm font-semibold text-primary">{targetWordCount}</span>
                  </div>
                  <input type="range" min={MIN_WORD_COUNT} max={MAX_WORD_COUNT} step={100} value={targetWordCount} onChange={(e) => setTargetWordCount(Number(e.target.value))} disabled={loading} />
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Starting...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate {totalBlogs} Posts</>
                )}
              </button>

           
            </form>
          </div>

         
        </div>
      </div>
    </div>
  );
}
