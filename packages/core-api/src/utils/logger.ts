import { appendFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const LOG_DIR = join(process.cwd(), 'logs');
const ERROR_LOG_FILE = join(LOG_DIR, 'error.log');
const SOURCE_NAME = 'DriversAPI';

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) {
    mkdirSync(LOG_DIR, { recursive: true });
  }
}

function logToEventViewer(message: string, level: 'INFO' | 'WARNING' | 'ERROR'): void {
  try {
    const eventId = level === 'ERROR' ? 1 : level === 'WARNING' ? 2 : 0;
    const escapedMessage = message.replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 32766);
    execSync(`eventcreate /T ${level} /ID ${eventId} /L APPLICATION /SO "${SOURCE_NAME}" /D "${escapedMessage}"`, { timeout: 5000 });
  } catch {
    // Silently fail if Event Viewer is not available (e.g., on non-Windows or without admin rights)
  }
}

export function logError(error: Error | unknown, context?: string): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.stack || error.message : String(error);
  const contextInfo = context ? ` [${context}]` : '';
  const logEntry = `[${timestamp}]${contextInfo} ERROR: ${errorMessage}`;

  // Log to file
  try {
    ensureLogDir();
    appendFileSync(ERROR_LOG_FILE, logEntry + '\n');
  } catch (writeError) {
    console.error('Failed to write to error log file:', writeError);
  }

  // Log to Event Viewer
  logToEventViewer(logEntry, 'ERROR');

  // Also log to console
  console.error(logEntry);
}

export function logInfo(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] INFO: ${message}`;

  // Log to file
  try {
    ensureLogDir();
    appendFileSync(ERROR_LOG_FILE, logEntry + '\n');
  } catch (writeError) {
    console.error('Failed to write to log file:', writeError);
  }

  // Log to Event Viewer
  logToEventViewer(logEntry, 'INFO');

  // Also log to console
  console.log(logEntry);
}

export function logWarning(message: string): void {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] WARNING: ${message}`;

  // Log to file
  try {
    ensureLogDir();
    appendFileSync(ERROR_LOG_FILE, logEntry + '\n');
  } catch (writeError) {
    console.error('Failed to write to log file:', writeError);
  }

  // Log to Event Viewer
  logToEventViewer(logEntry, 'WARNING');

  // Also log to console
  console.warn(logEntry);
}
