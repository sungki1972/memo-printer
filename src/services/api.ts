import { File, UploadTask, UploadType } from 'expo-file-system';
import { LogsResponse, PrintResponse } from '../types';

const API_BASE = 'https://barcode1.echeil.com';
const REQUEST_TIMEOUT = 30_000;

function generatePrintId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 10);
  return `${ts}-${rand}`;
}

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal })
    .catch((err) => {
      if (err.name === 'AbortError') {
        throw new Error('서버 응답 시간 초과 (30초). 네트워크를 확인해주세요.');
      }
      throw err;
    })
    .finally(() => clearTimeout(timer));
}

async function uploadFileWithTimeout(
  url: string,
  fileUri: string,
  options: {
    fieldName: string;
    headers: Record<string, string>;
    parameters?: Record<string, string>;
    mimeType: string;
  },
  timeoutMs: number
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const file = new File(fileUri);
  const task = new UploadTask(file, url, {
    httpMethod: 'POST',
    uploadType: UploadType.MULTIPART,
    fieldName: options.fieldName,
    mimeType: options.mimeType,
    headers: options.headers,
    parameters: options.parameters,
    signal: controller.signal,
  });

  try {
    return await task.uploadAsync();
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('서버 응답 시간 초과. 네트워크를 확인해주세요.');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

class PrintApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async printImage(
    imageUri: string,
    memo?: string,
    printId?: string
  ): Promise<PrintResponse> {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const dedupId = printId || generatePrintId();

    const result = await uploadFileWithTimeout(
      `${this.baseUrl}/api/print/image`,
      imageUri,
      {
        fieldName: 'image',
        mimeType,
        headers: {
          Accept: 'application/json',
          'X-Print-Id': dedupId,
        },
        parameters: memo ? { memo } : undefined,
      },
      REQUEST_TIMEOUT
    );

    if (result.status < 200 || result.status >= 300) {
      throw new Error(`인쇄 실패 (${result.status}): ${result.body}`);
    }

    try {
      return JSON.parse(result.body);
    } catch {
      throw new Error(`인쇄 응답 파싱 실패: ${result.body}`);
    }
  }

  async printImages(imageUris: string[]): Promise<PrintResponse> {
    const results: PrintResponse[] = [];
    for (const uri of imageUris) {
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      const result = await uploadFileWithTimeout(
        `${this.baseUrl}/api/print/image`,
        uri,
        {
          fieldName: 'image',
          mimeType,
          headers: {
            Accept: 'application/json',
            'X-Print-Id': generatePrintId(),
          },
        },
        60_000
      );

      if (result.status < 200 || result.status >= 300) {
        throw new Error(`배치 인쇄 실패 (${result.status}): ${result.body}`);
      }

      try {
        results.push(JSON.parse(result.body));
      } catch {
        throw new Error(`배치 인쇄 응답 파싱 실패: ${result.body}`);
      }
    }

    const last = results[results.length - 1];
    return last ?? ({ success: true } as PrintResponse);
  }

  async getLogs(page: number = 1, perPage: number = 20): Promise<LogsResponse> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/api/logs?page=${page}&per_page=${perPage}`,
      {
        headers: { 'Accept': 'application/json' },
      },
      15_000
    );

    if (!response.ok) {
      throw new Error(`로그 조회 실패 (${response.status})`);
    }

    return response.json();
  }

  async reprint(logId: number): Promise<PrintResponse> {
    const response = await fetchWithTimeout(
      `${this.baseUrl}/api/print/reprint/${logId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Print-Id': generatePrintId(),
        },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`재인쇄 실패 (${response.status}): ${text}`);
    }

    return response.json();
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetchWithTimeout(this.baseUrl, { method: 'GET' }, 5_000);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const printApi = new PrintApiService(API_BASE);
