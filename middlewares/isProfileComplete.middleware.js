import { NextResponse } from 'next/server';

export function isProfileCompleteMiddleware(request) {
    // 1. Get the path the user is trying to visit
    const path = request.nextUrl.pathname;

    // 3. Look for the HTTP-Only cookie named 'token'
    // request.cookies.get returns an object, so we extract the .value
    const isProfileComplete = request.cookies.get('isProfileComplete')?.value || '';

    // 4. Logic Rule A: User is LOGGED IN but trying to visit a PUBLIC page
    // (e.g., they go to /login but already have a token)
    if (path === '/complete-profile' && isProfileComplete == "true") {
        // Redirect them to their dashboard or profile
        return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
    }

    if (path.startsWith('/dashboard') && isProfileComplete !== 'true') {
        // Kick them back to the setup page
        return NextResponse.redirect(new URL('/complete-profile', request.nextUrl));
    }

    // 6. If they pass the checks, let them proceed normally
    return null;
}
