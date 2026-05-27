export interface PrintLog {
  id: number;
  print_job_id: string | null;
  print_type: string;
  content: string;
  memo: string | null;
  image_url: string | null;
  image_id: string | null;
  qr_url: string | null;
  viewer_pin: string | null;
  order_id: number | null;
  phone: string | null;
  status: 'success' | 'failed';
  error_message: string | null;
  created_at: string;
}

export interface LogsResponse {
  success: boolean;
  page: number;
  pages: number;
  per_page: number;
  total: number;
  has_next: boolean;
  has_prev: boolean;
  logs: PrintLog[];
}

export interface PrintResponse {
  success: boolean;
  message?: string;
  job_id?: string;
  print_job_id?: string;
  error?: string;
  deduplicated?: boolean;
  count?: number;
}

export interface PrintImageResponse extends PrintResponse {
  viewer_url?: string;
  image_url?: string;
  image_id?: string;
}

export type RootStackParamList = {
  MainTabs: undefined;
  Preview: { imageUri: string };
  LogDetail: { log: PrintLog };
};

export type MainTabParamList = {
  Camera: undefined;
  Logs: undefined;
};
