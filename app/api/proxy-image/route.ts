import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side image proxy to bypass CORS restrictions.
 * Used by PDF generation to fetch Firebase Storage images.
 *
 * Usage: GET /api/proxy-image?url=<encoded-image-url>
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  // Only allow proxying images from trusted domains
  const allowed = [
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
    'lh3.googleusercontent.com',
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!allowed.some(domain => parsedUrl.hostname.endsWith(domain))) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: resp.status });
    }

    const contentType = resp.headers.get('content-type') || 'image/jpeg';
    const buffer = await resp.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Proxy error' }, { status: 500 });
  }
}
