'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, Copy, Check, ArrowLeft, ChevronDown } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface BlogPost {
  scenarioId: number;
  title: string;
  personaArchetype: string;
  keywords: string[];
  content: string;
  wordCount: number;
  slug: string;
  metaDescription: string;
  blogType?: string;
}

interface ContentData {
  jobId: string;
  niche: string;
  tone: string;
  completedAt: string;
  stats: { totalPosts: number; avgWordCount: number; totalWords: number };
  content: BlogPost[];
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;
  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set([1]));
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!jobId) return;
    axios.get(`${API_URL}/api/content/${jobId}`)
      .then(res => setContentData(res.data))
      .catch(err => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [jobId]);

  const togglePost = (id: number) => {
    const next = new Set(expandedPosts);
    next.has(id) ? next.delete(id) : next.add(id);
    setExpandedPosts(next);
  };
  const expandAll = () => contentData && setExpandedPosts(new Set(contentData.content.map(p => p.scenarioId)));
  const collapseAll = () => setExpandedPosts(new Set());

  const copyToClipboard = async (post: BlogPost) => {
    await navigator.clipboard.writeText(post.content);
    setCopiedId(post.scenarioId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const downloadMarkdown = (post: BlogPost) => {
    const blob = new Blob([post.content], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${post.slug || `post-${post.scenarioId}`}.md`;
    a.click();
  };

  const downloadAll = () => {
    if (!contentData) return;
    const all = contentData.content.map(p => `# ${p.title}\n\n${p.content}`).join('\n\n---\n\n');
    const blob = new Blob([all], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${contentData.niche.replace(/\s+/g, '-').toLowerCase()}-content.md`;
    a.click();
  };

  const getTypeLabel = (type?: string) => {
    const labels: Record<string, string> = { informational: 'Educational', functional: 'How-to', commercial: 'Comparison', transactional: 'Product-led' };
    return labels[type || ''] || type || '';
  };
  const getReadTime = (wc: number) => Math.max(1, Math.round(wc / 200));

  if (loading) {
    return (<div className="min-h-screen bg-background flex items-center justify-center"><div className="text-center"><div className="w-6 h-6 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-3" /><p className="text-[14px] text-secondary-foreground">Loading content...</p></div></div>);
  }

  if (error || !contentData) {
    return (<div className="min-h-screen bg-background flex items-center justify-center px-6"><div className="text-center max-w-md"><h2 className="text-[18px] font-medium text-foreground mb-2">Couldn't load content</h2><p className="text-[14px] text-secondary-foreground mb-6">{error}</p><button onClick={() => router.push('/')} className="btn-primary">Go back</button></div></div>);
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-8 py-10">
        <header className="mb-10">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-[13px] text-secondary-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /> Back to factory</button>
            <button onClick={downloadAll} className="flex items-center gap-2 text-[13px] text-secondary-foreground hover:text-foreground transition-colors"><Download className="w-4 h-4" /> Export all</button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[26px] font-semibold text-foreground mb-2">{contentData.niche}</h1>
              <p className="text-[14px] text-secondary-foreground">{contentData.stats?.totalPosts} articles · {(contentData.stats?.totalWords || 0).toLocaleString()} words · {contentData.tone}</p>
            </div>
            <div className="flex items-center gap-8 text-center">
              <div><div className="text-[18px] font-semibold text-foreground/80">{contentData.stats?.totalPosts}</div><div className="text-[11px] text-secondary-foreground uppercase tracking-wide">Posts</div></div>
              <div className="w-px h-6 bg-border/40" />
              <div><div className="text-[18px] font-semibold text-foreground/80">{contentData.stats?.avgWordCount}</div><div className="text-[11px] text-secondary-foreground uppercase tracking-wide">Avg words</div></div>
              <div className="w-px h-6 bg-border/40" />
              <div><div className="text-[18px] font-semibold text-foreground/80">{Math.round((contentData.stats?.totalWords || 0) / 1000)}k</div><div className="text-[11px] text-secondary-foreground uppercase tracking-wide">Total</div></div>
            </div>
          </div>
        </header>
        <div className="flex items-center justify-between mb-6 pb-6 border-b border-border/30">
          <div className="text-[13px] text-secondary-foreground">{expandedPosts.size} of {contentData.content.length} expanded</div>
          <div className="flex gap-4">
            <button onClick={expandAll} className="text-[13px] text-secondary-foreground hover:text-foreground transition-colors">Expand all</button>
            <button onClick={collapseAll} className="text-[13px] text-secondary-foreground hover:text-foreground transition-colors">Collapse all</button>
          </div>
        </div>