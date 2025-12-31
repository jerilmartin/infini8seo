'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, Copy, Check, ArrowLeft, FileText, Sun, Moon } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

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
  const [selectedPost, setSelectedPost] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Theme persistence and initialization
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
    if (!jobId) return;
    axios.get(`${API_URL}/api/content/${jobId}`)
      .then(res => {
        setContentData(res.data);
        if (res.data.content?.length > 0) {
          setSelectedPost(res.data.content[0].scenarioId);
        }
      })
      .catch(err => setError(err.response?.data?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [jobId]);

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

  const selectedPostData = contentData?.content.find(p => p.scenarioId === selectedPost);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-6 h-6 border-2 border-foreground/30 border-t-foreground rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error || !contentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <p className="text-sm text-destructive mb-4">{error}</p>
          <button onClick={() => router.push('/')} className="text-sm text-foreground hover:underline">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-secondary-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="h-5 w-px bg-border/50" />
            <div>
              <h1 className="text-base font-medium text-foreground">{contentData.niche}</h1>
              <p className="text-xs text-muted-foreground">
                {contentData.stats?.totalPosts} articles · {(contentData.stats?.totalWords || 0).toLocaleString()} words
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-9 h-9 rounded-lg border border-border/40 bg-secondary/30 text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={downloadAll}
              className="flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Export All
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Article List */}
        <aside className="w-[350px] shrink-0 border-r border-border flex flex-col bg-secondary overflow-hidden">
          <div className="px-5 py-3 border-b border-border shrink-0 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Articles
            </span>
            <span className="text-[11px] font-medium text-muted-foreground">{contentData.content.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contentData.content.map((post, index) => (
              <button
                key={post.scenarioId}
                onClick={() => setSelectedPost(post.scenarioId)}
                className={`w-full text-left px-5 py-4 border-b border-border transition-all ${selectedPost === post.scenarioId
                  ? 'bg-card border-l-2 border-l-primary'
                  : 'hover:bg-card/50 border-l-2 border-l-transparent'
                  }`}
              >
                <div className="flex items-start gap-4">
                  <span className="text-[11px] text-muted-foreground shrink-0 mt-0.5 w-5 tabular-nums font-medium">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-[14px] leading-relaxed line-clamp-2 ${selectedPost === post.scenarioId ? 'text-foreground font-semibold' : 'text-foreground font-medium'
                      }`}>
                      {post.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1 font-medium">
                      {(post.wordCount || 0).toLocaleString()} words
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Reading Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-card">
          {selectedPostData ? (
            <>
              {/* Article Header */}
              <div className="shrink-0 border-b border-border px-10 py-5 bg-card">
                <div className="max-w-[950px]">
                  <h2 className="text-xl font-bold text-foreground leading-tight mb-2">
                    {selectedPostData.title}
                  </h2>
                  <p className="text-sm text-secondary-foreground leading-relaxed mb-4">
                    {selectedPostData.metaDescription}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => copyToClipboard(selectedPostData)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-secondary-foreground transition-colors"
                    >
                      {copiedId === selectedPostData.scenarioId ? (
                        <><Check className="w-3.5 h-3.5 text-emerald-500" /> Copied</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy</>
                      )}
                    </button>
                    <span className="text-border">·</span>
                    <button
                      onClick={() => downloadMarkdown(selectedPostData)}
                      className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-secondary-foreground transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    {selectedPostData.keywords.length > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedPostData.keywords.slice(0, 4).map((k, i) => (
                            <span key={i} className="text-[12px] text-secondary-foreground bg-secondary/30 border border-border/20 px-2.5 py-1 rounded-md font-medium">
                              {k}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Article Content - Centered, constrained width */}
              <div className="flex-1 overflow-y-auto px-10 py-8">
                <article className="article-content">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
                    {selectedPostData.content}
                  </ReactMarkdown>
                </article>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm text-muted-foreground">Select an article to preview</p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}