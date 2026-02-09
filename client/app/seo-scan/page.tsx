'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, ArrowUpRight } from 'lucide-react';
import { api } from '@/utils/api';
import { UserMenu } from '@/components/UserMenu';
import { ProtectedRoute } from '@/components/ProtectedRoute';

function SeoScanContent() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

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
    <div className="min-h-screen font-sans relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, rgba(212, 168, 61, 0.08) 0%, #000000 60%)' }}>
      {/* Ambient gold glow - center-left, subtle */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 50% 40% at 35% 45%, rgba(156, 116, 32, 0.18), transparent 60%)'
        }}
      />

      {/* NAVBAR - 64px */}
      <header className="h-16 px-12 flex items-center justify-between relative z-20">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold">
            infini8 <span className="bg-gradient-to-b from-[#F6D77A] to-[#8F6B1E] bg-clip-text text-transparent">SEO</span>
          </span>
          <button onClick={toggleTheme} className="hover:opacity-80 transition-opacity">
            <img 
              src={theme === 'dark' ? '/assets/button.svg' : '/assets/button1.svg'} 
              alt="Theme Toggle" 
              className="w-auto h-7"
            />
          </button>
        </div>
        <div className="flex items-center gap-8">
          <button 
            onClick={() => router.push('/library')}
            className="text-sm font-medium text-[#EAEAEA] hover:text-white transition-colors"
          >
            Content Factory
          </button>
          <button className="text-sm font-medium text-[#EAEAEA] relative pb-0.5">
            Site Insights
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4A83D]" />
          </button>
          <UserMenu />
        </div>
      </header>

      {/* HERO CONTAINER */}
      <div className="max-w-[1400px] mx-auto px-12 pt-12 pb-12 relative z-10">
        
        {/* EYEBROW - centered at top */}
        <p className="text-xs tracking-[0.12em] text-[#9A9A9A] mb-6 uppercase text-center">
          AI-Powered SEO Content Engine
        </p>

        {/* MAIN HEADING - CENTERED ABOVE EVERYTHING */}
        <div className="text-center mb-12">
          <h1 
            className="text-[130px] font-black leading-none tracking-tight inline-block"
            style={{
              letterSpacing: '-0.02em',
              background: 'linear-gradient(180deg, #FFC004 0%, #E8AF05 25%, #C19207 50%, #131111 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              textShadow: '0 4px 20px rgba(212, 168, 61, 0.3)'
            }}
          >
            SEO SCANNER
          </h1>
        </div>

        {/* BOTTOM SECTION - Search Form LEFT, Score Cards RIGHT */}
        <div className="flex items-start justify-between gap-3 max-w-[1450px] mx-auto">
          
          {/* LEFT SECTION - Search Form */}
          <div className="flex-shrink-0 w-[650px]">
            {/* Description */}
            <p className="text-sm leading-relaxed text-white/80 mb-8">
              Scan any website to evaluate its SEO health and discover actionable opportunities to improve search performance.
            </p>
            
            <form onSubmit={handleSubmit}>
              {/* LABEL */}
              <label className="block text-xs tracking-[0.08em] text-white/60 mb-3 font-medium uppercase">
                WEBSITE URL :
              </label>
              
              {/* INPUT AND BUTTON - INLINE */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={url}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
                  placeholder="e.g. example.com or https://example.com"
                  className="flex-1 h-[48px] rounded-xl bg-white text-[#333] px-5 text-sm border-none outline-none placeholder:text-[#999] shadow-lg"
                  disabled={loading}
                />
                
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="h-[48px] px-6 rounded-xl font-bold text-black text-sm border-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all hover:scale-105 hover:shadow-xl whitespace-nowrap"
                  style={{
                    background: 'linear-gradient(180deg, #D4A83D 0%, #B8922F 50%, #9C7420 100%)',
                    boxShadow: '0 4px 20px rgba(212, 168, 61, 0.4)'
                  }}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
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

          {/* RIGHT SECTION - Score Cards (overlapping only at bottom) */}
          <div className="flex-shrink-0 relative" style={{ width: '540px', height: '280px' }}>
            
            {/* Card 1 - Left card, more tilt to left */}
            <div 
              className="absolute w-[300px] h-[250px] rounded-[24px] p-6"
              style={{
                left: '0',
                top: '0',
                background: 'linear-gradient(145deg, #1A1A1A 0%, #0E0E0E 100%)',
                transform: 'rotate(-11deg)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(156, 116, 32, 0.15)',
                border: '1.5px solid rgba(212, 168, 61, 0.15)'
              }}
            >
              <div style={{ fontSize: '10px', letterSpacing: '0.15em' }} className="text-[#888] mb-3 uppercase font-medium">SEO HEALTH SCORE</div>
              <div 
                style={{ 
                  fontSize: '28px',
                  lineHeight: '1',
                  fontWeight: '900',
                  marginBottom: '14px',
                  background: 'linear-gradient(180deg, #F4D47C 0%, #D4A83D 50%, #8F6B1E 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                87/100
              </div>
              {/* Yellow dots indicator - gradient from light to dark */}
              <div className="flex gap-1.5 mb-5">
                {[...Array(10)].map((_, i) => {
                  // Gradient colors from lighter to darker gold
                  const colors = ['#F4D47C', '#E8C96D', '#DCBE5E', '#D4A83D', '#C89B3C', '#BC8E3A', '#B08138', '#9C7420', '#8F6B1E', '#82621C'];
                  return (
                    <div 
                      key={i}
                      style={{ 
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: i < 8 ? colors[i] : '#333'
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ fontSize: '13px', lineHeight: '1.6' }} className="text-[#999] space-y-2">
                <div>Performance</div>
                <div>Content Quality</div>
                <div>Technical SEO</div>
              </div>
            </div>
            
            {/* Card 2 - Right card, more tilt to right, overlapping only at bottom */}
            <div 
              className="absolute w-[300px] h-[250px] rounded-[24px] p-6"
              style={{
                right: '0',
                top: '0',
                background: 'linear-gradient(145deg, #1A1A1A 0%, #0E0E0E 100%)',
                transform: 'rotate(11deg)',
                boxShadow: '0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(156, 116, 32, 0.15)',
                border: '1.5px solid rgba(212, 168, 61, 0.15)'
              }}
            >
              <div style={{ fontSize: '10px', letterSpacing: '0.15em' }} className="text-[#888] mb-3 uppercase font-medium">SEO HEALTH SCORE</div>
              <div 
                style={{ 
                  fontSize: '28px',
                  lineHeight: '1',
                  fontWeight: '900',
                  marginBottom: '14px',
                  background: 'linear-gradient(180deg, #F4D47C 0%, #D4A83D 50%, #8F6B1E 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text'
                }}
              >
                96/100
              </div>
              {/* Yellow dots indicator - gradient from light to dark */}
              <div className="flex gap-1.5 mb-5">
                {[...Array(10)].map((_, i) => {
                  // Gradient colors from lighter to darker gold
                  const colors = ['#F4D47C', '#E8C96D', '#DCBE5E', '#D4A83D', '#C89B3C', '#BC8E3A', '#B08138', '#9C7420', '#8F6B1E', '#82621C'];
                  return (
                    <div 
                      key={i}
                      style={{ 
                        width: '7px',
                        height: '7px',
                        borderRadius: '50%',
                        background: i < 9 ? colors[i] : '#333'
                      }}
                    />
                  );
                })}
              </div>
              <div style={{ fontSize: '13px', lineHeight: '1.6' }} className="text-[#999] space-y-2">
                <div className="flex justify-between"><span>Performance</span><span className="text-white">Good</span></div>
                <div className="flex justify-between"><span>Content Quality</span><span className="text-white">Strong</span></div>
                <div className="flex justify-between"><span>Technical SEO</span><span className="text-white">Average</span></div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION TITLE - mt-14, mb-10 */}
        <div className="mt-14 mb-10">
          <h2 className="text-4xl font-bold leading-tight text-white">
            See Your Website<br />
            Through an AI<br />
            SEO Lens
          </h2>
        </div>

        {/* FEATURE CARDS GRID - 4 columns, gap-6 */}
        <div className="grid grid-cols-4 gap-6">
          
          {/* Card 1 - Dark with smaller gold moon showing bottom-right portion only */}
          <div 
            className="h-[580px] rounded-[32px] p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: '#1A1A18' }}
          >
            {/* Smaller moon - showing more of bottom-right portion */}
            <div 
              className="absolute -top-24 -left-24 w-48 h-48 rounded-full"
              style={{ 
                background: 'radial-gradient(circle, #B8922F 0%, #9C7420 40%, rgba(156, 116, 32, 0.4) 70%, transparent 100%)'
              }}
            />
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-6 h-6 text-white/70" />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight" style={{ color: '#B8922F' }}>
                  Domain Health<br />Score
                </h3>
                <p className="text-base leading-relaxed text-[#A0A0A0]">
                  A clear 0–100 score that summarizes your website's overall SEO health and readiness for search visibility.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 - Light with 4-point concave Bézier star */}
          <div 
            className="h-[580px] rounded-[32px] p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: '#F5F3EE' }}
          >
            {/* Exact replica of star card.svg with anti-aliasing - touching top-left corner */}
            <div className="absolute top-0 left-0">
              <svg width="90" height="90" viewBox="0 0 119 126" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ shapeRendering: 'geometricPrecision' }}>
                <defs>
                  <filter id="antialiasing_star" x="-50%" y="-50%" width="200%" height="200%">
                    {/* Stage 1: Initial blur */}
                    <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur1"/>
                    {/* Stage 2: Morphology to smooth edges */}
                    <feMorphology in="blur1" operator="dilate" radius="0.5" result="dilated"/>
                    <feGaussianBlur in="dilated" stdDeviation="0.8" result="blur2"/>
                    {/* Stage 3: Color matrix for sharpening while maintaining smoothness */}
                    <feColorMatrix in="blur2" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 20 -10" result="sharp"/>
                    {/* Stage 4: Final subtle blur for ultimate smoothness */}
                    <feGaussianBlur in="sharp" stdDeviation="0.3" result="final"/>
                    <feComposite in="SourceGraphic" in2="final" operator="atop"/>
                  </filter>
                  <filter id="filter0_ddd_star" x="-20.0635" y="-13" width="139" height="139" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_star"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="effect1_dropShadow_star" result="effect2_dropShadow_star"/>
                    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
                    <feOffset dy="4"/>
                    <feGaussianBlur stdDeviation="2"/>
                    <feComposite in2="hardAlpha" operator="out"/>
                    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
                    <feBlend mode="normal" in2="effect2_dropShadow_star" result="effect3_dropShadow_star"/>
                    <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_star" result="shape"/>
                  </filter>
                </defs>
                <g filter="url(#filter0_ddd_star)">
                  <path d="M85.3776 49.6549C67.8445 47.9656 53.971 34.0986 52.2836 16.5804L49.4365 -13L46.5895 16.5804C44.902 34.1016 31.0285 47.9685 13.4955 49.6549L-16.0635 52.5L13.4955 55.3451C31.0285 57.0344 44.902 70.9014 46.5895 88.4196L49.4365 118L52.2836 88.4196C53.971 70.8984 67.8445 57.0314 85.3776 55.3451L114.937 52.5L85.3776 49.6549Z" fill="#AB8000" filter="url(#antialiasing_star)"/>
                </g>
              </svg>
            </div>
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-6 h-6 text-black/60" />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight" style={{ color: '#B8922F' }}>
                  Keyword &<br />Ranking Insights
                </h3>
                <p className="text-base leading-relaxed text-[#666]">
                  Discover ranking keywords and understand how your site performs across sampled SERP positions.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 - Gold with concentric quarter circles (dartboard target) */}
          <div 
            className="h-[580px] rounded-[32px] p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #B8922F 0%, #9C7420 100%)' }}
          >
            {/* Target SVG from file - touching top-left corner */}
            <div className="absolute top-0 left-0">
              <img 
                src="/assets/target.svg" 
                alt="" 
                className="w-[85px] h-[85px]"
              />
            </div>
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-6 h-6 text-white/80" />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight text-white">
                  Competitor<br />Landscape
                </h3>
                <p className="text-base leading-relaxed text-white/95">
                  Identify direct and content-level competitors competing for the same search visibility.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4 - Dark with bulb design at top-left corner */}
          <div 
            className="h-[580px] rounded-[32px] p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: '#1A1A18' }}
          >
            {/* Bulb SVG from file - scaled and positioned to touch corner */}
            <div className="absolute" style={{ top: '-5px', left: '-5px', transform: 'scale(1.7)', transformOrigin: 'top left' }}>
              <img 
                src="/assets/bulb.svg" 
                alt="" 
                className="w-[150px] h-[150px]"
              />
            </div>
            <div className="relative h-full flex flex-col">
              <div className="flex justify-end">
                <ArrowUpRight className="w-6 h-6 text-white/70" />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight" style={{ color: '#B8922F' }}>
                  Strategic SEO<br />Actions
                </h3>
                <p className="text-base leading-relaxed text-[#A0A0A0]">
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
