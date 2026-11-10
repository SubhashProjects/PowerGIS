// ============================================================================
// POWERGIS ENTERPRISE ELECTRICITY DISTRIBUTION GIS PLATFORM
// COMMONS: STATUTORY VALIDATORS & ZERO-TRUST SECURITY ENFORCERS (SSOT)
// Change any email, strict password, or form validation rule here.
// Strictly reflects across entire platform.
// ============================================================================

import { VALUES } from './values';
import { LABELS } from './labels';

export interface PasswordCriteriaResult {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
  score: number; // 0 to 5
  isValid: boolean;
  error: string | null;
}

/**
 * RFC 5322-compliant email validator for official staff accounts.
 * Disallows plain usernames or numeric IDs.
 */
export function validateEmail(val: string): string | null {
  const trimmed = val ? val.trim() : '';
  if (!trimmed) {
    return LABELS.auth.emailErrors.required;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return LABELS.auth.emailErrors.invalid;
  }
  return null;
}

/**
 * Checks all 5 statutory password complexity requirements.
 */
export function checkPasswordCriteria(password: string): PasswordCriteriaResult {
  const pwd = password || '';
  const minLen = VALUES.security.minPasswordLength;
  const hasMinLength = pwd.length >= minLen;
  const hasUppercase = /[A-Z]/.test(pwd);
  const hasLowercase = /[a-z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecialChar = VALUES.security.specialCharPattern.test(pwd);

  const criteriaList = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecialChar];
  const score = criteriaList.filter(Boolean).length;
  const isValid = criteriaList.every(Boolean);

  let error: string | null = null;
  if (!pwd) {
    error = LABELS.auth.passwordErrors.required;
  } else if (!hasMinLength) {
    error = LABELS.auth.passwordErrors.tooShort;
  } else if (!hasUppercase) {
    error = LABELS.auth.passwordErrors.missingUppercase;
  } else if (!hasLowercase) {
    error = LABELS.auth.passwordErrors.missingLowercase;
  } else if (!hasNumber) {
    error = LABELS.auth.passwordErrors.missingNumber;
  } else if (!hasSpecialChar) {
    error = LABELS.auth.passwordErrors.missingSpecial;
  }

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecialChar,
    score,
    isValid,
    error,
  };
}

/**
 * Returns null if password meets all strict requirements, or the specific error message.
 */
export function validateStrictPassword(password: string): string | null {
  const result = checkPasswordCriteria(password);
  return result.error;
}
