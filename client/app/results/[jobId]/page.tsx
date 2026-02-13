'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, Copy, Check, ArrowLeft, FileText, Sun, Moon, Bookmark, BookmarkCheck, AlertCircle, FileArchive } from 'lucide-react';
import { api } from '@/utils/api';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';

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
  contentId?: string;
}

interface ContentData {
  jobId: string;
  niche: string;
  tone: string;
  completedAt: string;
  status: string;
  failedCount: number;
  creditsRefunded: number;
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
  const [savedBlogs, setSavedBlogs] = useState<Set<string>>(new Set());
  const [savingBlog, setSavingBlog] = useState<string | null>(null);
  const [exportingBulk, setExportingBulk] = useState(false);
  const [exportingSingle, setExportingSingle] = useState<string | null>(null);

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
    api.get(`/api/content/${jobId}`)
      .then(res => {
        setContentData(res.data);
        if (res.data.content?.length > 0) {
          setSelectedPost(res.data.content[0].scenarioId);
          
          // Check which blogs are already saved
          const contentIds = res.data.content.map((post: any) => post.contentId).filter(Boolean);
          if (contentIds.length > 0) {
            api.post('/api/library/check-multiple', { contentIds })
              .then(checkRes => {
                const saved = new Set<string>();
                Object.entries(checkRes.data.savedStatus).forEach(([id, isSaved]) => {
                  if (isSaved) saved.add(id);
                });
                setSavedBlogs(saved);
              })
              .catch(err => console.error('Failed to check saved status:', err));
          }
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

  const downloadSingle = async (contentId: string, format: 'md' | 'docx') => {
    setExportingSingle(contentId);
    try {
      const response = await api.get(`/api/content/${contentId}/export?format=${format}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blog.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    } finally {
      setExportingSingle(null);
    }
  };

  const downloadBulk = async (format: 'md' | 'docx') => {
    if (!contentData) return;
    setExportingBulk(true);
    try {
      const response = await api.get(`/api/content/${jobId}/export/bulk?format=${format}`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contentData.niche.replace(/\s+/g, '-').toLowerCase()}-content.zip`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Bulk export failed:', err);
      alert('Bulk export failed. Please try again.');
    } finally {
      setExportingBulk(false);
    }
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

  const toggleSaveBlog = async (contentId: string) => {
    if (!contentId) return;
    
    setSavingBlog(contentId);
    try {
      const isSaved = savedBlogs.has(contentId);
      
      if (isSaved) {
        await api.delete(`/api/library/unsave/${contentId}`);
        setSavedBlogs(prev => {
          const newSet = new Set(prev);
          newSet.delete(contentId);
          return newSet;
        });
      } else {
        await api.post('/api/library/save', { contentId });
        setSavedBlogs(prev => new Set(prev).add(contentId));
      }
    } catch (err: any) {
      console.error('Failed to toggle save:', err);
      alert(err.response?.data?.message || 'Failed to save blog');
    } finally {
      setSavingBlog(null);
    }
  };

  const selectedPostData = contentData?.content.find(p => p.scenarioId === selectedPost);

  if (loading) {
    return null; // Let loading.tsx handle the loading state
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

  const isPartialComplete = contentData.status === 'PARTIAL_COMPLETE';

  return (
    <div className="h-screen text-foreground flex flex-col overflow-hidden relative">
      {/* Background - Black in dark mode, light cream in light mode */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: theme === 'dark' ? '#000000' : '#FFFEF9'
        }}
      />
      
      {/* Dark mode golden blur - diagonal from top-left to bottom-right */}
      {theme === 'dark' && (
        <div 
          className="absolute pointer-events-none -z-10"
          style={{
            top: '0',
            left: '0',
            right: '0',
            bottom: '0',
            background: 'linear-gradient(to bottom right, transparent 0%, transparent 20%, rgba(255, 192, 4, 0.15) 35%, rgba(255, 192, 4, 0.25) 50%, rgba(255, 192, 4, 0.15) 65%, transparent 80%, transparent 100%)',
            filter: 'blur(500px)'
          }}
        />
      )}
      {/* Light mode golden blur - diagonal from top-left to bottom-right */}
      {theme === 'light' && (
        <div 
          className="absolute pointer-events-none -z-10"
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
      
      {/* Top Header Bar */}
      <header className="shrink-0 bg-transparent">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground hover:text-secondary-foreground transition-colors"
            >
              <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
            <div className="h-5 w-px bg-border/50" />
            <div>
              <h1 className="text-sm sm:text-base font-medium text-foreground">{contentData.niche}</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {contentData.stats?.totalPosts} articles · {(contentData.stats?.totalWords || 0).toLocaleString()} words
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg hover:opacity-80 transition-opacity"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? <Moon className="w-4 h-4 sm:w-5 sm:h-5" /> : <Sun className="w-4 h-4 sm:w-5 sm:h-5" />}
            </button>
            
            <div className="relative group">
              <button
                disabled={exportingBulk}
                className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-medium hover:opacity-80 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-all disabled:opacity-50"
                style={theme === 'light' ? {
                  background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                  color: '#000000'
                } : {
                  background: '#241A06',
                  color: '#FFFFFF'
                }}
              >
                {exportingBulk ? (
                  <>
                    <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span className="hidden sm:inline">Exporting...</span>
                  </>
                ) : (
                  <>
                    <FileArchive className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">Export All</span>
                  </>
                )}
              </button>
              
              {!exportingBulk && (
                <div 
                  className="absolute right-0 top-full mt-2 w-48 border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50"
                  style={theme === 'light' ? {
                    background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                    borderColor: 'rgba(171, 128, 0, 0.3)'
                  } : {
                    background: '#241A06',
                    borderColor: 'rgba(171, 128, 0, 0.3)'
                  }}
                >
                  <button
                    onClick={() => downloadBulk('md')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-t-lg transition-colors"
                    style={theme === 'light' ? { color: '#000000' } : { color: '#FFFFFF' }}
                  >
                    Download as ZIP (MD)
                  </button>
                  <button
                    onClick={() => downloadBulk('docx')}
                    className="w-full text-left px-4 py-2 text-sm hover:bg-white/10 rounded-b-lg transition-colors"
                    style={theme === 'light' ? { color: '#000000' } : { color: '#FFFFFF' }}
                  >
                    Download as ZIP (DOCX)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Partial completion warning */}
        {isPartialComplete && (
          <div className="px-4 sm:px-5 py-2 bg-yellow-500/10 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
            <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400">
              {contentData.failedCount} blog(s) failed to generate. {contentData.creditsRefunded > 0 && `${contentData.creditsRefunded} credits refunded.`}
            </p>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden flex-col lg:flex-row">
        {/* Sidebar - Article List */}
        <aside className="w-full lg:w-[350px] shrink-0 border-r border-border flex flex-col bg-transparent overflow-hidden max-h-[40vh] lg:max-h-none">
          <div className="px-4 sm:px-5 py-3 shrink-0 flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
              Articles
            </span>
            <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">{contentData.content.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contentData.content.map((post, index) => (
              <button
                key={post.scenarioId}
                onClick={() => setSelectedPost(post.scenarioId)}
                className={`w-full text-left px-4 sm:px-5 py-3 sm:py-4 transition-all relative ${selectedPost === post.scenarioId
                  ? 'border-l-2 border-l-[#FFC004]'
                  : 'hover:bg-white/5 border-l-2 border-l-transparent'
                  }`}
                style={selectedPost === post.scenarioId && theme === 'light' ? {
                  background: 'linear-gradient(to right, rgb(223, 217, 199) 0%, rgb(235, 230, 215) 50%, rgb(245, 242, 235) 100%)'
                } : selectedPost === post.scenarioId ? {
                  background: 'linear-gradient(to right, rgb(41, 32, 5) 0%, rgb(0, 0, 0) 100%)'
                } : undefined}
              >
                <div className="flex items-start gap-2 sm:gap-4">
                  <span className="text-[10px] sm:text-[11px] text-muted-foreground shrink-0 mt-0.5 w-4 sm:w-5 tabular-nums font-medium">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs sm:text-[14px] leading-relaxed line-clamp-2 ${selectedPost === post.scenarioId ? 'text-foreground font-semibold' : 'text-foreground font-medium'
                      }`}>
                      {post.title}
                    </p>
                    <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-1 font-medium">
                      {(post.wordCount || 0).toLocaleString()} words
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Reading Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
          {selectedPostData ? (
            <>
              {/* Article Header */}
              <div className="shrink-0 px-4 sm:px-6 lg:px-10 py-4 bg-transparent">
                <div className="max-w-[950px]">
                  <h2 className="text-base sm:text-lg font-bold text-foreground leading-tight mb-2">
                    {selectedPostData.title}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-secondary-foreground leading-relaxed mb-3">
                    {selectedPostData.metaDescription}
                  </p>
                  <div className="flex items-center justify-between gap-2 sm:gap-4 flex-wrap">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                      <button
                        onClick={() => copyToClipboard(selectedPostData)}
                        className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-white hover:opacity-80 transition-all px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg"
                        style={theme === 'light' ? {
                          background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                          color: '#000000'
                        } : {
                          background: '#241A06'
                        }}
                      >
                        {copiedId === selectedPostData.scenarioId ? (
                          <><Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Copied</>
                        ) : (
                          <><Copy className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> Copy</>
                        )}
                      </button>
                      
                      <div className="relative group">
                        <button
                          disabled={exportingSingle === selectedPostData.contentId}
                          className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium text-white hover:opacity-80 transition-all disabled:opacity-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg"
                          style={theme === 'light' ? {
                            background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                            color: '#000000'
                          } : {
                            background: '#241A06'
                          }}
                        >
                          {exportingSingle === selectedPostData.contentId ? (
                            <><div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> <span className="hidden sm:inline">Exporting...</span></>
                          ) : (
                            <><Download className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Download</span></>
                          )}
                        </button>
                        
                        {exportingSingle !== selectedPostData.contentId && (
                          <div className="absolute left-0 top-full mt-2 w-32 bg-[#241A06] border border-[#AB8000]/30 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                            <button
                              onClick={() => downloadSingle(selectedPostData.contentId!, 'md')}
                              className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-t-lg transition-colors"
                            >
                              As Markdown
                            </button>
                            <button
                              onClick={() => downloadSingle(selectedPostData.contentId!, 'docx')}
                              className="w-full text-left px-3 py-2 text-xs text-white hover:bg-white/10 rounded-b-lg transition-colors"
                            >
                              As DOCX
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {selectedPostData.contentId && (
                        <button
                          onClick={() => toggleSaveBlog(selectedPostData.contentId!)}
                          disabled={savingBlog === selectedPostData.contentId}
                          className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium transition-all px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg disabled:opacity-50"
                          style={savedBlogs.has(selectedPostData.contentId) ? {
                            background: '#FFC004',
                            color: '#000000'
                          } : theme === 'light' ? {
                            background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                            color: '#000000'
                          } : {
                            background: '#241A06',
                            color: '#FFFFFF'
                          }}
                        >
                          {savingBlog === selectedPostData.contentId ? (
                            <><div className="w-3 h-3 sm:w-3.5 sm:h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" /> <span className="hidden sm:inline">Saving...</span></>
                          ) : savedBlogs.has(selectedPostData.contentId) ? (
                            <><BookmarkCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Saved</span></>
                          ) : (
                            <><Bookmark className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> <span className="hidden sm:inline">Save to Library</span></>
                          )}
                        </button>
                      )}
                    </div>
                    
                    {selectedPostData.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 sm:gap-2">
                        {selectedPostData.keywords.slice(0, 4).map((k, i) => (
                          <span 
                            key={i} 
                            className="text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium"
                            style={theme === 'light' ? {
                              background: 'linear-gradient(180deg, rgba(171, 128, 0, 0.15) 0%, rgba(255, 192, 4, 0.25) 50%, rgba(171, 128, 0, 0.15) 100%)',
                              color: '#000000'
                            } : {
                              background: '#241A06',
                              color: '#FFFFFF'
                            }}
                          >
                            {k}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Article Content - Centered, constrained width */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-10 py-4 sm:py-6">
                <article className="article-content text-xs sm:text-sm leading-relaxed">
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
