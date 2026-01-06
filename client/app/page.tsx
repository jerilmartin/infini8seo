'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Sun, Moon, Search, FileText, Facebook, Instagram, Twitter, Mail } from 'lucide-react';
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

type Tab = 'content' | 'seo';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('content');

  // Content Factory state
  const [niche, setNiche] = useState('');
  const [valuePropositions, setValuePropositions] = useState(['']);
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allocations, setAllocations] = useState<Allocations>(DEFAULT_ALLOCATIONS);
  const [targetWordCount, setTargetWordCount] = useState(DEFAULT_WORD_COUNT);

  // SEO Scanner state
  const [scanUrl, setScanUrl] = useState('');
  const [scanLoading, setScanLoading] = useState(false);
  const [scanError, setScanError] = useState('');

  // Theme
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

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

  // Content Factory Submit
  const handleContentSubmit = async (e: React.FormEvent) => {
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

  // SEO Scanner Submit
  const handleSeoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanError('');

    if (!scanUrl.trim()) return setScanError('Enter a URL to scan');

    setScanLoading(true);
    try {
      const response = await axios.post(`${API_URL}/api/scan-seo`, {
        url: scanUrl.trim()
      });
      router.push(`/seo-results/${response.data.scanId}`);
    } catch (err: any) {
      setScanError(err.response?.data?.message || 'Something went wrong');
      setScanLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-4 pb-16">
        {/* Brand + Header */}
        <header className="mb-1 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[21px] font-medium text-foreground tracking-tight">infini8seo</div>
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>

          {/* Tab Switcher */}
          <div className="flex gap-1 p-0.5 bg-secondary/50 rounded-lg w-fit mb-3">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${activeTab === 'content'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Content Factory
            </button>
            <button
              onClick={() => setActiveTab('seo')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all ${activeTab === 'seo'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Search className="w-3.5 h-3.5" />
              SEO Scanner
            </button>
          </div>

          <h1 className="text-[20px] font-semibold text-foreground leading-tight">
            {activeTab === 'content' ? 'Content Factory' : 'SEO Scanner'}
          </h1>
        </header>

        {/* Content Factory Tab */}
        {activeTab === 'content' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Form Column */}
            <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
              <div className="card-elevated p-6">
                <form onSubmit={handleContentSubmit} className="space-y-3">
                  {/* Niche */}
                  <section>
                    <label className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide mb-1.5 block">Your Niche</label>
                    <input
                      type="text"
                      value={niche}
                      onChange={(e) => setNiche(e.target.value)}
                      placeholder="e.g., B2B SaaS, Personal Finance"
                      className="input text-[14px] h-10"
                      disabled={loading}
                    />
                  </section>

                  {/* Specialties */}
                  <section>
                    <label className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide mb-1.5 block">What You Offer</label>
                    <div className="space-y-2">
                      {valuePropositions.map((vp, i) => (
                        <div key={i} className="flex gap-2">
                          <input
                            type="text"
                            value={vp}
                            onChange={(e) => handleValuePropChange(i, e.target.value)}
                            placeholder="A key service or angle"
                            className="input flex-1 text-[14px] h-10"
                            disabled={loading}
                          />
                          {valuePropositions.length > 1 && (
                            <button type="button" onClick={() => removeValueProp(i)} className="px-2 text-secondary-foreground hover:text-foreground text-lg transition-colors" disabled={loading}>×</button>
                          )}
                        </div>
                      ))}
                    </div>
                    {valuePropositions.length < 5 && (
                      <button type="button" onClick={addValueProp} className="mt-1.5 text-[11px] text-secondary-foreground hover:text-foreground transition-colors" disabled={loading}>
                        + Add another
                      </button>
                    )}
                  </section>

                  {/* Content Mix - Discrete +/- Controls */}
                  <section>
                    <div className="flex items-baseline justify-between mb-2">
                      <label className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide">Content Mix</label>
                      <span className="text-[12px] tabular-nums text-secondary-foreground">{totalPosts} posts</span>
                    </div>

                    <div className="space-y-2">
                      {CONTENT_TYPES.map((type) => {
                        const value = allocations[type.key];
                        return (
                          <div key={type.key} className="flex items-center justify-between py-2 px-3 rounded-md bg-secondary/30 border border-border/30">
                            <div className="flex items-center gap-2">
                              <span className="text-[14px] font-medium text-foreground">{type.label}</span>
                              <span className="text-[11px] text-muted-foreground">{type.desc}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleAllocationChange(type.key, value - 1)}
                                disabled={loading || value <= 0}
                                className="w-7 h-7 rounded flex items-center justify-center bg-secondary hover:bg-muted text-foreground/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                              >
                                −
                              </button>
                              <span className="w-6 text-center text-[14px] tabular-nums font-medium text-foreground">{value}</span>
                              <button
                                type="button"
                                onClick={() => handleAllocationChange(type.key, value + 1)}
                                disabled={loading || value >= MAX_PER_TYPE}
                                className="w-7 h-7 rounded flex items-center justify-center bg-secondary hover:bg-muted text-foreground/80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>

                  {/* Settings Row */}
                  <section className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide mb-1.5 block">Tone</label>
                      <select value={tone} onChange={(e) => setTone(e.target.value)} className="select text-[14px] h-10" disabled={loading}>
                        {TONES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide mb-1.5 block">Length</label>
                      <div className="flex items-center gap-3 h-10">
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
                        <span className="text-[12px] tabular-nums text-secondary-foreground w-12 text-right">{targetWordCount}w</span>
                      </div>
                    </div>
                  </section>

                  {error && (
                    <div className="p-2 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[12px]">{error}</div>
                  )}

                  <button type="submit" disabled={loading || totalPosts === 0} className="btn-primary w-full justify-center text-[14px] h-10 mt-1">
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Starting...</>
                    ) : (
                      <>Create {totalPosts} posts<ArrowRight className="w-4 h-4 ml-2" /></>
                    )}
                  </button>

                  <p className="text-[11px] text-secondary-foreground text-center mb-18">Takes about 10-15 minutes</p>
                </form>
              </div>
            </div>

            {/* Preview Column */}
            <aside className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="card-elevated p-6">
                <p className="text-[10px] font-medium text-foreground/80 uppercase tracking-wide mb-4">What you'll get</p>

                {/* Preview Titles */}
                <div className="space-y-3">
                  {previewTitles.map((item, i) => (
                    <article key={i} className="pb-3 border-b border-border/30 last:border-0 last:pb-0">
                      <h3 className="text-[15px] font-medium text-foreground leading-snug mb-0.5">
                        {item.title}
                      </h3>
                      <p className="text-[11px] text-secondary-foreground">
                        {item.type} · {item.time} min read
                      </p>
                    </article>
                  ))}
                </div>

                {/* Meta Row */}
                <div className="mt-4 pt-3 border-t border-border/30">
                  <div className="flex justify-between text-center">
                    <div className="flex-1">
                      <div className="text-[9px] text-secondary-foreground uppercase tracking-wide mb-0.5">Structure</div>
                      <div className="text-[11px] text-foreground/80">Intro → Body → FAQ</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-secondary-foreground uppercase tracking-wide mb-0.5">SEO</div>
                      <div className="text-[11px] text-foreground/80">Keywords + Meta</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[9px] text-secondary-foreground uppercase tracking-wide mb-0.5">AIO</div>
                      <div className="text-[11px] text-foreground/80">AI-optimized</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="mt-3 flex items-center justify-center gap-8 text-center">
                <div>
                  <div className="text-[14px] font-semibold text-foreground/80">{totalPosts}</div>
                  <div className="text-[9px] text-secondary-foreground uppercase tracking-wide">Posts</div>
                </div>
                <div className="w-px h-4 bg-border/40" />
                <div>
                  <div className="text-[14px] font-semibold text-foreground/80">{Math.round(totalPosts * targetWordCount / 1000)}k</div>
                  <div className="text-[9px] text-secondary-foreground uppercase tracking-wide">Words</div>
                </div>
                <div className="w-px h-4 bg-border/40" />
                <div>
                  <div className="text-[14px] font-semibold text-foreground/80">~{Math.round(totalPosts * targetWordCount / 200)}</div>
                  <div className="text-[9px] text-secondary-foreground uppercase tracking-wide">Min read</div>
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* SEO Scanner Tab */}
        {activeTab === 'seo' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Form Column */}
            <div className="animate-fade-in" style={{ animationDelay: '50ms' }}>
              <div className="card-elevated p-6">
                <form onSubmit={handleSeoSubmit} className="space-y-5">
                  {/* URL Input */}
                  <section>
                    <label className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide mb-2 block">Website URL</label>
                    <input
                      type="text"
                      value={scanUrl}
                      onChange={(e) => setScanUrl(e.target.value)}
                      placeholder="e.g., example.com or https://example.com"
                      className="input text-[14px] h-10"
                      disabled={scanLoading}
                    />
                    <p className="text-[11px] text-secondary-foreground mt-1.5">
                      Enter any website URL to analyze its SEO performance
                    </p>
                  </section>

                  {scanError && (
                    <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-[13px]">{scanError}</div>
                  )}

                  <button type="submit" disabled={scanLoading || !scanUrl.trim()} className="btn-primary w-full justify-center text-[14px] h-10 mt-1">
                    {scanLoading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scanning...</>
                    ) : (
                      <><Search className="w-4 h-4 mr-2" />Scan for SEO</>
                    )}
                  </button>

                  <p className="text-[11px] text-secondary-foreground text-center">Takes about 1-2 minutes</p>
                </form>
              </div>
            </div>

            {/* Preview Column */}
            <aside className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="card-elevated p-7">
                <p className="text-[11px] font-medium text-foreground/80 uppercase tracking-wide mb-6">What you'll get</p>

                {/* Preview Items - matching Content Factory style */}
                <div className="space-y-5">
                  <article className="pb-5 border-b border-border/30">
                    <h3 className="text-[17px] font-medium text-foreground leading-snug mb-1.5">
                      Domain Health Score
                    </h3>
                    <p className="text-[13px] text-secondary-foreground">
                      Overall SEO health rating from 0-100
                    </p>
                  </article>

                  <article className="pb-5 border-b border-border/30">
                    <h3 className="text-[17px] font-medium text-foreground leading-snug mb-1.5">
                      Keyword & Ranking Analysis
                    </h3>
                    <p className="text-[13px] text-secondary-foreground">
                      Keywords observed + sampled SERP positions
                    </p>
                  </article>

                  <article className="pb-5 border-b border-border/30">
                    <h3 className="text-[17px] font-medium text-foreground leading-snug mb-1.5">
                      Competitor Mapping
                    </h3>
                    <p className="text-[13px] text-secondary-foreground">
                      Direct and content competitors identified
                    </p>
                  </article>

                  <article className="pb-0">
                    <h3 className="text-[17px] font-medium text-foreground leading-snug mb-1.5">
                      Strategic Recommendations
                    </h3>
                    <p className="text-[13px] text-secondary-foreground">
                      Actionable insights to improve rankings
                    </p>
                  </article>
                </div>

                {/* Meta Row - matching Content Factory style */}
                <div className="mt-7 pt-5 border-t border-border/30">
                  <div className="flex justify-between text-center">
                    <div className="flex-1">
                      <div className="text-[10px] text-secondary-foreground uppercase tracking-wide mb-1">Source</div>
                      <div className="text-[13px] text-foreground/80">Live SERP</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-secondary-foreground uppercase tracking-wide mb-1">Method</div>
                      <div className="text-[13px] text-foreground/80">Agentic Audit</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-secondary-foreground uppercase tracking-wide mb-1">Speed</div>
                      <div className="text-[13px] text-foreground/80">~60 seconds</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Row - matching Content Factory style */}
              <div className="mt-4 flex items-center justify-center gap-10 text-center">
                <div>
                  <div className="text-[16px] font-semibold text-foreground/80">5</div>
                  <div className="text-[10px] text-secondary-foreground uppercase tracking-wide">Steps</div>
                </div>
                <div className="w-px h-5 bg-border/40" />
                <div>
                  <div className="text-[16px] font-semibold text-foreground/80">10+</div>
                  <div className="text-[10px] text-secondary-foreground uppercase tracking-wide">Keywords</div>
                </div>
                <div className="w-px h-5 bg-border/40" />
                <div>
                  <div className="text-[16px] font-semibold text-foreground/80">~60s</div>
                  <div className="text-[10px] text-secondary-foreground uppercase tracking-wide">Time</div>
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer
        className="mt-auto relative overflow-hidden"
        style={{
          background: 'linear-gradient(to top, #070b10 0%, #0b0f14 100%)',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        {/* Subtle noise texture */}
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat'
          }}
        />

        <div className="max-w-5xl mx-auto px-10 py-10 relative">
          {/* Row 1: Brand + Links */}
          <div className="flex flex-col md:flex-row items-center md:items-center justify-between gap-8">
            {/* Brand Block */}
            <div className="flex flex-col items-center md:items-start gap-2">
              {/* Logo Row */}
              <div className="flex items-center gap-3 group relative">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500/80"></span>
                  <span className="text-xl font-semibold text-white tracking-tight">Infini8</span>
                </div>
                <span className="text-white/30 text-lg">×</span>
                <img
                  src="/logo-88gb.png"
                  alt="88gb"
                  className="h-10 w-auto object-contain transition-all duration-300 group-hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]"
                />
                {/* Gradient underline - always visible, enhanced on hover */}
                <div className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-gradient-to-r from-blue-500/40 via-purple-500/20 to-transparent rounded-full group-hover:from-blue-500/60 group-hover:via-purple-500/40 transition-all duration-300"></div>
              </div>
              {/* Tagline */}
              <p className="text-[12px] text-white/50 tracking-wide max-w-[220px] text-center md:text-left mt-1">
                AI-powered SEO & Content Intelligence
              </p>
            </div>

            {/* Links Columns */}
            <div className="grid grid-cols-2 gap-12 text-left">
              {/* Our Products */}
              <div>
                <h3 className="text-[14px] font-semibold text-white/75 mb-3 tracking-wider">Our Products</h3>
                <div className="space-y-3">
                  <a
                    href="#"
                    className="block text-[14px] text-white/45 hover:text-white/90 hover:-translate-y-px transition-all duration-150 ease-out"
                  >
                    Infini8seo
                  </a>
                  <a
                    href="#"
                    className="block text-[14px] text-white/45 hover:text-white/90 hover:-translate-y-px transition-all duration-150 ease-out"
                  >
                    Performance Marketing
                  </a>
                  <a
                    href="#"
                    className="block text-[14px] text-white/45 hover:text-white/90 hover:-translate-y-px transition-all duration-150 ease-out"
                  >
                    88 XP
                  </a>
                </div>
              </div>

              {/* Quick Links */}
              <div>
                <h3 className="text-[14px] font-semibold text-white/75 mb-3 tracking-wider">Quick Links</h3>
                <div className="space-y-3">
                  <a
                    href="#"
                    className="block text-[14px] text-white/45 hover:text-white/90 hover:-translate-y-px transition-all duration-150 ease-out"
                  >
                    Terms & Conditions
                  </a>
                  <a
                    href="#"
                    className="block text-[14px] text-white/45 hover:text-white/90 hover:-translate-y-px transition-all duration-150 ease-out"
                  >
                    Privacy Policy
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Copyright + Socials */}
          <div className="mt-10 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <p className="text-[10px] text-white/20 tracking-wide">
              © 2025 Infini8. All rights reserved.
            </p>

            {/* Social Icons */}
            <div className="flex items-center gap-4">
              <a
                href="https://www.facebook.com/88gb.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white hover:-translate-y-0.5 transition-all duration-150"
                aria-label="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/the88gb/?hl=en"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white hover:-translate-y-0.5 transition-all duration-150"
                aria-label="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://x.com/the88gb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white hover:-translate-y-0.5 transition-all duration-150"
                aria-label="X (Twitter)"
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="https://mail.google.com/mail/?view=cm&fs=1&to=connect@88gb.in"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/30 hover:text-white hover:-translate-y-0.5 transition-all duration-150"
                aria-label="Email us"
              >
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
