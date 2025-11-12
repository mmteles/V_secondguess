/**
 * Validation utilities for the AI Voice SOP Agent
 */

import { ValidationResult, ValidationError, ValidationWarning, ValidationErrorType, ErrorSeverity } from '@/models';

/**
 * Create a validation result
 */
export function createValidationResult(
  isValid: boolean = true,
  errors: ValidationError[] = [],
  warnings: ValidationWarning[] = [],
  suggestions: string[] = []
): ValidationResult {
  const score = calculateValidationScore(errors, warnings);
  
  return {
    isValid,
    errors,
    warnings,
    suggestions,
    score
  };
}

/**
 * Calculate validation score based on errors and warnings
 */
function calculateValidationScore(errors: ValidationError[], warnings: ValidationWarning[]): number {
  let score = 100;
  
  errors.forEach(error => {
    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        score -= 25;
        break;
      case ErrorSeverity.HIGH:
        score -= 15;
        break;
      case ErrorSeverity.MEDIUM:
        score -= 10;
        break;
      case ErrorSeverity.LOW:
        score -= 5;
        break;
    }
  });
  
  // Warnings reduce score less
  score -= warnings.length * 2;
  
  return Math.max(0, score);
}

/**
 * Create a validation error
 */
export function createValidationError(
  field: string,
  message: string,
  type: ValidationErrorType = ValidationErrorType.INVALID_FORMAT,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  code: string = 'VALIDATION_ERROR',
  context?: Record<string, any>,
  suggestions?: string[]
): ValidationError {
  return {
    id: generateErrorId(),
    type,
    field,
    message,
    severity,
    code,
    context: context || {},
    suggestions: suggestions || []
  };
}

/**
 * Create a validation warning
 */
export function createValidationWarning(
  field: string,
  message: string,
  code: string = 'VALIDATION_WARNING',
  context?: Record<string, any>,
  suggestions?: string[]
): ValidationWarning {
  return {
    id: generateErrorId(),
    field,
    message,
    code,
    context: context || {},
    suggestions: suggestions || []
  };
}

/**
 * Generate unique error ID
 */
function generateErrorId(): string {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate required fields
 */
export function validateRequired(obj: Record<string, any>, requiredFields: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  requiredFields.forEach(field => {
    const value = getNestedValue(obj, field);
    if (value === undefined || value === null || value === '') {
      errors.push(createValidationError(
        field,
        `Field '${field}' is required`,
        ValidationErrorType.MISSING_FIELD,
        ErrorSeverity.HIGH,
        'REQUIRED_FIELD_MISSING'
      ));
    }
  });
  
  return errors;
}

/**
 * Validate string format using regex
 */
export function validateFormat(
  value: string,
  pattern: RegExp,
  field: string,
  errorMessage?: string
): ValidationError | null {
  if (!pattern.test(value)) {
    return createValidationError(
      field,
      errorMessage || `Field '${field}' has invalid format`,
      ValidationErrorType.INVALID_FORMAT,
      ErrorSeverity.MEDIUM,
      'INVALID_FORMAT'
    );
  }
  return null;
}

/**
 * Validate numeric range
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  field: string
): ValidationError | null {
  if (value < min || value > max) {
    return createValidationError(
      field,
      `Field '${field}' must be between ${min} and ${max}`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'VALUE_OUT_OF_RANGE',
      { min, max, value }
    );
  }
  return null;
}

/**
 * Validate string length
 */
export function validateLength(
  value: string,
  minLength?: number,
  maxLength?: number,
  field?: string
): ValidationError | null {
  const fieldName = field || 'value';
  
  if (minLength !== undefined && value.length < minLength) {
    return createValidationError(
      fieldName,
      `Field '${fieldName}' must be at least ${minLength} characters long`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'MIN_LENGTH_VIOLATION',
      { minLength, actualLength: value.length }
    );
  }
  
  if (maxLength !== undefined && value.length > maxLength) {
    return createValidationError(
      fieldName,
      `Field '${fieldName}' must be no more than ${maxLength} characters long`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'MAX_LENGTH_VIOLATION',
      { maxLength, actualLength: value.length }
    );
  }
  
  return null;
}

/**
 * Validate email format
 */
export function validateEmail(email: string, field: string = 'email'): ValidationError | null {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return validateFormat(email, emailRegex, field, 'Invalid email format');
}

/**
 * Validate URL format
 */
export function validateUrl(url: string, field: string = 'url'): ValidationError | null {
  try {
    new URL(url);
    return null;
  } catch {
    return createValidationError(
      field,
      'Invalid URL format',
      ValidationErrorType.INVALID_FORMAT,
      ErrorSeverity.MEDIUM,
      'INVALID_URL'
    );
  }
}

/**
 * Validate array constraints
 */
export function validateArray(
  array: any[],
  minItems?: number,
  maxItems?: number,
  field: string = 'array'
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (minItems !== undefined && array.length < minItems) {
    errors.push(createValidationError(
      field,
      `Field '${field}' must contain at least ${minItems} items`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'MIN_ITEMS_VIOLATION',
      { minItems, actualItems: array.length }
    ));
  }
  
  if (maxItems !== undefined && array.length > maxItems) {
    errors.push(createValidationError(
      field,
      `Field '${field}' must contain no more than ${maxItems} items`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'MAX_ITEMS_VIOLATION',
      { maxItems, actualItems: array.length }
    ));
  }
  
  return errors;
}

/**
 * Validate enum value
 */
export function validateEnum<T>(
  value: T,
  enumObject: Record<string, T>,
  field: string
): ValidationError | null {
  const validValues = Object.values(enumObject);
  if (!validValues.includes(value)) {
    return createValidationError(
      field,
      `Field '${field}' must be one of: ${validValues.join(', ')}`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'INVALID_ENUM_VALUE',
      { validValues, actualValue: value }
    );
  }
  return null;
}

/**
 * Validate date constraints
 */
export function validateDate(
  date: Date,
  minDate?: Date,
  maxDate?: Date,
  field: string = 'date'
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (isNaN(date.getTime())) {
    errors.push(createValidationError(
      field,
      'Invalid date',
      ValidationErrorType.INVALID_FORMAT,
      ErrorSeverity.HIGH,
      'INVALID_DATE'
    ));
    return errors;
  }
  
  if (minDate && date < minDate) {
    errors.push(createValidationError(
      field,
      `Date must be after ${minDate.toISOString()}`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'DATE_TOO_EARLY',
      { minDate: minDate.toISOString(), actualDate: date.toISOString() }
    ));
  }
  
  if (maxDate && date > maxDate) {
    errors.push(createValidationError(
      field,
      `Date must be before ${maxDate.toISOString()}`,
      ValidationErrorType.CONSTRAINT_VIOLATION,
      ErrorSeverity.MEDIUM,
      'DATE_TOO_LATE',
      { maxDate: maxDate.toISOString(), actualDate: date.toISOString() }
    ));
  }
  
  return errors;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: Record<string, any>, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Combine multiple validation results
 */
export function combineValidationResults(...results: ValidationResult[]): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];
  const allSuggestions: string[] = [];
  
  results.forEach(result => {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    allSuggestions.push(...result.suggestions);
  });
  
  const isValid = allErrors.length === 0;
  const score = calculateValidationScore(allErrors, allWarnings);
  
  return {
    isValid,
    errors: allErrors,
    warnings: allWarnings,
    suggestions: [...new Set(allSuggestions)], // Remove duplicates
    score
  };
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' '); // Normalize whitespace
}

/**
 * Validate business rules
 */
export function validateBusinessRule(
  condition: boolean,
  field: string,
  message: string,
  code: string = 'BUSINESS_RULE_VIOLATION'
): ValidationError | null {
  if (!condition) {
    return createValidationError(
      field,
      message,
      ValidationErrorType.BUSINESS_RULE_VIOLATION,
      ErrorSeverity.HIGH,
      code
    );
  }
  return null;
}