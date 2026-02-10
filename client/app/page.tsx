'use client';

import React, { useState } from 'react';
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
  const [valueProposition, setValueProposition] = useState('');
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allocations, setAllocations] = useState<Allocations>(DEFAULT_ALLOCATIONS);
  const [targetWordCount, setTargetWordCount] = useState(DEFAULT_WORD_COUNT);
  const [currentSlide, setCurrentSlide] = useState(0);

  const totalPosts = CONTENT_TYPES.reduce((acc, t) => acc + allocations[t.key], 0);

  const handleAllocationChange = (key: ContentTypeKey, value: number) => {
    setAllocations((prev: Allocations) => ({ ...prev, [key]: Math.max(0, Math.min(MAX_PER_TYPE, value)) }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!niche.trim()) return setError('Enter a niche to continue');
    if (!valueProposition.trim()) return setError('Enter what you offer');
    if (totalPosts === 0) return setError('Select at least one post type');

    setLoading(true);
    try {
      const response = await api.post('/api/generate-content', {
        niche: niche.trim(),
        valuePropositions: [valueProposition.trim()],
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
      {/* Dark mode golden blur centered behind the card */}
      {theme === 'dark' && (
        <div 
          className="absolute pointer-events-none z-0"
          style={{
            top: '35%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%',
            height: '55%',
            background: 'radial-gradient(ellipse 80% 80% at 50% 50%, rgba(255, 192, 4, 0.35) 0%, rgba(255, 192, 4, 0.25) 30%, rgba(255, 192, 4, 0.1) 60%, transparent 80%)',
            filter: 'blur(140px)'
          }}
        />
      )}
      {/* Light mode golden blur at bottom */}
      {theme === 'light' && (
        <div 
          className="absolute bottom-0 left-0 right-0 pointer-events-none z-0"
          style={{
            height: '50%',
            background: 'radial-gradient(ellipse 120% 100% at 50% 100%, rgba(255, 192, 4, 0.12) 0%, rgba(255, 192, 4, 0.06) 50%, transparent 100%)',
            filter: 'blur(60px)'
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
            background: theme === 'dark' 
              ? 'linear-gradient(135deg, #FFC004 0%, #FFD04A 50%, #FFA500 100%)' 
              : 'linear-gradient(135deg, #B8860B 0%, #DAA520 50%, #B8860B 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}
        >
          CONTENT FACTORY
        </h1>

        {/* Content Form */}
        <div className="max-w-[580px] mx-auto relative">
          {/* Blur effect behind card */}
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse 120% 120% at 50% 50%, rgba(171, 128, 0, 0.15) 0%, rgba(171, 128, 0, 0.08) 40%, transparent 70%)',
              filter: 'blur(80px)',
              transform: 'scale(1.2)',
              zIndex: -1
            }}
          />
          
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
                style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : '#000000' }}
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
                style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : '#000000' }}
              >
                What You Offer
              </label>
              <input
                type="text"
                value={valueProposition}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValueProposition(e.target.value)}
                placeholder="A key service or unique angle"
                className={`w-full px-4 py-3.5 rounded-xl text-base font-medium focus:outline-none focus:ring-2 focus:ring-[#FFC004]/50 placeholder:text-gray-400 ${
                  theme === 'dark' ? 'bg-white text-black' : 'bg-white text-black border border-gray-300'
                }`}
                disabled={loading}
              />
            </div>

            {/* Content Mix */}
            <div className="mb-6 text-left">
              <div className="flex items-center justify-between mb-4">
                <label 
                  className="text-xs font-bold tracking-widest"
                  style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#000000' }}
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
                          className="text-base font-semibold"
                          style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
                        >
                          {type.label}
                        </span>
                        <span 
                          className="px-2.5 py-0.5 rounded-md text-xs font-semibold"
                          style={{
                            color: theme === 'dark' ? '#ffffff' : '#000000',
                            backgroundColor: 'transparent',
                            border: `1px solid ${theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'}`
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
                  className="text-[11px] mb-2 block font-bold tracking-widest"
                  style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#000000' }}
                >
                  TONE
                </label>
                <select
                  value={tone}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTone(e.target.value)}
                  className="w-full bg-white text-black px-4 py-3.5 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FFC004]/50 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23000' d='M6 9L1 4h10z'/%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center',
                  }}
                  disabled={loading}
                >
                  {TONES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label 
                  className="text-[11px] mb-2 block font-bold tracking-widest"
                  style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#000000' }}
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
                    className="flex-1 h-1 bg-white/20 rounded-full appearance-none cursor-pointer slider-thumb"
                    disabled={loading}
                    style={{
                      background: `linear-gradient(to right, #FFC004 0%, #FFC004 ${
                        ((targetWordCount - MIN_WORD_COUNT) / (MAX_WORD_COUNT - MIN_WORD_COUNT)) *
                        100
                      }%, rgba(255,255,255,0.2) ${
                        ((targetWordCount - MIN_WORD_COUNT) / (MAX_WORD_COUNT - MIN_WORD_COUNT)) *
                        100
                      }%, rgba(255,255,255,0.2) 100%)`,
                    }}
                  />
                  <span 
                    className="text-sm font-bold w-14 text-right tabular-nums"
                    style={{ color: theme === 'dark' ? '#ffffff' : '#000000' }}
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
              className="w-full py-4 rounded-xl font-bold text-black text-base disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
              style={{
                background: 'linear-gradient(135deg, #FFC004 0%, #FFD04A 50%, #FFA500 100%)',
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
            Built for <span style={{ color: theme === 'dark' ? '#FFC004' : '#B8860B' }}>Search Visibility</span> Across
            <br />
            AI and Traditional Search
          </h2>
          <p 
            className="text-base font-medium"
            style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.6)' : '#000000' }}
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
                        background: theme === 'dark'
                          ? 'rgba(30, 30, 30, 0.3)'
                          : 'rgba(255, 255, 255, 0.3)',
                        border: theme === 'dark' 
                          ? '1px solid rgba(255, 255, 255, 0.1)'
                          : '1px solid rgba(184, 134, 11, 0.15)',
                        backdropFilter: 'blur(10px)'
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
                          style={{ color: theme === 'dark' ? '#FFC004' : '#B8860B' }}
                        >
                          {item.title}
                        </h3>
                        <p 
                          className="text-lg mb-6 leading-relaxed"
                          style={{ color: theme === 'dark' ? 'rgba(255,255,255,0.7)' : '#000000' }}
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
                          className="px-8 py-3.5 rounded-xl font-bold text-black text-sm transition-all shadow-lg hover:shadow-xl w-fit"
                          style={{
                            background:
                              'linear-gradient(135deg, #FFC004 0%, #FFD04A 50%, #FFA500 100%)',
                          }}
                        >
                          Book a demo
                        </button>
                      </div>
                      <div
                        className="w-[380px] h-[300px] rounded-2xl flex items-center justify-center relative overflow-hidden flex-shrink-0"
                        style={{
                          background: 'linear-gradient(135deg, #FFC004 0%, #FFD04A 100%)',
                          padding: '3px',
                        }}
                      >
                        <div className="w-full h-full bg-white rounded-2xl overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="w-full h-full object-cover"
                          />
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
