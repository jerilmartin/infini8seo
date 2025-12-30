'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MIN_WORD_COUNT = 500;
const MAX_WORD_COUNT = 2500;
const DEFAULT_WORD_COUNT = 1200;
const MAX_PER_TYPE = 15;

const CONTENT_TYPES = [
  { key: 'informational', label: 'Educational', desc: 'In-depth guides' },
  { key: 'functional', label: 'How-to', desc: 'Step-by-step' },
  { key: 'commercial', label: 'Comparisons', desc: 'Reviews' },
  { key: 'transactional', label: 'Product-led', desc: 'Solutions' },
] as const;

type ContentTypeKey = typeof CONTENT_TYPES[number]['key'];
type Allocations = Record<ContentTypeKey, number>;

const DEFAULT_ALLOCATIONS: Allocations = {
  informational: 10, functional: 8, commercial: 6, transactional: 6
};

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'authoritative', label: 'Authoritative' },
  { value: 'friendly', label: 'Friendly' },
];

const generatePreviewTitles = (wordCount: number) => {
  const readTime = Math.round(wordCount / 200);
  return [
    { title: 'The Ultimate Guide to Ranking Higher in 2025', type: 'Educational', time: readTime },
    { title: 'How to Create Content That Actually Converts', type: 'How-to', time: readTime + 2 },
    { title: 'Top 10 Strategies Your Competitors Are Using', type: 'Comparison', time: readTime + 1 },
    { title: 'Why Most Businesses Fail at Content Marketing', type: 'Product-led', time: readTime - 1 },
  ];
};

export default function Home() {
  const router = useRouter();
  const [niche, setNiche] = useState('');
  const [valuePropositions, setValuePropositions] = useState(['']);
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allocations, setAllocations] = useState<Allocations>(DEFAULT_ALLOCATIONS);
  const [targetWordCount, setTargetWordCount] = useState(DEFAULT_WORD_COUNT);

  const totalPosts = CONTENT_TYPES.reduce((acc, t) => acc + allocations[t.key], 0);

  const handleAllocationChange = (key: ContentTypeKey, value: number) => {
    setAllocations(prev => ({ ...prev, [key]: Math.max(0, Math.min(MAX_PER_TYPE, value)) }));
  };

  const handleValuePropChange = (index: number, value: string) => {
    const updated = [...valuePropositions];
    updated[index] = value;
    setValuePropositions(updated);
  };

  const addValueProp = () => valuePropositions.length < 5 && setValuePropositions([...valuePropositions, '']);
  const removeValueProp = (index: number) => valuePropositions.length > 1 && setValuePropositions(valuePropositions.filter((_, i) => i !== index));

  const previewTitles = useMemo(() => generatePreviewTitles(targetWordCount), [targetWordCount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!niche.trim()) return setError('Enter a niche to continue');
    const validProps = valuePropositions.filter(vp => vp.trim());
    if (validProps.length === 0) return setError('Add at least one specialty');
    if (totalPosts === 0) return setError('Select at least one post type');

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/generate-content`, {
        niche: niche.trim(),
        valuePropositions: validProps,
        tone,
        totalBlogs: totalPosts,
        blogTypeAllocations: allocations,
        targetWordCount
      });
      router.push(`/progress/${response.data.jobId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-8 py-10">
        {/* Brand + Header */}
        <header className="mb-4 animate-fade-in">
          <div className="text-[23px] font-medium text-foreground tracking-tight mb-8">infini8seo</div>
          <h1 className="text-[26px] font-semibold text-foreground leading-tight">
            Content Factory
          </h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          {/* Form Column */}
          <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
            <form onSubmit={handleSubmit} className="space-y-7">
              {/* Niche */}
              <section>
                <label className="text-[12px] font-medium text-foreground/80 uppercase tracking-wide mb-2.5 block">Your Niche</label>
                <input
                  type="text"
                  value={niche}
                  onChange={(e) => setNiche(e.target.value)}
                  placeholder="e.g., B2B SaaS, Personal Finance"
                  className="input text-[15px] h-12"
                  disabled={loading}
                />
              </section>

              {/* Specialties */}
              <section>
                <label className="text-[12px] font-medium text-foreground/80 uppercase tracking-wide mb-2.5 block">What You Offer</label>
                <div className="space-y-2.5">
                  {valuePropositions.map((vp, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        type="text"
                        value={vp}
                        onChange={(e) => handleValuePropChange(i, e.target.value)}
                        placeholder="A key service or angle"
                        className="input flex-1 text-[15px] h-12"
                        disabled={loading}
                      />
                      {valuePropositions.length > 1 && (
                        <button type="button" onClick={() => removeValueProp(i)} className="px-3 text-secondary-foreground hover:text-foreground text-lg transition-colors" disabled={loading}>×</button>
                      )}
                    </div>
                  ))}
                </div>
                {valuePropositions.length < 5 && (
                  <button type="button" onClick={addValueProp} className="mt-2.5 text-[13px] text-secondary-foreground hover:text-foreground transition-colors" disabled={loading}>
                    + Add another
                  </button>
                )}
              </section>

              {/* Content Mix */}
              <section>
                <div className="flex items-baseline justify-between mb-4">
                  <label className="text-[12px] font-medium text-foreground/80 uppercase tracking-wide">Content Mix</label>
                  <span className="text-[13px] tabular-nums text-secondary-foreground">{totalPosts} posts</span>
                </div>

                <div className="space-y-3">
                  {CONTENT_TYPES.map((type) => {
                    const value = allocations[type.key];
                    return (
                      <div key={type.key} className="group">
                        <div className="flex items-baseline justify-between mb-1.5">
                          <div className="flex items-baseline gap-2">
                            <span className="text-[14px] font-medium text-foreground">{type.label}</span>
                            <span className="text-[12px] text-secondary-foreground">{type.desc}</span>
                          </div>
                          <span className="text-[13px] tabular-nums text-secondary-foreground w-5 text-right">{value}</span>
                        </div>
                        <div 
                          className="h-1.5 bg-border/60 rounded-full cursor-pointer relative overflow-hidden"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            handleAllocationChange(type.key, Math.round((x / rect.width) * MAX_PER_TYPE));
                          }}
                        >
                          <div
                            className="h-full bg-foreground/70 rounded-full transition-all duration-200"
                            style={{ width: `${(value / MAX_PER_TYPE) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Settings Row */}
              <section className="grid grid-cols-2 gap-5">
                <div>
                  <label className="text-[12px] font-medium text-foreground/80 uppercase tracking-wide mb-2.5 block">Tone</label>
                  <select value={tone} onChange={(e) => setTone(e.target.value)} className="select text-[14px] h-12" disabled={loading}>
                    {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[12px] font-medium text-foreground/80 uppercase tracking-wide mb-2.5 block">Length</label>
                  <div className="flex items-center gap-3 h-12">
                    <input
                      type="range"
                      min={MIN_WORD_COUNT}
                      max={MAX_WORD_COUNT}
                      step={100}
                      value={targetWordCount}
                      onChange={(e) => setTargetWordCount(Number(e.target.value))}
                      className="flex-1"
                      disabled={loading}
                    />
                    <span className="text-[13px] tabular-nums text-secondary-foreground w-14 text-right">{targetWordCount}w</span>
                  </div>
                </div>
              </section>

              {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[13px]">{error}</div>
              )}

              <button type="submit" disabled={loading || totalPosts === 0} className="btn-primary w-full justify-center text-[14px] h-12 mt-2">
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</>
                ) : (
                  <>Create {totalPosts} posts<ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </button>

              <p className="text-[12px] text-secondary-foreground text-center">Takes about 10-15 minutes</p>
            </form>
          </div>

          {/* Preview Column */}
          <aside className="animate-fade-in" style={{ animationDelay: '100ms' }}>
            <div className="bg-card/50 rounded-xl p-9">
              <p className="text-[12px] font-medium text-foreground/80 uppercase tracking-wide mb-7">What you'll get</p>

              {/* Preview Titles */}
              <div className="space-y-7">
                {previewTitles.map((item, i) => (
                  <article key={i} className="pb-7 border-b border-border/30 last:border-0 last:pb-0">
                    <h3 className="text-[19px] font-medium text-foreground leading-snug mb-2.5">
                      {item.title}
                    </h3>
                    <p className="text-[14px] text-secondary-foreground">
                      {item.type} · {item.time} min read
                    </p>
                  </article>
                ))}
              </div>

              {/* Meta Row */}
              <div className="mt-9 pt-7 border-t border-border/30">
                <div className="flex justify-between text-center">
                  <div className="flex-1">
                    <div className="text-[11px] text-secondary-foreground uppercase tracking-wide mb-1.5">Structure</div>
                    <div className="text-[14px] text-foreground/80">Intro → Body → FAQ</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-secondary-foreground uppercase tracking-wide mb-1.5">SEO</div>
                    <div className="text-[14px] text-foreground/80">Keywords + Meta</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-[11px] text-secondary-foreground uppercase tracking-wide mb-1.5">AIO</div>
                    <div className="text-[14px] text-foreground/80">AI-optimized</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="mt-6 flex items-center justify-center gap-10 text-center">
              <div>
                <div className="text-[18px] font-semibold text-foreground/80">{totalPosts}</div>
                <div className="text-[11px] text-secondary-foreground uppercase tracking-wide">Posts</div>
              </div>
              <div className="w-px h-6 bg-border/40" />
              <div>
                <div className="text-[18px] font-semibold text-foreground/80">{Math.round(totalPosts * targetWordCount / 1000)}k</div>
                <div className="text-[11px] text-secondary-foreground uppercase tracking-wide">Words</div>
              </div>
              <div className="w-px h-6 bg-border/40" />
              <div>
                <div className="text-[18px] font-semibold text-foreground/80">~{Math.round(totalPosts * targetWordCount / 200)}</div>
                <div className="text-[11px] text-secondary-foreground uppercase tracking-wide">Min read</div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
