import * as FileSystem from 'expo-file-system';
import { LogsResponse, PrintResponse } from '../types';

const API_BASE = 'https://barcode1.echeil.com';

class PrintApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async printImage(imageUri: string, memo?: string): Promise<PrintResponse> {
    const filename = imageUri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const ext = match ? match[1].toLowerCase() : 'jpg';
    const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const formData = new FormData();
    formData.append('image', {
      uri: imageUri,
      name: filename,
      type: mimeType,
    } as any);

    if (memo) {
      formData.append('memo', memo);
    }

    const response = await fetch(`${this.baseUrl}/api/print/image`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`인쇄 실패 (${response.status}): ${text}`);
    }

    return response.json();
  }

  async printImages(imageUris: string[]): Promise<PrintResponse> {
    const formData = new FormData();

    for (const uri of imageUris) {
      const filename = uri.split('/').pop() || 'photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const ext = match ? match[1].toLowerCase() : 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';

      formData.append('images', {
        uri,
        name: filename,
        type: mimeType,
      } as any);
    }

    const response = await fetch(`${this.baseUrl}/api/print/images`, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`배치 인쇄 실패 (${response.status}): ${text}`);
    }

    return response.json();
  }

  async getLogs(page: number = 1, perPage: number = 20): Promise<LogsResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/logs?page=${page}&per_page=${perPage}`,
      {
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      throw new Error(`로그 조회 실패 (${response.status})`);
    }

    return response.json();
  }

  async reprint(logId: number): Promise<PrintResponse> {
    const response = await fetch(
      `${this.baseUrl}/api/print/reprint/${logId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
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
      const response = await fetch(this.baseUrl, { method: 'GET' });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const printApi = new PrintApiService(API_BASE);
