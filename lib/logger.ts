// lib/logger.ts

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogPayload {
  event: string;
  message?: string; // Optional general message
  details?: Record<string, any>; // For any other structured data
  error?: any; // To specifically pass error objects or messages
  // Removed [key: string]: any; for more explicit structure
}

/**
 * Emit a single JSON-encoded log line.
 */
function log(level: LogLevel, payload: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    ...payload, // Spread the payload which includes event, message, details, error
  };

  // Use console[level] if it exists, otherwise default to console.log
  // This handles if 'debug' isn't a standard console method in all environments,
  // though it usually is.
  if (console[level]) {
    // @ts-ignore - Bypassing TypeScript check for dynamic console[level] call
    console[level](JSON.stringify(entry));
  } else {
    console.log(JSON.stringify({ ...entry, originalLevel: level }));
  }
}

// Update convenience methods to accept a single LogPayload object
export const logger = {
  info:  (payload: LogPayload) => log('info',  payload),
  warn:  (payload: LogPayload) => log('warn',  payload),
  error: (payload: LogPayload) => log('error', payload),
  debug: (payload: LogPayload) => log('debug', payload),
}; 