type LogLevel = 'info' | 'warn' | 'error' | 'success';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

class DebugLogger {
  private logs: LogEntry[] = [];
  private listeners: Array<(logs: LogEntry[]) => void> = [];
  private maxLogs = 100;

  log(level: LogLevel, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data,
    };

    this.logs.unshift(entry); // Add to beginning
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Also log to console
    const consoleMsg = `[${level.toUpperCase()}] ${message}`;
    switch (level) {
      case 'error':
        console.error(consoleMsg, data);
        break;
      case 'warn':
        console.warn(consoleMsg, data);
        break;
      case 'success':
        console.log('✅', consoleMsg, data);
        break;
      default:
        console.log(consoleMsg, data);
    }

    this.notifyListeners();
  }

  info(message: string, data?: any) {
    this.log('info', message, data);
  }

  warn(message: string, data?: any) {
    this.log('warn', message, data);
  }

  error(message: string, data?: any) {
    this.log('error', message, data);
  }

  success(message: string, data?: any) {
    this.log('success', message, data);
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
    this.notifyListeners();
  }

  subscribe(callback: (logs: LogEntry[]) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.logs]));
  }

  getFormattedLogs(): string {
    return this.logs
      .map((log) => {
        const time = log.timestamp.toLocaleTimeString();
        const dataStr = log.data ? `\n${JSON.stringify(log.data, null, 2)}` : '';
        return `[${time}] ${log.level.toUpperCase()}: ${log.message}${dataStr}`;
      })
      .join('\n\n');
  }
}

export const debugLogger = new DebugLogger();
export type { LogEntry };
