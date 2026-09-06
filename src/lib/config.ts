import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { AppConfig } from './types';

export const DEFAULT_CONFIG: AppConfig = {
  port: 8081,
  host: "0.0.0.0",
  retry_attempts: 3,
  retry_delay_sec: 2,
  request_timeout_sec: 180,
  gemini_bl: "boq_assistant-bard-web-server_20260716.08_p0",
  auth_user: null,
  xsrf_token: null,
  default_model: "gemini-3.6-flash",
  log_requests: true,
  cookie_file: null,
  proxy: null,
  api_keys: [],
  temporary_chats: false,
};

export const CONFIG: AppConfig = { ...DEFAULT_CONFIG };

export function loadConfig(configPath?: string): AppConfig {
  if (configPath && fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      Object.assign(CONFIG, fileConfig);
    } catch (e) {
      console.error(`Error reading config file ${configPath}:`, e);
    }
  }

  // Load from environment variables
  if (process.env.GEMINI_PORT) CONFIG.port = parseInt(process.env.GEMINI_PORT, 10);
  if (process.env.GEMINI_HOST) CONFIG.host = process.env.GEMINI_HOST;
  if (process.env.GEMINI_PROXY) CONFIG.proxy = process.env.GEMINI_PROXY;
  if (process.env.GEMINI_COOKIE_FILE) CONFIG.cookie_file = process.env.GEMINI_COOKIE_FILE;
  if (process.env.GEMINI_API_KEYS) {
    CONFIG.api_keys = process.env.GEMINI_API_KEYS.split(',').map(k => k.trim()).filter(Boolean);
  }
  if (process.env.GEMINI_BL) CONFIG.gemini_bl = process.env.GEMINI_BL;
  if (process.env.GEMINI_DEFAULT_MODEL) CONFIG.default_model = process.env.GEMINI_DEFAULT_MODEL;

  return CONFIG;
}

export function findConfig(): string | null {
  const paths = [
    path.join(process.cwd(), 'config.json'),
    path.join(os.homedir(), '.config', 'gemini-web2api', 'config.json')
  ];

  for (const p of paths) {
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return null;
}

// Auto-initialize
loadConfig(findConfig() ?? undefined);
