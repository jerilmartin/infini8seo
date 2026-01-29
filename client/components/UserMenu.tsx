'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { LogOut, ChevronDown, LogIn } from 'lucide-react';

export function UserMenu() {
    const router = useRouter();
    const { user, signOut, isAuthenticated } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

    useEffect(() => {
        setMounted(true);
    }, []);

    // Update dropdown position when opened
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right
            });
        }
    }, [isOpen]);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Show login button if not authenticated
    if (!isAuthenticated || !user) {
        return (
            <button
                onClick={() => router.push('/login')}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
            >
                <LogIn className="w-4 h-4" />
                Login
            </button>
        );
    }

    const displayName = user.name || user.email?.split('@')[0] || 'User';
    const avatarUrl = user.avatar;
    const initials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);

    const dropdownContent = isOpen && mounted ? (
        <div
            ref={menuRef}
            className="fixed w-56 bg-card border border-border rounded-xl shadow-2xl py-1 z-[9999] animate-in fade-in slide-in-from-top-2 duration-200"
            style={{
                top: `${dropdownPosition.top}px`,
                right: `${dropdownPosition.right}px`
            }}
        >
            {/* User Info */}
            <div className="px-4 py-3 border-b border-border">
                <p className="text-sm font-medium text-foreground truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
                <button
                    onClick={() => {
                        setIsOpen(false);
                        signOut();
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Sign out
                </button>
            </div>
        </div>
    ) : null;

    return (
        <>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/50 transition-colors"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-7 h-7 rounded-full border border-border"
                    />
                ) : (
                    <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <span className="text-[11px] font-medium text-primary">{initials}</span>
                    </div>
                )}
                <span className="text-[13px] font-medium text-foreground hidden sm:block max-w-[120px] truncate">
                    {displayName}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Render dropdown in portal */}
            {mounted && dropdownContent && createPortal(dropdownContent, document.body)}
        </>
    );
}
