'use client';

import React from 'react';
import Link from 'next/link';
import { Moon, Sun, LogOut, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
    const [theme, setTheme] = React.useState('dark');

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        document.documentElement.classList.toggle('dark');
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    return (
        <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center px-4">
                <Link href="/" className="flex items-center space-x-2 mr-6">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                        <Home className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <span className="font-bold text-xl bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                        Vastu Vaibhav
                    </span>
                </Link>

                <div className="flex flex-1 items-center justify-end space-x-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleTheme}
                        className="h-9 w-9"
                    >
                        {theme === 'dark' ? (
                            <Sun className="h-5 w-5" />
                        ) : (
                            <Moon className="h-5 w-5" />
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleLogout}
                        className="gap-2"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>
            </div>
        </nav>
    );
}
