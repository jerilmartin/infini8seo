'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap, Target, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const MAX_TOTAL_BLOGS = 50;
const DEFAULT_TOTAL_BLOGS = 30;
const BLOG_TYPES = [
  { key: 'functional', label: 'Functional' },
  { key: 'transactional', label: 'Transactional' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'informational', label: 'Informational' }
] as const;

type BlogTypeKey = typeof BLOG_TYPES[number]['key'];
type BlogTypeAllocations = Record<BlogTypeKey, number>;

const DEFAULT_BLOG_TYPE_ALLOCATIONS: BlogTypeAllocations = {
  functional: 8,
  transactional: 8,
  commercial: 7,
  informational: 7
};

export default function Home() {
  const router = useRouter();
  const [niche, setNiche] = useState('');
  const [valuePropositions, setValuePropositions] = useState(['']);
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalBlogs, setTotalBlogs] = useState(DEFAULT_TOTAL_BLOGS);
  const [blogTypeAllocations, setBlogTypeAllocations] = useState<BlogTypeAllocations>(DEFAULT_BLOG_TYPE_ALLOCATIONS);

  const adjustAllocationsToTotal = (allocations: BlogTypeAllocations, newTotal: number): BlogTypeAllocations => {
    const sum = BLOG_TYPES.reduce((acc, type) => acc + allocations[type.key], 0);
    if (sum <= newTotal) {
      return allocations;
    }

    const updated: BlogTypeAllocations = { ...allocations };
    let reductionNeeded = sum - newTotal;

    for (const { key } of [...BLOG_TYPES].reverse()) {
      if (reductionNeeded <= 0) break;
      const currentValue = updated[key];
      const reduction = Math.min(currentValue, reductionNeeded);
      updated[key] = currentValue - reduction;
      reductionNeeded -= reduction;
    }

    return updated;
  };

  const handleTotalBlogsChange = (value: number) => {
    const sanitizedValue = Math.max(1, Math.min(MAX_TOTAL_BLOGS, value));
    setTotalBlogs(sanitizedValue);
    setBlogTypeAllocations(prev => adjustAllocationsToTotal(prev, sanitizedValue));
  };

  const handleAllocationChange = (typeKey: BlogTypeKey, value: number) => {
    const sanitizedValue = Math.max(0, Math.min(MAX_TOTAL_BLOGS, value));
    const otherSum = BLOG_TYPES.reduce((acc, type) => {
      if (type.key === typeKey) return acc;
      return acc + blogTypeAllocations[type.key];
    }, 0);
    const maxAllowed = Math.max(0, totalBlogs - otherSum);
    const adjustedValue = Math.min(sanitizedValue, maxAllowed);

    setBlogTypeAllocations(prev => ({
      ...prev,
      [typeKey]: adjustedValue
    } as BlogTypeAllocations));
  };

  const handleAddValueProp = () => {
    if (valuePropositions.length < 10) {
      setValuePropositions([...valuePropositions, '']);
    }
  };

  const handleRemoveValueProp = (index: number) => {
    if (valuePropositions.length > 1) {
      setValuePropositions(valuePropositions.filter((_, i) => i !== index));
    }
  };

  const handleValuePropChange = (index: number, value: string) => {
    const updated = [...valuePropositions];
    updated[index] = value;
    setValuePropositions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!niche.trim()) {
      setError('Please enter a business niche');
      return;
    }

    const validValueProps = valuePropositions.filter(vp => vp.trim());
    if (validValueProps.length === 0) {
      setError('Please enter at least one service specialty');
      return;
    }

    const allocationSum = BLOG_TYPES.reduce((acc, type) => acc + (blogTypeAllocations[type.key] || 0), 0);
    if (allocationSum !== totalBlogs) {
      setError('Please ensure the blog type allocations add up to your total blog count');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/generate-content`, {
        niche: niche.trim(),
        valuePropositions: validValueProps,
        tone,
        totalBlogs,
        blogTypeAllocations
      });

      const { jobId } = response.data;
      
      // Redirect to progress page
      router.push(`/progress/${jobId}`);
    } catch (err: any) {
      console.error('Error submitting job:', err);
      setError(err.response?.data?.message || 'Failed to start content generation');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Infini8 SEO - Generate Blog Posts 
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate up to 50 high-quality, SEO-optimized blog posts automatically with AI-powered research and content creation
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="card text-center">
            <Zap className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">Deep Research</h3>
            <p className="text-gray-600 text-sm">AI analyzes your niche with real-time market data</p>
          </div>
          <div className="card text-center">
            <Target className="w-10 h-10 text-indigo-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">50 Unique Posts</h3>
            <p className="text-gray-600 text-sm">Each tailored to different personas and pain points</p>
          </div>
          <div className="card text-center">
            <TrendingUp className="w-10 h-10 text-purple-600 mx-auto mb-3" />
            <h3 className="font-semibold text-lg mb-2">SEO Optimized</h3>
            <p className="text-gray-600 text-sm">Ready-to-publish content with keywords and structure</p>
          </div>
        </div>

        {/* Form */}
        <div className="card max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Niche Input */}
            <div>
              <label htmlFor="niche" className="block text-sm font-semibold text-gray-700 mb-2">
                Business Niche *
              </label>
              <input
                id="niche"
                type="text"
                value={niche}
                onChange={(e) => setNiche(e.target.value)}
                placeholder="e.g., Digital Marketing, Fitness Coaching, SaaS Solutions"
                className="input-field"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                What industry or niche is your business in?
              </p>
            </div>

            {/* Service Specialties */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Service/Specialties 
              </label>
              {valuePropositions.map((vp, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={vp}
                    onChange={(e) => handleValuePropChange(index, e.target.value)}
                    placeholder={`Specific point about your service `}
                    className="input-field flex-1"
                    disabled={loading}
                  />
                  {valuePropositions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveValueProp(index)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {valuePropositions.length < 10 && (
                <button
                  type="button"
                  onClick={handleAddValueProp}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={loading}
                >
                  + Add Another One
                </button>
              )}
              <p className="text-sm text-gray-500 mt-1">
                List specific points about your service or specialty that the content should highlight.
              </p>
            </div>

            {/* Total Blog Posts */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Number of Blog Posts *
              </label>
              <div className="space-y-3">
                <input
                  type="range"
                  min={1}
                  max={MAX_TOTAL_BLOGS}
                  value={totalBlogs}
                  onChange={(e) => handleTotalBlogsChange(Number(e.target.value))}
                  className="w-full"
                  disabled={loading}
                />
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>1</span>
                  <span className="font-semibold text-gray-900 text-base">{totalBlogs} posts</span>
                  <span>{MAX_TOTAL_BLOGS}</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={MAX_TOTAL_BLOGS}
                  value={totalBlogs}
                  onChange={(e) => handleTotalBlogsChange(Number(e.target.value))}
                  className="input-field w-full"
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Choose how many posts to generate (maximum of {MAX_TOTAL_BLOGS}).
              </p>
            </div>

            {/* Blog Type Distribution */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Blog Type Distribution
                </label>
                <span className={`text-xs ${totalBlogs - BLOG_TYPES.reduce((acc, type) => acc + blogTypeAllocations[type.key], 0) === 0 ? 'text-green-600' : 'text-orange-600'}`}>
                  Remaining: {totalBlogs - BLOG_TYPES.reduce((acc, type) => acc + blogTypeAllocations[type.key], 0)} posts
                </span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Allocate how many posts should be Functional, Transactional, Commercial, and Informational.
              </p>
              <div className="space-y-3">
                {BLOG_TYPES.map((type) => {
                  const currentValue = blogTypeAllocations[type.key];
                  const remaining = totalBlogs - BLOG_TYPES.reduce((acc, t) => acc + (t.key === type.key ? 0 : blogTypeAllocations[t.key]), currentValue);

                  return (
                    <div key={type.key} className="flex items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{type.label}</span>
                        <span className="text-xs text-gray-500">Currently: {currentValue} posts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleAllocationChange(type.key, currentValue - 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          disabled={loading || currentValue === 0}
                          aria-label={`Decrease ${type.label} posts`}
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={totalBlogs}
                          value={currentValue}
                          onChange={(e) => handleAllocationChange(type.key, Number(e.target.value))}
                          className="w-20 text-center input-field no-spinner"
                          disabled={loading}
                        />
                        <button
                          type="button"
                          onClick={() => handleAllocationChange(type.key, currentValue + 1)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-40"
                          disabled={loading || remaining <= 0}
                          aria-label={`Increase ${type.label} posts`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tone Selection */}
            <div>
              <label htmlFor="tone" className="block text-sm font-semibold text-gray-700 mb-2">
                Content Tone *
              </label>
              <select
                id="tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="input-field"
                disabled={loading}
              >
                <option value="professional">Professional</option>
                <option value="conversational">Conversational</option>
                <option value="authoritative">Authoritative</option>
                <option value="friendly">Friendly</option>
                <option value="technical">Technical</option>
                <option value="casual">Casual</option>
              </select>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Starting Content Generation...
                </span>
              ) : (
                `🚀 Generate ${totalBlogs} Blog Posts`
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Estimated time: 8-15 minutes • This will generate {totalBlogs} unique, research-backed blog posts
            </p>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-gray-500 text-sm">
          <p>Powered by Google Gemini AI • Production-grade content at scale</p>
        </div>
      </div>
    </div>
  );
}

