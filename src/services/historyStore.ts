/**
 * 로컬 인쇄 기록 저장소 (on-device, 오프라인 지원)
 *
 * 서버(/api/logs)는 image_url을 돌려주지 않으므로 썸네일을 보여줄 수 없다.
 * 대신 촬영/인쇄한 원본 이미지를 앱 영구 영역에 복사해두고, 메모/상태/작업ID와
 * 함께 JSON 인덱스로 관리한다. 이 저장소가 "내 인쇄" 탭의 데이터 원천이며
 * 생성/조회/수정/삭제(CRUD)를 모두 지원한다.
 *
 * 구현 메모: expo-file-system v56의 "새 동기 API"(File/Directory.textSync/copySync)는
 * 릴리스 빌드에서 네이티브 크래시를 유발했다(기록 탭 진입 즉시 강제종료). 그래서
 * 안정적인 legacy(비동기) API로 디스크에 영속화하고, 화면은 인메모리 캐시(records)를
 * 동기적으로 읽는다. 디스크 I/O는 모두 백그라운드에서 처리한다.
 */
import * as FileSystem from 'expo-file-system/legacy';
import { LocalPrint } from '../types';

const BASE = FileSystem.documentDirectory ?? '';
const DIR = `${BASE}memo-history/`;
const INDEX = `${BASE}memo-history.json`;

// ── 인메모리 캐시 (화면이 동기적으로 읽는 원천) ──────────────────────────────
let records: LocalPrint[] = [];
let loaded = false;

// ── 변경 구독 (화면 즉시 갱신용) ──────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notify() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* noop */
    }
  });
}

// ── 내부 유틸 ────────────────────────────────────────────────────────────────

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function persist() {
  try {
    await FileSystem.writeAsStringAsync(INDEX, JSON.stringify(records));
  } catch (err) {
    console.warn('[historyStore] 인덱스 저장 실패', err);
  }
}

async function ensureDir() {
  try {
    const info = await FileSystem.getInfoAsync(DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
    }
  } catch {
    /* 이미 존재하거나 동시 생성 — 무시 */
  }
}

/** 앱 시작 시 1회: 디스크 인덱스를 메모리로 로드. 모듈 로드 시 자동 호출된다. */
export async function init() {
  if (loaded) return;
  loaded = true;
  try {
    const info = await FileSystem.getInfoAsync(INDEX);
    if (info.exists) {
      const raw = await FileSystem.readAsStringAsync(INDEX);
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) records = parsed as LocalPrint[];
    }
  } catch (err) {
    console.warn('[historyStore] 초기 로드 실패', err);
  }
  notify();
}

// ── CRUD (화면은 동기, 디스크는 백그라운드) ──────────────────────────────────

/** READ — 최신순 정렬된 전체 기록 (인메모리) */
export function getAll(): LocalPrint[] {
  return [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getById(id: string): LocalPrint | undefined {
  return records.find((r) => r.id === id);
}

export interface AddInput {
  /** 촬영/선택된 원본 이미지 URI (카메라 캐시 등 휘발성 위치) */
  sourceUri: string;
  memo?: string;
  status: 'success' | 'failed';
  jobId?: string | null;
  printType?: string;
  error?: string | null;
}

/** CREATE — 인쇄 직후 호출. 메모리에 즉시 추가하고, 이미지 복사/영속화는 백그라운드로. */
export function add(input: AddInput): LocalPrint {
  const id = genId();
  const record: LocalPrint = {
    id,
    imageUri: input.sourceUri, // 우선 원본 URI; 복사 성공 시 영구 경로로 교체
    memo: input.memo?.trim() || '',
    status: input.status,
    // 서버가 job_id를 숫자로 줄 수 있어 항상 문자열로 정규화 (렌더 시 .slice 크래시 방지)
    jobId: input.jobId != null ? String(input.jobId) : null,
    printType: input.printType ?? 'image_print',
    error: input.error ?? null,
    createdAt: new Date().toISOString(),
  };

  records.unshift(record);
  notify();

  // 백그라운드: 원본 이미지를 영구 영역으로 복사한 뒤 URI 갱신 + 영속화
  (async () => {
    await ensureDir();
    try {
      const ext = (input.sourceUri.split('.').pop() || 'jpg').split('?')[0].toLowerCase();
      const dest = `${DIR}${id}.${ext}`;
      await FileSystem.copyAsync({ from: input.sourceUri, to: dest });
      const idx = records.findIndex((r) => r.id === id);
      if (idx !== -1) {
        records[idx] = { ...records[idx], imageUri: dest };
        notify();
      }
    } catch (err) {
      console.warn('[historyStore] 이미지 복사 실패, 원본 URI 유지', err);
    }
    await persist();
  })();

  return record;
}

/** UPDATE — 메모/상태 등 부분 수정 */
export function update(
  id: string,
  patch: Partial<Pick<LocalPrint, 'memo' | 'status' | 'jobId' | 'error'>>
): LocalPrint | undefined {
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  records[idx] = {
    ...records[idx],
    ...patch,
    memo: patch.memo !== undefined ? patch.memo.trim() : records[idx].memo,
  };
  notify();
  persist();
  return records[idx];
}

/** DELETE — 단건 삭제 (복사해 둔 이미지 파일도 함께 제거) */
export function remove(id: string) {
  const target = records.find((r) => r.id === id);
  records = records.filter((r) => r.id !== id);
  notify();
  if (target && target.imageUri.startsWith(DIR)) {
    FileSystem.deleteAsync(target.imageUri, { idempotent: true }).catch(() => {});
  }
  persist();
}

/** DELETE ALL — 전체 비우기 */
export function clear() {
  const toDelete = records.filter((r) => r.imageUri.startsWith(DIR));
  records = [];
  notify();
  toDelete.forEach((r) =>
    FileSystem.deleteAsync(r.imageUri, { idempotent: true }).catch(() => {})
  );
  persist();
}

export function count(): number {
  return records.length;
}

// 모듈 로드 시 백그라운드 로드 시작 (비차단)
init();
