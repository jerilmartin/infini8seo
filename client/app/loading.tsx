'use client';

export default function Loading() {
  // Use CSS variables that are set by ThemeProvider instead of useTheme hook
  // This prevents double loading screens
  return (
    <div 
      className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background"
    >
      {/* Golden blur - will adapt based on theme via CSS */}
      <div 
        className="absolute pointer-events-none z-0 inset-0"
        style={{
          background: 'var(--loading-gradient, linear-gradient(to bottom right, transparent 0%, transparent 25%, rgba(171, 128, 0, 0.08) 40%, rgba(171, 128, 0, 0.12) 50%, rgba(171, 128, 0, 0.08) 60%, transparent 75%, transparent 100%))',
          filter: 'blur(350px)'
        }}
      />

      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-[#FFC004]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#FFC004] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-foreground/70">
          Loading...
        </p>
      </div>
    </div>
  );
}
