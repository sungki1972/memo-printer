'use client';

import { useCallback, useEffect, useState } from 'react';

const PIN = '2573';
const PER_PAGE = 30;

interface PrintLog {
  id: number;
  print_job_id: string | null;
  print_type: string;
  content: string;
  memo: string | null;
  image_url: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
}

interface LogsResponse {
  success?: boolean;
  page?: number;
  pages?: number;
  total?: number;
  has_next?: boolean;
  has_prev?: boolean;
  logs?: PrintLog[];
  error?: string;
}

const TYPE_LABEL: Record<string, string> = {
  memo_only: '메모',
  xprinter: 'X프린터',
  image_print: '이미지',
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}`;
}

function PinGate({ onPass }: { onPass: () => void }) {
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');

  const submit = () => {
    if (val === PIN) {
      try {
        sessionStorage.setItem('memo_print_pin_ok', '1');
      } catch {}
      onPass();
    } else {
      setErr('암호가 올바르지 않습니다');
      setVal('');
    }
  };

  return (
    <div className="gate">
      <div className="gate-card">
        <h1>메모 프린터</h1>
        <p>인쇄 기록 — 암호를 입력하세요</p>
        <input
          className="pin-input"
          type="password"
          inputMode="numeric"
          autoFocus
          maxLength={8}
          value={val}
          onChange={(e) => {
            setVal(e.target.value);
            setErr('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
        <div className="pin-err">{err}</div>
        <button className="btn" onClick={submit}>
          열기
        </button>
      </div>
    </div>
  );
}

export default function Page() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);

  const [logs, setLogs] = useState<PrintLog[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [zoom, setZoom] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (sessionStorage.getItem('memo_print_pin_ok') === '1') setAuthed(true);
    } catch {}
    setReady(true);
  }, []);

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/logs?page=${p}&per_page=${PER_PAGE}`, {
        cache: 'no-store',
      });
      const data: LogsResponse = await res.json();
      if (!res.ok || data.success === false) {
        throw new Error(data.error || `오류 (${res.status})`);
      }
      setLogs(data.logs ?? []);
      setPage(data.page ?? p);
      setPages(data.pages ?? 1);
      setTotal(data.total ?? (data.logs ?? []).length);
      setHasNext(Boolean(data.has_next));
    } catch (e: any) {
      setError(e?.message ?? '불러오기 실패');
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authed) load(1);
  }, [authed, load]);

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoom(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoom]);

  if (!ready) return null;
  if (!authed) return <PinGate onPass={() => setAuthed(true)} />;

  const q = query.trim().toLowerCase();
  const shown = q
    ? logs.filter(
        (l) =>
          (l.memo ?? '').toLowerCase().includes(q) ||
          (l.content ?? '').toLowerCase().includes(q) ||
          String(l.print_job_id ?? '').includes(q)
      )
    : logs;

  return (
    <div className="wrap">
      <div className="head">
        <div>
          <h1>인쇄 기록</h1>
          <div className="total">전체 {total.toLocaleString()}건 · 서버 통합 기록</div>
        </div>
        <button className="refresh" onClick={() => load(page)} disabled={loading}>
          {loading ? '불러오는 중…' : '새로고침'}
        </button>
      </div>

      <input
        className="search"
        placeholder="메모 · 내용 · 작업번호 검색 (현재 페이지)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && <div className="state err">⚠️ {error}</div>}
      {!error && loading && logs.length === 0 && <div className="state">불러오는 중…</div>}
      {!error && !loading && shown.length === 0 && (
        <div className="state">표시할 기록이 없습니다</div>
      )}

      {shown.map((l) => {
        const memo = (l.memo ?? '').trim();
        return (
          <div className="card" key={l.id}>
            <div className="card-top">
              <div className="badges">
                <span className={`badge ${l.status === 'success' ? 'ok' : 'fail'}`}>
                  {l.status === 'success' ? '성공' : '실패'}
                </span>
                <span className="badge type">{TYPE_LABEL[l.print_type] ?? l.print_type}</span>
              </div>
              <span className="time">{fmtTime(l.created_at)}</span>
            </div>

            {memo ? (
              <div className="memo">{memo}</div>
            ) : (
              <div className="memo empty">{l.content || '(내용 없음)'}</div>
            )}

            {l.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className="thumb"
                src={l.image_url}
                alt="인쇄 이미지"
                loading="lazy"
                onClick={() => setZoom(l.image_url!)}
                title="클릭하면 크게 보기"
              />
            ) : (
              l.print_type === 'image_print' && (
                <div className="noimg">🖼 이미지 인쇄 · 미리보기 없음</div>
              )
            )}

            {l.error_message && <div className="err">오류: {l.error_message}</div>}

            <div className="meta">
              <span>#{l.id}</span>
              {l.print_job_id && <span>작업 {String(l.print_job_id)}</span>}
            </div>
          </div>
        );
      })}

      {!error && (
        <div className="pager">
          <button onClick={() => load(page - 1)} disabled={loading || page <= 1}>
            ← 이전
          </button>
          <span className="pageinfo">
            {page} / {pages}
          </span>
          <button onClick={() => load(page + 1)} disabled={loading || !hasNext}>
            다음 →
          </button>
        </div>
      )}

      {zoom && (
        <div className="lightbox" onClick={() => setZoom(null)}>
          <button className="lightbox-close" aria-label="닫기" onClick={() => setZoom(null)}>
            ✕
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lightbox-img" src={zoom} alt="확대 이미지" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
