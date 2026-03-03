import { NextResponse } from 'next/server';
import { isProfileCompleteMiddleware } from '@/middlewares/isProfileComplete.middleware';

export function middleware(request) {
    const path = request.nextUrl.pathname;
    const token = request.cookies.get('token')?.value || '';

    // 1. Define paths that only GUESTS should see (Login/Signup)
    const isAuthPath = path === '/login' || path === '/signup';

    // 2. Define paths that EVERYONE can see (Landing Page, Portfolios)
    const isTrulyPublicPath = path === '/' || path.startsWith('/profile/') || path.startsWith('/portfolio/');

    // 3. Logic Rule A: Redirect logged-in users AWAY from Login/Signup only
    if (isAuthPath && token) {
        return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
    }

    // 4. Logic Rule B: Protected routes (Private pages)
    // If it's NOT guest-only AND NOT truly public, and there's no token...
    if (!isAuthPath && !isTrulyPublicPath && !token) {
        return NextResponse.redirect(new URL('/login', request.nextUrl));
    }

    const profileResponse = isProfileCompleteMiddleware(request);
    if (profileResponse) return profileResponse;

    return NextResponse.next();
}

// 7. The Matcher configures exactly which routes this middleware should run on
export const config = {
    matcher: [
        '/',
        '/profile',
        '/dashboard',
        '/login',
        '/signup',
        '/complete-profile',
        '/portfolio/edit',
        // Add any other protected routes here
    ]
}