import { Buffer } from 'buffer';

export interface AppConfig {
  port: number;
  host: string;
  retry_attempts: number;
  retry_delay_sec: number;
  request_timeout_sec: number;
  gemini_bl: string;
  auth_user: string | number | null;
  xsrf_token: string | null;
  default_model: string;
  log_requests: boolean;
  cookie_file: string | null;
  proxy: string | null;
  api_keys: string[];
  temporary_chats: boolean;
}

export interface ModelConfig {
  mode: number;
  think: number;
  desc: string;
  extra?: Record<number, number>;
}

export interface ResolvedModel {
  name: string;
  modeId: number;
  thinkMode: number;
  error: string | null;
  extraFields: Record<number, number> | null;
}

export type ImageItem = [Buffer | string, string];

export interface ToolCallResult {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface GoogleFunctionCall {
  name: string;
  args: Record<string, unknown>;
}
