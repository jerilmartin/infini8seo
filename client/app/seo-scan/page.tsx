'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Search, ArrowUpRight } from 'lucide-react';
import { api } from '@/utils/api';
import { UserMenu } from '@/components/UserMenu';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';
import Navbar from '@/components/Navbar';

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
        <Navbar />
      </div>

      {/* HERO CONTAINER */}
      <div className="max-w-[1400px] mx-auto px-12 pt-8 pb-12 relative z-10">
        
        {/* EYEBROW - centered at top */}
        <p 
          className="text-sm tracking-[0.12em] mb-4 uppercase text-center font-semibold"
          style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
        >
          AI-Powered SEO Content Engine
        </p>

        {/* MAIN HEADING - CENTERED ABOVE EVERYTHING */}
        <div className="text-center mb-10">
          <h1 
            className="text-[100px] font-black leading-none tracking-tight inline-block"
            style={{
              letterSpacing: '-0.02em',
              background: 'linear-gradient(180deg, #FFC004 0%, #E8AF05 25%, #C19207 50%, #131111 100%)',
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
        <div className="flex items-start justify-between gap-3 max-w-[1450px] mx-auto">
          
          {/* LEFT SECTION - Search Form */}
          <div className="flex-shrink-0 w-[650px]">
            {/* Description */}
            <p 
              className="text-sm leading-relaxed mb-8"
              style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#000000' }}
            >
              Scan any website to evaluate its SEO health and discover actionable opportunities to improve search performance.
            </p>
            
            <form onSubmit={handleSubmit}>
              {/* LABEL */}
              <label 
                className="block text-xs tracking-[0.08em] mb-3 uppercase"
                style={{ 
                  color: '#000000',
                  fontWeight: 600
                }}
              >
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
                  className="h-[48px] px-6 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 transition-all hover:scale-105 hover:shadow-xl whitespace-nowrap"
                  style={{
                    background: '#C19207 !important',
                    backgroundColor: '#C19207',
                    color: '#FFFFFF',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(193, 146, 7, 0.5)'
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
                background: theme === 'dark' 
                  ? 'linear-gradient(145deg, #1A1A1A 0%, #0E0E0E 100%)'
                  : 'rgba(138, 138, 138, 0.19)',
                transform: 'rotate(-11deg)',
                boxShadow: theme === 'dark'
                  ? '0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(156, 116, 32, 0.15)'
                  : '0 10px 40px rgba(0,0,0,0.1)',
                border: theme === 'dark'
                  ? '1.5px solid rgba(212, 168, 61, 0.15)'
                  : '1.5px solid rgba(138, 138, 138, 0.2)'
              }}
            >
              <div 
                style={{ fontSize: '10px', letterSpacing: '0.15em' }} 
                className="mb-3 uppercase font-medium"
                style={{ 
                  fontSize: '10px', 
                  letterSpacing: '0.15em',
                  color: theme === 'dark' ? '#888' : '#000000'
                }}
              >
                SEO HEALTH SCORE
              </div>
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
              <div 
                style={{ fontSize: '13px', lineHeight: '1.6' }} 
                className="space-y-2"
                style={{
                  fontSize: '13px',
                  lineHeight: '1.6',
                  color: theme === 'dark' ? '#999' : '#000000'
                }}
              >
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
                background: theme === 'dark'
                  ? 'linear-gradient(145deg, #1A1A1A 0%, #0E0E0E 100%)'
                  : 'rgba(138, 138, 138, 0.19)',
                transform: 'rotate(11deg)',
                boxShadow: theme === 'dark'
                  ? '0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(156, 116, 32, 0.15)'
                  : '0 10px 40px rgba(0,0,0,0.1)',
                border: theme === 'dark'
                  ? '1.5px solid rgba(212, 168, 61, 0.15)'
                  : '1.5px solid rgba(138, 138, 138, 0.2)'
              }}
            >
              <div 
                style={{ 
                  fontSize: '10px', 
                  letterSpacing: '0.15em',
                  color: theme === 'dark' ? '#888' : '#000000'
                }} 
                className="mb-3 uppercase font-medium"
              >
                SEO HEALTH SCORE
              </div>
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
              <div 
                style={{ 
                  fontSize: '13px', 
                  lineHeight: '1.6',
                  color: theme === 'dark' ? '#999' : '#000000'
                }} 
                className="space-y-2"
              >
                <div className="flex justify-between">
                  <span>Performance</span>
                  <span style={{ color: theme === 'dark' ? 'white' : '#000000' }}>Good</span>
                </div>
                <div className="flex justify-between">
                  <span>Content Quality</span>
                  <span style={{ color: theme === 'dark' ? 'white' : '#000000' }}>Strong</span>
                </div>
                <div className="flex justify-between">
                  <span>Technical SEO</span>
                  <span style={{ color: theme === 'dark' ? 'white' : '#000000' }}>Average</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION TITLE - mt-12, mb-8 */}
        <div className="mt-12 mb-8">
          <h2 
            className="text-3xl font-bold leading-tight"
            style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}
          >
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
            style={{ background: theme === 'dark' ? '#1A1A18' : 'rgba(194, 194, 194, 0.99)' }}
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
                <ArrowUpRight className="w-6 h-6" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#000000' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight" style={{ color: theme === 'dark' ? '#B8922F' : '#000000' }}>
                  Domain Health<br />Score
                </h3>
                <p className="text-base leading-relaxed" style={{ color: theme === 'dark' ? '#A0A0A0' : '#000000' }}>
                  A clear 0–100 score that summarizes your website's overall SEO health and readiness for search visibility.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2 - Light with 4-point concave Bézier star */}
          <div 
            className="h-[580px] rounded-[32px] p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: theme === 'dark' ? '#F5F3EE' : '#453400' }}
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
                <ArrowUpRight className="w-6 h-6" style={{ color: theme === 'dark' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.7)' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight" style={{ color: theme === 'dark' ? '#B8922F' : '#F4D47C' }}>
                  Keyword &<br />Ranking Insights
                </h3>
                <p className="text-base leading-relaxed" style={{ color: theme === 'dark' ? '#666' : 'rgba(255, 255, 255, 0.9)' }}>
                  Discover ranking keywords and understand how your site performs across sampled SERP positions.
                </p>
              </div>
            </div>
          </div>

          {/* Card 3 - Gold with concentric quarter circles (dartboard target) */}
          <div 
            className="h-[580px] rounded-[32px] p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: theme === 'dark' ? 'linear-gradient(135deg, #B8922F 0%, #9C7420 100%)' : '#FFC004' }}
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
                <ArrowUpRight className="w-6 h-6" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.8)' : '#000000' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight" style={{ color: theme === 'dark' ? 'white' : '#000000' }}>
                  Competitor<br />Landscape
                </h3>
                <p className="text-base leading-relaxed" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.95)' : '#000000' }}>
                  Identify direct and content-level competitors competing for the same search visibility.
                </p>
              </div>
            </div>
          </div>

          {/* Card 4 - Dark teal/blue with bulb design at top-left corner */}
          <div 
            className="h-[580px] rounded-[32px] p-8 relative overflow-hidden cursor-pointer transition-transform hover:scale-[1.02]"
            style={{ background: theme === 'dark' ? '#1A2730' : 'rgba(176, 176, 176, 0.65)' }}
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
                <ArrowUpRight className="w-6 h-6" style={{ color: theme === 'dark' ? 'rgba(255, 255, 255, 0.7)' : '#000000' }} />
              </div>
              <div className="mt-auto">
                <h3 className="text-2xl font-bold mb-4 leading-tight" style={{ color: theme === 'dark' ? '#B8922F' : '#B8922F' }}>
                  Strategic SEO<br />Actions
                </h3>
                <p className="text-base leading-relaxed" style={{ color: theme === 'dark' ? '#A0A0A0' : '#000000' }}>
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
