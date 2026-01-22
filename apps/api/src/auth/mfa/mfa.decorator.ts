import { SetMetadata } from '@nestjs/common';

export const IS_MFA_PENDING = 'isMfaPending';
export const IS_MFA_OPTIONAL = 'isMfaOptional';

/**
 * Decorator to mark an endpoint as requiring MFA pending status.
 * Use this for endpoints that are only accessible during 2FA verification (e.g., /auth/2fa/verify-login).
 */
export const MfaPending = () => SetMetadata(IS_MFA_PENDING, true);

/**
 * Decorator to mark an endpoint as not requiring MFA verification.
 * Use this for endpoints that should be accessible even if MFA is pending (e.g., logout).
 */
export const MfaOptional = () => SetMetadata(IS_MFA_OPTIONAL, true);
