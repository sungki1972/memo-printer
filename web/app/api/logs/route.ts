import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://barcode1.echeil.com';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const page = req.nextUrl.searchParams.get('page') ?? '1';
  const perPage = req.nextUrl.searchParams.get('per_page') ?? '30';

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    const res = await fetch(
      `${API_BASE}/api/logs?page=${encodeURIComponent(page)}&per_page=${encodeURIComponent(perPage)}`,
      { headers: { Accept: 'application/json' }, signal: controller.signal, cache: 'no-store' }
    );
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `서버 응답 오류 (${res.status})` },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err: any) {
    const msg =
      err?.name === 'AbortError'
        ? '인쇄 서버 응답 시간 초과 (15초)'
        : `인쇄 서버 연결 실패: ${err?.message ?? 'unknown'}`;
    return NextResponse.json({ success: false, error: msg }, { status: 502 });
  }
}
