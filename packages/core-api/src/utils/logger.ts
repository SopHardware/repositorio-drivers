import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'logs');
const ERROR_LOG_FILE = join(LOG_DIR, 'error.log');

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

export function logError(error: Error | unknown, context?: string): void {
  try {
    ensureLogDir();
    
    const timestamp = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
    const contextInfo = context ? ` [${context}]` : '';
    
    const logEntry = `[${timestamp}]${contextInfo} ERROR: ${errorMessage}\n`;
    
    appendFileSync(ERROR_LOG_FILE, logEntry);
  } catch (writeError) {
    console.error('Failed to write to error log file:', writeError);
  }
}

export function logInfo(message: string): void {
  try {
    ensureLogDir();
    
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] INFO: ${message}\n`;
    
    appendFileSync(ERROR_LOG_FILE, logEntry);
  } catch (writeError) {
    console.error('Failed to write to log file:', writeError);
  }
}
