/**
 * 로컬 인쇄 기록 저장소 (on-device, 오프라인 지원)
 *
 * 서버(/api/logs)는 image_url을 돌려주지 않으므로 썸네일을 보여줄 수 없다.
 * 대신 촬영/인쇄한 원본 이미지를 앱 영구 영역에 복사해두고, 메모/상태/작업ID와
 * 함께 JSON 인덱스로 관리한다. 이 저장소가 "내 인쇄" 탭의 데이터 원천이며
 * 생성/조회/수정/삭제(CRUD)를 모두 지원한다.
 */
import { Directory, File, Paths } from 'expo-file-system';
import { LocalPrint } from '../types';

const DIR_NAME = 'memo-history';
const INDEX_NAME = 'memo-history.json';

const historyDir = new Directory(Paths.document, DIR_NAME);
const indexFile = new File(Paths.document, INDEX_NAME);

// ── 내부 유틸 ────────────────────────────────────────────────────────────────

function ensureDir() {
  try {
    if (!historyDir.exists) historyDir.create({ intermediates: true, idempotent: true });
  } catch {
    // 이미 존재하거나 동시 생성 — 무시
  }
}

function genId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function readIndex(): LocalPrint[] {
  try {
    if (!indexFile.exists) return [];
    const raw = indexFile.textSync();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalPrint[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(records: LocalPrint[]) {
  try {
    if (!indexFile.exists) indexFile.create();
    indexFile.write(JSON.stringify(records));
  } catch (err) {
    console.warn('[historyStore] 인덱스 저장 실패', err);
  }
}

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

// ── CRUD ─────────────────────────────────────────────────────────────────────

/** READ — 최신순 정렬된 전체 기록 */
export function getAll(): LocalPrint[] {
  return readIndex().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getById(id: string): LocalPrint | undefined {
  return readIndex().find((r) => r.id === id);
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

/** CREATE — 인쇄 직후 호출. 이미지를 영구 영역에 복사하고 기록을 추가한다. */
export function add(input: AddInput): LocalPrint {
  ensureDir();
  const id = genId();

  // 원본 이미지를 영구 보관소로 복사 (카메라 캐시는 언제든 비워질 수 있음)
  let storedUri = input.sourceUri;
  try {
    const src = new File(input.sourceUri);
    const ext = (src.name.split('.').pop() || 'jpg').toLowerCase();
    const dest = new File(historyDir, `${id}.${ext}`);
    src.copySync(dest);
    storedUri = dest.uri;
  } catch (err) {
    console.warn('[historyStore] 이미지 복사 실패, 원본 URI 사용', err);
  }

  const record: LocalPrint = {
    id,
    imageUri: storedUri,
    memo: input.memo?.trim() || '',
    status: input.status,
    jobId: input.jobId ?? null,
    printType: input.printType ?? 'image_print',
    error: input.error ?? null,
    createdAt: new Date().toISOString(),
  };

  const records = readIndex();
  records.unshift(record);
  writeIndex(records);
  notify();
  return record;
}

/** UPDATE — 메모/상태 등 부분 수정 */
export function update(
  id: string,
  patch: Partial<Pick<LocalPrint, 'memo' | 'status' | 'jobId' | 'error'>>
): LocalPrint | undefined {
  const records = readIndex();
  const idx = records.findIndex((r) => r.id === id);
  if (idx === -1) return undefined;
  records[idx] = {
    ...records[idx],
    ...patch,
    memo: patch.memo !== undefined ? patch.memo.trim() : records[idx].memo,
  };
  writeIndex(records);
  notify();
  return records[idx];
}

/** DELETE — 단건 삭제 (이미지 파일도 함께 제거) */
export function remove(id: string) {
  const records = readIndex();
  const target = records.find((r) => r.id === id);
  if (target) {
    try {
      const f = new File(target.imageUri);
      if (f.exists) f.delete();
    } catch {
      /* 파일이 이미 없을 수 있음 */
    }
  }
  writeIndex(records.filter((r) => r.id !== id));
  notify();
}

/** DELETE ALL — 전체 비우기 */
export function clear() {
  const records = readIndex();
  records.forEach((r) => {
    try {
      const f = new File(r.imageUri);
      if (f.exists) f.delete();
    } catch {
      /* noop */
    }
  });
  writeIndex([]);
  notify();
}

export function count(): number {
  return readIndex().length;
}
