'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Download, Copy, Check, ExternalLink, Home, ChevronDown, ChevronUp } from 'lucide-react';
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
  imageUrls?: Array<{
    url: string;
    alt?: string;
    photographer?: string;
    photographerUrl?: string;
  }>;
}

interface ContentData {
  jobId: string;
  niche: string;
  tone: string;
  completedAt: string;
  stats: {
    totalPosts: number;
    avgWordCount: number;
    totalWords: number;
  };
  content: BlogPost[];
}

export default function ResultsPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  const [contentData, setContentData] = useState<ContentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set([1])); // First post expanded by default
  const [copiedId, setCopiedId] = useState<number | null>(null);

  useEffect(() => {
    if (!jobId) return;

    const fetchContent = async () => {
      try {
        const response = await axios.get(`${API_URL}/api/content/${jobId}`);
        setContentData(response.data);
      } catch (err: any) {
        console.error('Error fetching content:', err);
        setError(err.response?.data?.message || 'Failed to fetch content');
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [jobId]);

  const togglePost = (scenarioId: number) => {
    const newExpanded = new Set(expandedPosts);
    if (newExpanded.has(scenarioId)) {
      newExpanded.delete(scenarioId);
    } else {
      newExpanded.add(scenarioId);
    }
    setExpandedPosts(newExpanded);
  };

  const expandAll = () => {
    if (contentData) {
      setExpandedPosts(new Set(contentData.content.map(p => p.scenarioId)));
    }
  };

  const collapseAll = () => {
    setExpandedPosts(new Set());
  };

  const copyToClipboard = async (post: BlogPost) => {
    try {
      await navigator.clipboard.writeText(post.content);
      setCopiedId(post.scenarioId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const downloadMarkdown = (post: BlogPost) => {
    const blob = new Blob([post.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${post.slug || `post-${post.scenarioId}`}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAllAsZip = async () => {
    // For simplicity, download as concatenated markdown
    // In production, you might want to use a library like JSZip
    if (!contentData) return;

    const allContent = contentData.content
      .map(post => `\n\n${'='.repeat(80)}\n${post.title}\n${'='.repeat(80)}\n\n${post.content}`)
      .join('\n\n');

    const blob = new Blob([allContent], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contentData.niche.replace(/\s+/g, '-').toLowerCase()}-all-posts.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (!contentData) return null;

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🎉 Content Generated Successfully!
          </h1>
          <p className="text-lg text-gray-600 mb-4">
            Niche: <span className="font-semibold">{contentData.niche}</span> • Tone: <span className="font-semibold capitalize">{contentData.tone}</span>
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card text-center">
            <div className="text-3xl font-bold text-blue-600">{contentData.stats?.totalPosts || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Blog Posts Generated</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-indigo-600">{contentData.stats?.avgWordCount || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Average Word Count</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-purple-600">{(contentData.stats?.totalWords || 0).toLocaleString()}</div>
            <div className="text-sm text-gray-600 mt-1">Total Words Generated</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="card mb-8">
          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={downloadAllAsZip} className="btn-primary flex items-center">
              <Download className="w-5 h-5 mr-2" />
              Download All Posts
            </button>
            <button onClick={expandAll} className="btn-secondary flex items-center">
              <ChevronDown className="w-5 h-5 mr-2" />
              Expand All
            </button>
            <button onClick={collapseAll} className="btn-secondary flex items-center">
              <ChevronUp className="w-5 h-5 mr-2" />
              Collapse All
            </button>
            <button onClick={() => router.push('/')} className="btn-secondary flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Generate More
            </button>
          </div>
        </div>

        {/* Blog Posts List */}
        <div className="space-y-4">
          {contentData.content.map((post) => {
            const isExpanded = expandedPosts.has(post.scenarioId);
            const isCopied = copiedId === post.scenarioId;

            return (
              <div key={post.scenarioId} className="card">
                {/* Post Header */}
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => togglePost(post.scenarioId)}
                >
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mr-2">
                        #{post.scenarioId}
                      </span>
                      <span className="inline-block bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-1 rounded mr-2">
                        {post.personaArchetype}
                      </span>
                      {post.blogType && (
                        <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
                          {post.blogType.charAt(0).toUpperCase() + post.blogType.slice(1)}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">{post.title}</h2>
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="mr-4">{post.wordCount} words</span>
                      <div className="flex flex-wrap gap-1">
                        {post.keywords.slice(0, 3).map((keyword, idx) => (
                          <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    {isExpanded ? (
                      <ChevronUp className="w-6 h-6 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    {/* Action Buttons */}
                    <div className="flex gap-2 mb-6">
                      <button
                        onClick={() => copyToClipboard(post)}
                        className="text-sm px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors flex items-center"
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => downloadMarkdown(post)}
                        className="text-sm px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors flex items-center"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </button>
                    </div>

                    {/* Meta Description */}
                    {post.metaDescription && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h4 className="text-sm font-semibold text-gray-700 mb-1">Meta Description:</h4>
                        <p className="text-sm text-gray-600">{post.metaDescription}</p>
                      </div>
                    )}

                    {/* Image Credits */}
                    {post.imageUrls && post.imageUrls.length > 0 && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg text-sm text-blue-800 space-y-2">
                        <h4 className="font-semibold">Image Sources</h4>
                        {post.imageUrls.map((image, idx) => (
                          <div key={idx}>
                            <span>Photo by </span>
                            {image.photographerUrl ? (
                              <a
                                href={image.photographerUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline"
                              >
                                {image.photographer || 'Unsplash photographer'}
                              </a>
                            ) : (
                              <span>{image.photographer || 'Unsplash photographer'}</span>
                            )}
                            <span> on </span>
                            <a
                              href="https://unsplash.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline"
                            >
                              Unsplash
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Blog Content */}
                    <div className="prose prose-lg max-w-none">
                      <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                        {post.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <button onClick={() => router.push('/')} className="btn-primary">
            Generate More Content
          </button>
        </div>
      </div>
    </div>
  );
}

