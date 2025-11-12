'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Zap, Target, TrendingUp } from 'lucide-react';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function Home() {
  const router = useRouter();
  const [niche, setNiche] = useState('');
  const [valuePropositions, setValuePropositions] = useState(['']);
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      setError('Please enter at least one value proposition');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/generate-content`, {
        niche: niche.trim(),
        valuePropositions: validValueProps,
        tone
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
            Content Factory
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Generate 50 high-quality, SEO-optimized blog posts automatically with AI-powered research and content creation
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

            {/* Value Propositions */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Value Propositions * (1-10)
              </label>
              {valuePropositions.map((vp, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={vp}
                    onChange={(e) => handleValuePropChange(index, e.target.value)}
                    placeholder={`Value proposition ${index + 1}`}
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
                  + Add Another Value Proposition
                </button>
              )}
              <p className="text-sm text-gray-500 mt-1">
                What unique benefits does your business offer?
              </p>
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
                '🚀 Generate 50 Blog Posts'
              )}
            </button>

            <p className="text-xs text-gray-500 text-center">
              Estimated time: 10-15 minutes • This will generate 50 unique blog posts
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

