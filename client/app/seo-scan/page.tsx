'use client';

import React, { useState, lazy, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, ArrowUpRight } from 'lucide-react';
import { api } from '@/utils/api';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';

// Lazy load components
const Navbar = lazy(() => import('@/components/Navbar'));

function SeoScanContent() {
  const router = useRouter();
  const { theme } = useTheme();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (!url.trim()) {
      return setError('Please enter a URL to scan');
    }

    setLoading(true);
    try {
      const response = await api.post('/api/scan-seo', {
        url: url.trim()
      });
      
      router.push(`/seo-results/${response.data.scanId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to initiate SEO scan');
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen font-sans relative overflow-hidden"
      style={{ 
        background: theme === 'dark' ? '#000000' : '#FFFFFF'
      }}
    >
      {/* Golden blur in center for dark mode */}
      {theme === 'dark' && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 40% 50% at 50% 50%, rgba(255, 192, 4, 0.15) 0%, rgba(255, 192, 4, 0.08) 30%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
      )}
      
      {/* Golden blur in center for light mode */}
      {theme === 'light' && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 40% 50% at 50% 50%, rgba(171, 128, 0, 0.15) 0%, rgba(171, 128, 0, 0.08) 30%, transparent 70%)',
            filter: 'blur(80px)'
          }}
        />
      )}

      {/* NAVBAR */}
      <div className="relative z-20">
        <Suspense fallback={<div className="h-16" />}>
          <Navbar />
        </Suspense>
      </div>

      {/* HERO CONTAINER */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-8 sm:pb-12 relative z-10">
        
        {/* EYEBROW - centered at top */}
        <p 
          className="text-sm tracking-[0.12em] mb-4 uppercase text-center font-semibold"
          style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
        >
          AI-Powered SEO Content Engine
        </p>

        {/* MAIN HEADING - CENTERED ABOVE EVERYTHING */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 
            className="text-5xl sm:text-6xl md:text-7xl lg:text-[100px] font-black leading-none tracking-tight inline-block"
            style={{
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, rgb(70, 53, 2) 0%, rgb(118, 89, 3) 20%, rgb(248, 187, 5) 50%, rgb(118, 89, 3) 80%, rgb(70, 53, 2) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 4px 20px rgba(212, 168, 61, 0.3)'
            }}
          >
            SITE INSIGHTS
          </h1>
        </div>

        {/* BOTTOM SECTION - Search Form LEFT, Score Cards RIGHT */}
        <div className="flex flex-col lg:flex-row items-start justify-between gap-6 lg:gap-8 max-w-[1450px] mx-auto">
          
          {/* LEFT SECTION - Search Form */}
          <div className="flex-shrink-0 w-full lg:w-[650px]">
            {/* Description */}
            <p 
              className="text-sm sm:text-base leading-relaxed mb-6 sm:mb-8"
              style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
            >
              Scan any website to evaluate its SEO health and discover actionable opportunities to improve search performance.
            </p>
            
            <form onSubmit={handleSubmit}>
              {/* LABEL */}
              <label 
                className="block text-xs sm:text-sm tracking-[0.08em] mb-3 uppercase"
                style={{ 
                  color: theme === 'dark' ? '#FFFFFF' : '#000000',
                  fontWeight: 600
                }}
              >
                WEBSITE URL :
              </label>
              
              {/* INPUT AND BUTTON - INLINE */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                  placeholder="e.g. example.com or https://example.com"
                  className="flex-1 h-[64px] sm:h-[52px] lg:h-[48px] rounded-xl bg-white text-[#333] px-5 text-base border-none outline-none placeholder:text-[#999] shadow-lg w-full"
                  style={{ minHeight: '64px' }}
                  disabled={loading}
                />
                
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="h-[64px] sm:h-[52px] lg:h-[48px] px-6 rounded-xl font-bold text-base sm:text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all hover:scale-105 hover:shadow-xl whitespace-nowrap w-full sm:w-auto"
                  style={{
                    background: '#C19207 !important',
                    backgroundColor: '#C19207',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(193, 146, 7, 0.5)',
                    minHeight: '64px'
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#FFC004' }} />
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>Scan for SEO</span>
                    </>
                  )}
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  {error}
                </div>
              )}
            </form>
          </div>

          {/* RIGHT SECTION - SVG Images */}
          <div className="hidden lg:flex flex-shrink-0 relative w-full lg:w-[600px]" style={{ height: '320px' }}>
            {theme === 'dark' ? (
              <>
                {/* Dark mode - BOX5.svg with glass effect */}
                <div
                  className="absolute"
                  style={{
                    right: '-50px',
                    top: '20px',
                    width: '650px',
                    height: 'auto'
                  }}
                >
                  <img 
                    src="/assets/BOX5.png" 
                    alt="SEO Score Card" 
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block',
                      filter: 'drop-shadow(0 8px 32px rgba(0, 0, 0, 0.5))',
                      backdropFilter: 'blur(40px) saturate(180%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(180%)'
                    }}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Light mode - BOX6.png */}
                <div
                  className="absolute"
                  style={{
                    right: '-50px',
                    top: '20px',
                    width: '650px',
                    height: 'auto'
                  }}
                >
                  <img 
                    src="/assets/BOX6.png" 
                    alt="SEO Score Card" 
                    style={{
                      width: '100%',
                      height: 'auto',
                      display: 'block'
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* SECTION TITLE - mt-12, mb-8 */}
        <div className="mt-12 mb-8">
          <h2 
            className="text-2xl sm:text-3xl font-bold leading-tight"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
          >
            See Your Website<br />
            Through an AI<br />
            SEO Lens
          </h2>
        </div>

        {/* FEATURE CARDS GRID - Responsive: 1 col mobile, 2 cols tablet, 4 cols desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          
          {/* Card 1 - Dark with smaller gold moon showing bottom-right portion only */}
          <div 
            className="h-[400px] sm:h-[500px] lg:h-[580px] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: theme === 'dark' ? 'rgb(46, 39, 23)' : 'rgb(230, 228, 224)' }}
          >
            {/* Smaller moon - showing more of bottom-right portion */}
            <div 
              className="absolute -top-16 sm:-top-24 -left-16 sm:-left-24 w-32 sm:w-48 h-32 sm:h-48 rounded-full"
              style={{ 
                background: 'radial-gradient(circle, #B8922F 0%, #9C7420 40%, rgba(156, 116, 32, 0.4) 70%, transparent 100%)'
              }}
            />
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#000000' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 leading-tight" style={{ color: theme === 'dark' ? '#B8922F' : '#000000' }}>
                  Domain Health<br />Score
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: theme === 'dark' ? '#A0A0A0' : '#000000' }}>
                  A clear 0–100 score that summarizes your website's overall SEO health and readiness for search visibility.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 - Light with 4-point concave Bézier star */}
          <div 
            className="h-[400px] sm:h-[500px] lg:h-[580px] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: theme === 'dark' ? '#F5F3EE' : '#453400' }}
          >
            {/* Star SVG with improved quality - touching top-left corner */}
            <div className="absolute top-0 left-0" style={{ transform: 'translate(-2px, -2px)' }}>
              <svg width="80" height="84" viewBox="0 0 119 126" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 sm:w-28 sm:h-28 lg:w-[120px] lg:h-[120px]" style={{ shapeRendering: 'geometricPrecision', imageRendering: 'crisp-edges' }}>
                <defs>
                  <filter id="antialiasing_star" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur1"/>
                    <feColorMatrix in="blur1" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 25 -12" result="sharp"/>
                    <feGaussianBlur in="sharp" stdDeviation="0.2" result="final"/>
                  </filter>
                </defs>
                <g>
                  <path d="M85.3776 49.6549C67.8445 47.9656 53.971 34.0986 52.2836 16.5804L49.4365 -13L46.5895 16.5804C44.902 34.1016 31.0285 47.9685 13.4955 49.6549L-16.0635 52.5L13.4955 55.3451C31.0285 57.0344 44.902 70.9014 46.5895 88.4196L49.4365 118L52.2836 88.4196C53.971 70.8984 67.8445 57.0314 85.3776 55.3451L114.937 52.5L85.3776 49.6549Z" fill="#AB8000" filter="url(#antialiasing_star)" stroke="none"/>
                </g>
              </svg>
            </div>
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 leading-tight" style={{ color: theme === 'dark' ? '#B8922F' : '#F4D47C' }}>
                  Keyword &<br />Ranking Insights
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: theme === 'dark' ? '#000000' : 'rgba(255, 255, 255, 0.9)' }}>
                  Discover ranking keywords and understand how your site performs across sampled SERP positions.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 - Gold with concentric quarter circles (dartboard target) */}
          <div 
            className="h-[400px] sm:h-[500px] lg:h-[580px] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #B8922F 0%, #9C7420 100%)' : '#FFC004' }}
          >
            {/* Target SVG from file - touching top-left corner */}
            <div className="absolute top-0 left-0">
              <img 
                src="/assets/target.svg" 
                alt="" 
                className="w-[60px] h-[60px] sm:w-[70px] sm:h-[70px] lg:w-[85px] lg:h-[85px]"
              />
            </div>
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#000000' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 leading-tight" style={{ color: theme === 'dark' ? 'white' : '#000000' }}>
                  Competitor<br />Landscape
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.95)' : '#000000' }}>
                  Identify direct and content-level competitors competing for the same search visibility.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4 - Dark teal/blue with bulb design at top-left corner */}
          <div 
            className="h-[400px] sm:h-[500px] lg:h-[580px] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: theme === 'dark' ? 'rgb(46, 39, 23)' : 'rgb(230, 228, 224)' }}
          >
            {/* Bulb SVG from file - scaled and positioned to touch corner */}
            <div className="absolute sm:scale-[1.5] lg:scale-[1.7]" style={{ top: '-5px', left: '-5px', transform: 'scale(1.3)', transformOrigin: 'top left' }}>
              <img 
                src="/assets/bulb.svg" 
                alt="" 
                className="w-[120px] h-[120px] sm:w-[140px] sm:h-[140px] lg:w-[150px] lg:h-[150px]"
              />
            </div>
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#000000' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 leading-tight" style={{ color: theme === 'dark' ? '#B8922F' : '#B8922F' }}>
                  Strategic SEO<br />Actions
                </h3>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: theme === 'dark' ? '#A0A0A0' : '#000000' }}>
                  Receive prioritized, actionable recommendations to improve rankings and organic performance.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function SeoScanPage() {
  return (
    <ProtectedRoute>
      <SeoScanContent />
    </ProtectedRoute>
  );
}
