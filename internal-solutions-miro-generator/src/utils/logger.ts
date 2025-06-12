/**
 * Logger utility for consistent logging across the application
 */

import chalk from 'chalk';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export class Logger {
  private context: string;
  private static globalLevel: LogLevel = 'info';

  constructor(context: string = 'App') {
    this.context = context;
  }

  static setGlobalLevel(level: LogLevel): void {
    Logger.globalLevel = level;
  }

  static getGlobalLevel(): LogLevel {
    return Logger.globalLevel;
  }

  setLevel(level: LogLevel): void {
    Logger.globalLevel = level;
  }

  getLevel(): LogLevel {
    return Logger.globalLevel;
  }

  error(message: string, error?: any): void {
    if (this.shouldLog('error')) {
      const timestamp = new Date().toISOString();
      console.error(chalk.red(`[${timestamp}] [ERROR] [${this.context}] ${message}`));
      if (error) {
        if (error instanceof Error) {
          console.error(chalk.red(error.stack || error.message));
        } else {
          console.error(chalk.red(JSON.stringify(error, null, 2)));
        }
      }
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      const timestamp = new Date().toISOString();
      console.warn(chalk.yellow(`[${timestamp}] [WARN] [${this.context}] ${message}`));
      if (data) {
        console.warn(chalk.yellow(typeof data === 'object' ? JSON.stringify(data, null, 2) : data));
      }
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog('info')) {
      const timestamp = new Date().toISOString();
      console.log(chalk.blue(`[${timestamp}] [INFO] [${this.context}] ${message}`));
      if (data) {
        console.log(chalk.blue(typeof data === 'object' ? JSON.stringify(data, null, 2) : data));
      }
    }
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      const timestamp = new Date().toISOString();
      console.log(chalk.gray(`[${timestamp}] [DEBUG] [${this.context}] ${message}`));
      if (data) {
        console.log(chalk.gray(typeof data === 'object' ? JSON.stringify(data, null, 2) : data));
      }
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = levels.indexOf(Logger.globalLevel);
    const requestedLevelIndex = levels.indexOf(level);
    
    return requestedLevelIndex <= currentLevelIndex;
  }
}