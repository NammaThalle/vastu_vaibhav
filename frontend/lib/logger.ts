type LogLevel = 'debug' | 'info' | 'warning' | 'error' | 'critical';

// Use an empty string for relative paths if API is served from the same origin (standard in our Docker setup)
const API_BASE_URL = '';

const remoteLog = async (level: LogLevel, message: string, context?: any) => {
  try {
    // Non-blocking fire and forget
    fetch(`${API_BASE_URL}/api/v1/utils/logs/frontend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, message, context: context || {} }),
    }).catch(() => {}); // Catch network errors silently
  } catch (error) {
    // Silent fail
  }
};

export const logger = {
  debug: (message: string, context?: any) => {
    if (process.env.NODE_ENV === 'development') {
        console.debug(`[DEBUG] ${message}`, context || '');
    }
    remoteLog('debug', message, context);
  },
  info: (message: string, context?: any) => {
    console.info(`[INFO] ${message}`, context || '');
    remoteLog('info', message, context);
  },
  warn: (message: string, context?: any) => {
    console.warn(`[WARN] ${message}`, context || '');
    remoteLog('warning', message, context);
  },
  error: (message: string, context?: any) => {
    console.error(`[ERROR] ${message}`, context || '');
    remoteLog('error', message, context);
  },
};

// --- Automatic Hooks ---

if (typeof window !== 'undefined') {
  // 1. Hook into global unhandled errors (crashes)
  window.addEventListener('error', (event) => {
    logger.error('Global Browser Error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack
    });
  });

  // 2. Hook into unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logger.error('Unhandled Promise Rejection', {
      reason: event.reason
    });
  });

  // 3. Optional: Hook into console.error to catch react/library errors
  const originalConsoleError = console.error;
  console.error = (...args) => {
    originalConsoleError.apply(console, args);
    const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ');
    remoteLog('error', `[Console Error] ${message}`);
  };
}
