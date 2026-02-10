'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/utils/api';
import { UserMenu } from '@/components/UserMenu';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';

const CONTENT_TYPES = [
  { key: 'informational', label: 'Educational', desc: 'In-depth guides' },
  { key: 'functional', label: 'How-to', desc: 'Step-by-step' },
  { key: 'commercial', label: 'Comparisons', desc: 'Reviews' },
  { key: 'transactional', label: 'Product-led', desc: 'Solutions' },
] as const;

type ContentTypeKey = typeof CONTENT_TYPES[number]['key'];
type Allocations = Record<ContentTypeKey, number>;

const DEFAULT_ALLOCATIONS: Allocations = {
  informational: 10,
  functional: 8,
  commercial: 6,
  transactional: 6,
};

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'conversational', label: 'Conversational' },
  { value: 'authoritative', label: 'Authoritative' },
];

const MIN_WORD_COUNT = 500;
const MAX_WORD_COUNT = 2500;
const DEFAULT_WORD_COUNT = 1200;
const MAX_PER_TYPE = 15;

const SHOWCASE_ITEMS = [
  {
    title: 'The Ultimate Guide to Ranking Higher in 2025',
    description:
      'A comprehensive guide covering modern SEO fundamentals, ranking factors, and AI-driven search behavior.',
    type: 'Educational',
    readTime: 6,
    image: '/assets/1.png',
  },
  {
    title: 'How to Create Content That Actually Converts',
    description:
      'Step-by-step guidance on structuring content, aligning with user intent, and improving conversion rates.',
    type: 'How-to',
    readTime: 8,
    image: '/assets/2.png',
  },
  {
    title: 'Top 10 Strategies Your Competitors Are Using',
    description:
      'A competitive analysis highlighting effective strategies used by top-performing brands.',
    type: 'Comparison',
    readTime: 7,
    image: '/assets/3.png',
  },
  {
    title: 'Why Most Businesses Fail at Content Marketing',
    description:
      'An insight-driven breakdown of common mistakes, paired with solution-focused recommendations.',
    type: 'Product-led',
    readTime: 5,
    image: '/assets/4.png',
  },
];

function HomeContent() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [niche, setNiche] = useState('');
  const [valuePropositions, setValuePropositions] = useState<string[]>(['']);
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allocations, setAllocations] = useState<Allocations>(DEFAULT_ALLOCATIONS);
  const [targetWordCount, setTargetWordCount] = useState(DEFAULT_WORD_COUNT);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [credits, setCredits] = useState<number | null>(null);

  // Fetch user credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const response = await api.get('/api/user/credits');
        setCredits(response.data.credits);
      } catch (error) {
        console.error('Error fetching credits:', error);
      }
    };
    fetchCredits();
  }, []);

  const addValueProposition = () => {
    setValuePropositions([...valuePropositions, '']);
  };

  const updateValueProposition = (index: number, value: string) => {
    const updated = [...valuePropositions];
    updated[index] = value;
    setValuePropositions(updated);
  };

  const removeValueProposition = (index: number) => {
    if (valuePropositions.length > 1) {
      setValuePropositions(valuePropositions.filter((_, i) => i !== index));
    }
  };

  const totalPosts = CONTENT_TYPES.reduce((acc, t) => acc + allocations[t.key], 0);

  const handleAllocationChange = (key: ContentTypeKey, value: number) => {
    setAllocations((prev: Allocations) => ({ ...prev, [key]: Math.max(0, Math.min(MAX_PER_TYPE, value)) }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!niche.trim()) return setError('Enter a niche to continue');
    
    const filledPropositions = valuePropositions.filter(vp => vp.trim());
    if (filledPropositions.length === 0) return setError('Enter at least one value proposition');
    
    if (totalPosts === 0) return setError('Select at least one post type');

    setLoading(true);
    try {
      const response = await api.post('/api/generate-content', {
        niche: niche.trim(),
        valuePropositions: filledPropositions.map(vp => vp.trim()),
        tone,
        totalBlogs: totalPosts,
        blogTypeAllocations: allocations,
        targetWordCount,
      });
      router.push(`/progress/${response.data.jobId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong');
      setLoading(false);
    }
  };

  const nextSlide = () => setCurrentSlide((prev: number) => (prev + 1) % SHOWCASE_ITEMS.length);
  const prevSlide = () =>
    setCurrentSlide((prev: number) => (prev - 1 + SHOWCASE_ITEMS.length) % SHOWCASE_ITEMS.length);

  return (
    <div 
      className="min-h-screen font-sans relative overflow-hidden"
      style={{
        background: theme === 'dark' ? '#000000' : '#FFFEF9',
        color: theme === 'dark' ? '#ffffff' : '#000000'
      }}
    >
      {/* Dark mode golden blur - diagonal from top-left to bottom-right */}
      {theme === 'dark' && (
        <div 
          className="absolute pointer-events-none z-0"
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
          className="absolute pointer-events-none z-0"
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
      {/* Header */}
      <header className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold">
            infini8 <span className="text-[#C8A05F]">SEO</span>
          </span>
          <button 
            onClick={toggleTheme}
            className="hover:opacity-80 transition-opacity"
          >
            <img 
              src={theme === 'dark' ? '/assets/button.svg' : '/assets/button1.svg'} 
              alt="Theme Toggle" 
              className="w-10 h-10"
            />
          </button>
        </div>
        <div className="flex items-center gap-8">
          <button 
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            Content Factory
          </button>
          <button 
            onClick={() => router.push('/seo-scan')}
            className="text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            Site Insights
          </button>
          <UserMenu />
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-8 py-12 text-center relative z-10">
        <p 
          className="text-base mb-3 tracking-wide font-medium"
          style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
        >
          AI-Powered SEO Content Engine
        </p>
        <h1 
          key={theme}
          className="text-[88px] font-bold mb-12 leading-[0.9] tracking-tight"
          style={{
            fontFamily: '"Futura PT Heavy", "Futura PT", Futura, sans-serif',
            fontWeight: 900,
            background: theme === 'dark' 
              ? 'linear-gradient(90deg, rgb(70, 53, 2) 0%, rgb(118, 89, 3) 20%, rgb(248, 187, 5) 50%, rgb(118, 89, 3) 80%, rgb(70, 53, 2) 100%)' 
              : 'linear-gradient(90deg, rgb(70, 53, 2) 0%, rgb(118, 89, 3) 20%, rgb(248, 187, 5) 50%, rgb(118, 89, 3) 80%, rgb(70, 53, 2) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          CONTENT FACTORY
        </h1>

        {/* Content Form */}
        <div className="max-w-[580px] mx-auto relative">
          <form
            onSubmit={handleSubmit}
            className="relative rounded-[32px] p-8"
            style={{
              background: 'transparent',
              border: theme === 'dark' 
                ? '1px solid rgba(255, 192, 4, 0.15)'
                : '2px solid rgba(184, 134, 11, 0.3)',
              boxShadow: 'none'
            }}
          >
            {/* Your Niche */}
            <div className="mb-5 text-left">
              <label 
                className="text-sm mb-2 block font-semibold"
                style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
              >
                Your Niche
              </label>
              <input
                type="text"
                value={niche}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNiche(e.target.value)}
                placeholder="e.g., B2B SaaS, Personal Finance"
                className={`w-full px-4 py-3.5 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC004]/50 placeholder:text-gray-400 ${
                  theme === 'dark' ? 'bg-white text-black' : 'bg-white text-black border border-gray-300'
                }`}
                disabled={loading}
              />
            </div>

            {/* What You Offer */}
            <div className="mb-6 text-left">
              <label 
                className="text-sm mb-2 block font-semibold"
                style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
              >
                What You Offer
              </label>
              <div className="space-y-3">
                {valuePropositions.map((vp, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={vp}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateValueProposition(index, e.target.value)}
                      placeholder="A key service or unique angle"
                      className={`flex-1 px-4 py-3.5 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC004]/50 placeholder:text-gray-400 ${
                        theme === 'dark' ? 'bg-white text-black' : 'bg-white text-black border border-gray-300'
                      }`}
                      disabled={loading}
                    />
                    {valuePropositions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeValueProposition(index)}
                        disabled={loading}
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50"
                        style={{
                          background: theme === 'dark' ? 'rgba(255, 192, 4, 0.1)' : 'rgba(184, 134, 11, 0.1)',
                          color: theme === 'dark' ? '#FFC004' : '#B8860B'
                        }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addValueProposition}
                  disabled={loading}
                  className="text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ 
                    color: theme === 'dark' ? '#FFC004' : '#B8860B',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                >
                  + Add another
                </button>
              </div>
            </div>

            {/* Content Mix */}
            <div className="mb-6 text-left">
              <div className="flex items-center justify-between mb-4">
                <label 
                  className="text-sm font-medium tracking-widest"
                  style={{ 
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                >
                  CONTENT MIX
                </label>
                <span 
                  className="text-base font-semibold"
                  style={{ color: theme === 'dark' ? '#FFC004' : '#B8860B' }}
                >
                  {totalPosts} posts
                </span>
              </div>

              <div className="space-y-2.5">
                {CONTENT_TYPES.map((type) => {
                  const value = allocations[type.key];
                  return (
                    <div key={type.key} className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2.5">
                        <span 
                          className="text-base font-medium"
                          style={{ 
                            color: theme === 'dark' ? '#FFFFFF' : '#000000',
                            fontFamily: 'Montserrat, sans-serif'
                          }}
                        >
                          {type.label}
                        </span>
                        <span 
                          className="px-2.5 py-0.5 text-xs font-medium"
                          style={{
                            color: theme === 'dark' ? 'rgb(198, 184, 183)' : '#808080',
                            backgroundColor: theme === 'dark' ? 'rgb(75, 68, 48)' : 'rgb(230, 228, 220)',
                            border: 'none',
                            fontFamily: 'Montserrat, sans-serif',
                            borderRadius: '24px'
                          }}
                        >
                          {type.desc}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-white rounded-full px-1.5 py-1">
                        <button
                          type="button"
                          onClick={() => handleAllocationChange(type.key, value - 1)}
                          disabled={loading || value <= 0}
                          className="w-6 h-6 rounded-full bg-gray-100 text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold flex items-center justify-center"
                        >
                          −
                        </button>
                        <span className="w-7 text-center text-black font-bold text-sm tabular-nums">
                          {value}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAllocationChange(type.key, value + 1)}
                          disabled={loading || value >= MAX_PER_TYPE}
                          className="w-6 h-6 rounded-full bg-gray-100 text-black hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-base font-bold flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tone & Length */}
            <div className="grid grid-cols-2 gap-4 mb-7 text-left">
              <div>
                <label 
                  className="text-sm mb-2 block font-medium tracking-widest"
                  style={{ 
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                >
                  TONE
                </label>
                <select
                  value={tone}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTone(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC004]/50 appearance-none cursor-pointer"
                  style={{
                    background: theme === 'dark' ? '#FFFFFF' : '#FFFFFF',
                    color: '#000000',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                    fontFamily: 'Montserrat, sans-serif',
                    border: theme === 'dark' ? 'none' : '1px solid #d1d5db'
                  }}
                  disabled={loading}
                >
                  {TONES.map((t) => (
                    <option 
                      key={t.value} 
                      value={t.value}
                      style={{
                        background: '#FFFFFF',
                        color: '#000000'
                      }}
                    >
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label 
                  className="text-sm mb-2 block font-medium tracking-widest"
                  style={{ 
                    color: theme === 'dark' ? '#ffffff' : '#000000',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                >
                  LENGTH
                </label>
                <div className="flex items-center gap-3 bg-transparent">
                  <input
                    type="range"
                    min={MIN_WORD_COUNT}
                    max={MAX_WORD_COUNT}
                    step={100}
                    value={targetWordCount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetWordCount(Number(e.target.value))}
                    className="flex-1 h-1 bg-white rounded-full appearance-none cursor-pointer slider-thumb"
                    disabled={loading}
                    style={{
                      background: '#FFFFFF'
                    }}
                  />
                  <span 
                    className="text-sm font-medium w-14 text-right tabular-nums"
                    style={{ 
                      color: theme === 'dark' ? '#ffffff' : '#000000',
                      fontFamily: 'Montserrat, sans-serif'
                    }}
                  >
                    {targetWordCount}w
                  </span>
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || totalPosts === 0}
              className="w-full py-4 rounded-xl font-bold text-white text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              style={{
                background: '#AB8000',
                fontFamily: 'Montserrat, sans-serif'
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Starting...
                </>
              ) : (
                <>Create {totalPosts} post{totalPosts !== 1 ? 's' : ''}</>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Showcase Section */}
      <section className="max-w-7xl mx-auto px-8 py-16 relative z-10">
        <div className="mb-10">
          <h2 
            className="text-4xl font-bold mb-3 leading-tight"
            style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
          >
            Built for <span style={{ color: 'rgb(171, 128, 0)' }}>Search Visibility</span> Across
            <br />
            AI and Traditional Search
          </h2>
          <p 
            className="text-base font-medium"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
          >
            Create AI-optimized SEO-ready content that
            <br />
            ranks across search engines and AI answers.
          </p>
        </div>

        {/* Carousel */}
        <div className="relative">
          <div className="flex items-center gap-4">
            {/* Navigation Buttons */}
            <button
              onClick={prevSlide}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: theme === 'dark' ? '#1a1a1a' : 'rgba(255,255,255,0.8)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(184,134,11,0.3)',
                color: theme === 'dark' ? '#ffffff' : '#000000'
              }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Cards Container */}
            <div className="flex-1 overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${currentSlide * 100}%)` }}
              >
                {SHOWCASE_ITEMS.map((item, idx) => (
                  <div key={idx} className="w-full flex-shrink-0 px-3">
                    <div
                      className="rounded-3xl p-10 flex gap-10 relative"
                      style={{
                        background: theme === 'dark' ? 'rgb(49, 49, 46)' : 'rgb(200, 200, 200)',
                        border: 'none'
                      }}
                    >
                      {/* Sparkle decorations */}
                      <div className="absolute top-6 right-20 w-2 h-2 bg-[#FFC004] rounded-full opacity-60 animate-pulse"></div>
                      <div
                        className="absolute top-12 right-32 w-1.5 h-1.5 bg-[#FFC004] rounded-full opacity-40 animate-pulse"
                        style={{ animationDelay: '0.5s' }}
                      ></div>
                      <div
                        className="absolute bottom-10 right-24 w-1.5 h-1.5 bg-[#FFC004] rounded-full opacity-50 animate-pulse"
                        style={{ animationDelay: '1s' }}
                      ></div>
                      <div
                        className="absolute bottom-16 right-16 w-2 h-2 bg-[#FFC004] rounded-full opacity-30 animate-pulse"
                        style={{ animationDelay: '1.5s' }}
                      ></div>

                      <div className="flex-1 flex flex-col justify-center">
                        <h3 
                          className="text-4xl font-bold mb-6 leading-tight"
                          style={{ color: 'rgb(171, 128, 0)' }}
                        >
                          {item.title}
                        </h3>
                        <p 
                          className="text-lg mb-6 leading-relaxed"
                          style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
                        >
                          {item.description}
                        </p>
                        <div className="flex items-center gap-2 mb-8">
                          <span 
                            className="text-sm font-medium"
                            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#000000' }}
                          >
                            {item.type}
                          </span>
                          <span style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.3)' : '#000000' }}>·</span>
                          <span 
                            className="text-sm"
                            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#000000' }}
                          >
                            {item.readTime} min read
                          </span>
                        </div>
                        <button
                          className="px-8 py-3.5 rounded-xl font-bold text-white text-sm transition-all shadow-lg hover:shadow-xl w-fit"
                          style={{
                            background: 'linear-gradient(to right, rgb(70, 53, 2) 0%, rgb(118, 89, 3) 30%, rgb(248, 187, 5) 100%)',
                          }}
                        >
                          Book a demo
                        </button>
                      </div>
                      <div className="relative w-[320px] h-[240px] flex-shrink-0">
                        {/* Golden glow behind image - positioned absolutely to extend beyond container */}
                        <div 
                          className="absolute"
                          style={{
                            width: '360px',
                            height: '280px',
                            background: 'radial-gradient(ellipse, rgba(255, 192, 4, 0.7) 0%, rgba(255, 192, 4, 0.5) 25%, rgba(255, 192, 4, 0.3) 45%, transparent 70%)',
                            filter: 'blur(50px)',
                            zIndex: 0,
                            left: '50%',
                            top: '50%',
                            transform: 'translate(-50%, -50%)'
                          }}
                        />
                        <div
                          className="absolute inset-0 rounded-[20px] overflow-hidden"
                          style={{
                            background: '#FFC004',
                            zIndex: 1
                          }}
                        >
                          <div 
                            className="absolute bg-white rounded-[16px] overflow-hidden"
                            style={{
                              top: '4px',
                              left: '4px',
                              right: '4px',
                              bottom: '4px'
                            }}
                          >
                            <img
                              src={item.image}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={nextSlide}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0"
              style={{
                background: theme === 'dark' ? '#1a1a1a' : 'rgba(255,255,255,0.8)',
                border: theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(184,134,11,0.3)',
                color: theme === 'dark' ? '#ffffff' : '#000000'
              }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Dots Indicator */}
          <div className="flex justify-center gap-2 mt-6">
            {SHOWCASE_ITEMS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className="h-2 rounded-full transition-all"
                style={{
                  background: idx === currentSlide 
                    ? (theme === 'dark' ? '#FFC004' : '#B8860B')
                    : (theme === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(26,26,26,0.2)'),
                  width: idx === currentSlide ? '24px' : '8px'
                }}
              />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <HomeContent />
    </ProtectedRoute>
  );
}
