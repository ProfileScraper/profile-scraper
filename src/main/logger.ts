import * as winston from 'winston';
import * as path from 'path';
import { app } from 'electron';
import * as fs from 'fs';

// Lazy initialization - only create logger when first used
let _logger: winston.Logger | null = null;

function getLogger(): winston.Logger {
  if (_logger) {
    return _logger;
  }

  // Use app.getPath('userData') for logs in production, or cwd/output in development
  const logDir = app.isPackaged
    ? path.join(app.getPath('userData'), 'logs')
    : path.join(process.cwd(), 'output');

  // Ensure log directory exists
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  _logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    transports: [
      new winston.transports.File({
        filename: path.join(logDir, 'scrape.log'),
        maxsize: 5242880, // 5MB
        maxFiles: 7,
      }),
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.simple()
        ),
      }),
    ],
  });

  return _logger;
}

export const logger = {
  get info() { return getLogger().info.bind(getLogger()); },
  get error() { return getLogger().error.bind(getLogger()); },
  get warn() { return getLogger().warn.bind(getLogger()); },
  get debug() { return getLogger().debug.bind(getLogger()); },
};

export function logInfo(message: string, meta?: any): void {
  logger.info(message, meta);
}

export function logError(message: string, error?: Error, meta?: any): void {
  logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
}

export function logWarning(message: string, meta?: any): void {
  logger.warn(message, meta);
}
