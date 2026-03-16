'use client';

import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';

export default function Navbar() {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, toggleTheme } = useTheme();

    const isContentFactory = pathname === '/' || pathname?.startsWith('/progress') || pathname?.startsWith('/results');
    const isSeoScanner = pathname?.startsWith('/seo-scan') || pathname?.startsWith('/seo-results');

    return (
        <nav className="bg-transparent transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push('/')}
                            className="font-semibold transition-opacity hover:opacity-80"
                            style={{ fontSize: '24px', lineHeight: '1' }}
                        >
                            <span style={{ color: theme === 'dark' ? '#FFFFFF' : '#000000' }}>infini8</span>
                            <span className="text-[#FFC004]"> SEO</span>
                        </button>
                        
                        {/* Theme Toggle Button */}
                        <button
                            onClick={toggleTheme}
                            className="transition-opacity hover:opacity-80"
                            aria-label="Toggle theme"
                        >
                            <Image
                                src={theme === 'dark' ? '/assets/button.svg' : '/assets/button1.svg'}
                                alt="Theme toggle"
                                width={40}
                                height={40}
                                className="w-10 h-10"
                            />
                        </button>
                    </div>

                    {/* Nav Links */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => router.push('/')}
                            className={`font-semibold transition-colors hover:opacity-80 ${
                                isContentFactory
                                    ? ''
                                    : 'opacity-70'
                            }`}
                            style={{ 
                                fontSize: '16px',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                                textDecoration: isContentFactory ? 'underline' : 'none',
                                textDecorationColor: isContentFactory ? '#FFC004' : 'transparent',
                                textDecorationThickness: '2px',
                                textUnderlineOffset: '4px'
                            }}
                        >
                            Content Factory
                        </button>
                        <button
                            onClick={() => router.push('/seo-scan')}
                            className={`font-semibold transition-colors hover:opacity-80 ${
                                isSeoScanner
                                    ? ''
                                    : 'opacity-70'
                            }`}
                            style={{ 
                                fontSize: '16px',
                                color: theme === 'dark' ? '#ffffff' : '#000000',
                                textDecoration: isSeoScanner ? 'underline' : 'none',
                                textDecorationColor: isSeoScanner ? '#FFC004' : 'transparent',
                                textDecorationThickness: '2px',
                                textUnderlineOffset: '4px'
                            }}
                        >
                            Site Insights
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
}
