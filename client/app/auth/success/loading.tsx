'use client';

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      <div className="flex flex-col items-center gap-4 relative z-10">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-[#FFC004]/20 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-[#FFC004] border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="text-sm text-foreground/70">Loading...</p>
      </div>
    </div>
  );
}
