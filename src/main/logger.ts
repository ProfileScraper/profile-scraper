import * as winston from 'winston';
import * as path from 'path';

const logDir = path.join(process.cwd(), 'output');

export const logger = winston.createLogger({
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

export function logInfo(message: string, meta?: any): void {
  logger.info(message, meta);
}

export function logError(message: string, error?: Error, meta?: any): void {
  logger.error(message, { error: error?.message, stack: error?.stack, ...meta });
}

export function logWarning(message: string, meta?: any): void {
  logger.warn(message, meta);
}
