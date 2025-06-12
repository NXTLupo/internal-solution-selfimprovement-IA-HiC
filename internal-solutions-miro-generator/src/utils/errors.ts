/**
 * Custom error classes for the Miro Generator application
 */

import { AppError } from '@types/index';

export class ValidationError extends Error implements AppError {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ValidationError';
    this.code = 'VALIDATION_ERROR';
    this.statusCode = 400;
    this.details = details;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

export class MiroAPIError extends Error implements AppError {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;

  constructor(message: string, statusCode?: number, details?: Record<string, any>) {
    super(message);
    this.name = 'MiroAPIError';
    this.code = 'MIRO_API_ERROR';
    this.statusCode = statusCode;
    this.details = details;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MiroAPIError);
    }
  }
}

export class ParsingError extends Error implements AppError {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ParsingError';
    this.code = 'PARSING_ERROR';
    this.statusCode = 422;
    this.details = details;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ParsingError);
    }
  }
}

export class ConfigurationError extends Error implements AppError {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'ConfigurationError';
    this.code = 'CONFIGURATION_ERROR';
    this.statusCode = 500;
    this.details = details;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}

export class FileSystemError extends Error implements AppError {
  code: string;
  statusCode?: number;
  details?: Record<string, any>;

  constructor(message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'FileSystemError';
    this.code = 'FILESYSTEM_ERROR';
    this.statusCode = 500;
    this.details = details;
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FileSystemError);
    }
  }
}

/**
 * Error handler utility functions
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof Error && 'code' in error;
}

export function formatError(error: unknown): { message: string; code?: string; statusCode?: number; details?: any } {
  if (isAppError(error)) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details
    };
  }
  
  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'UNKNOWN_ERROR',
      statusCode: 500
    };
  }
  
  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
    details: error
  };
}

export function createErrorFromAxios(axiosError: any): MiroAPIError {
  const status = axiosError.response?.status;
  const message = axiosError.response?.data?.message || axiosError.message;
  const details = {
    url: axiosError.config?.url,
    method: axiosError.config?.method,
    responseData: axiosError.response?.data
  };
  
  return new MiroAPIError(message, status, details);
}