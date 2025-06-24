/**
 * Instagram Data Validation Utilities
 * Validates Instagram user data before processing and storage
 */

// Simple logger without config dependencies
const logger = {
  info: (message: string, data?: any) =>
    console.log(`[INSTAGRAM-VALIDATOR] ${message}`, data),
  error: (message: string, data?: any) =>
    console.error(`[INSTAGRAM-VALIDATOR] ${message}`, data),
  warn: (message: string, data?: any) =>
    console.warn(`[INSTAGRAM-VALIDATOR] ${message}`, data),
}
import {
  RawInstagramUser,
  CreateInstagramUserPayload,
  InstagramUserValidation,
  InstagramScrapingError,
} from '@/interfaces/instagram.interface'

// =====================================
// VALIDATION RULES
// =====================================

/**
 * Validation rules for Instagram usernames
 */
const USERNAME_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 30,
  PATTERN: /^[a-zA-Z0-9._]+$/,
}

/**
 * Validation rules for Instagram user IDs (pk)
 */
const USER_ID_RULES = {
  MIN_LENGTH: 1,
  MAX_LENGTH: 20,
  PATTERN: /^\d+$/,
}

/**
 * Validation rules for full names
 */
const FULL_NAME_RULES = {
  MAX_LENGTH: 255,
  MIN_LENGTH: 0,
}

/**
 * URL validation pattern
 */
const URL_PATTERN = /^https?:\/\/[^\s]+$/

// =====================================
// CORE VALIDATION FUNCTIONS
// =====================================

/**
 * Validate Instagram username format
 */
export function validateUsername(username: string): InstagramUserValidation {
  const validation: InstagramUserValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  if (!username || typeof username !== 'string') {
    validation.isValid = false
    validation.errors.push('Username is required and must be a string')
    return validation
  }

  const trimmedUsername = username.trim()

  if (trimmedUsername.length < USERNAME_RULES.MIN_LENGTH) {
    validation.isValid = false
    validation.errors.push(
      `Username must be at least ${USERNAME_RULES.MIN_LENGTH} character long`
    )
  }

  if (trimmedUsername.length > USERNAME_RULES.MAX_LENGTH) {
    validation.isValid = false
    validation.errors.push(
      `Username cannot exceed ${USERNAME_RULES.MAX_LENGTH} characters`
    )
  }

  if (!USERNAME_RULES.PATTERN.test(trimmedUsername)) {
    validation.isValid = false
    validation.errors.push(
      'Username can only contain letters, numbers, dots, and underscores'
    )
  }

  return validation
}

/**
 * Validate Instagram user ID (pk)
 */
export function validateUserPK(pk: string): InstagramUserValidation {
  const validation: InstagramUserValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  if (!pk || typeof pk !== 'string') {
    validation.isValid = false
    validation.errors.push('User PK is required and must be a string')
    return validation
  }

  const trimmedPK = pk.trim()

  if (trimmedPK.length < USER_ID_RULES.MIN_LENGTH) {
    validation.isValid = false
    validation.errors.push('User PK cannot be empty')
  }

  if (trimmedPK.length > USER_ID_RULES.MAX_LENGTH) {
    validation.isValid = false
    validation.errors.push(
      `User PK cannot exceed ${USER_ID_RULES.MAX_LENGTH} characters`
    )
  }

  if (!USER_ID_RULES.PATTERN.test(trimmedPK)) {
    validation.isValid = false
    validation.errors.push('User PK must contain only numbers')
  }

  return validation
}

/**
 * Validate full name
 */
export function validateFullName(
  fullName?: string | null
): InstagramUserValidation {
  const validation: InstagramUserValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  // Full name is optional
  if (!fullName) {
    return validation
  }

  if (typeof fullName !== 'string') {
    validation.isValid = false
    validation.errors.push('Full name must be a string')
    return validation
  }

  if (fullName.length > FULL_NAME_RULES.MAX_LENGTH) {
    validation.isValid = false
    validation.errors.push(
      `Full name cannot exceed ${FULL_NAME_RULES.MAX_LENGTH} characters`
    )
  }

  // Check for suspicious patterns
  if (fullName.trim().length === 0) {
    validation.warnings.push('Full name is empty')
  }

  return validation
}

/**
 * Validate profile picture URL
 */
export function validateProfilePicURL(
  url?: string | null
): InstagramUserValidation {
  const validation: InstagramUserValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  // URL is optional
  if (!url) {
    return validation
  }

  if (typeof url !== 'string') {
    validation.isValid = false
    validation.errors.push('Profile picture URL must be a string')
    return validation
  }

  if (!URL_PATTERN.test(url.trim())) {
    validation.isValid = false
    validation.errors.push('Profile picture URL must be a valid HTTP/HTTPS URL')
  }

  return validation
}

// =====================================
// COMPOSITE VALIDATION FUNCTIONS
// =====================================

/**
 * Validate raw Instagram user data from API
 */
export function validateRawInstagramUser(user: any): InstagramUserValidation {
  const validation: InstagramUserValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  // Check if user object exists
  if (!user || typeof user !== 'object') {
    validation.isValid = false
    validation.errors.push('User data is required and must be an object')
    return validation
  }

  // Validate required fields
  const usernameValidation = validateUsername(user.username)
  const pkValidation = validateUserPK(user.pk)

  // Merge validations
  validation.errors.push(...usernameValidation.errors, ...pkValidation.errors)
  validation.warnings.push(
    ...usernameValidation.warnings,
    ...pkValidation.warnings
  )

  if (usernameValidation.errors.length > 0 || pkValidation.errors.length > 0) {
    validation.isValid = false
  }

  // Validate optional fields
  if (user.full_name !== undefined) {
    const fullNameValidation = validateFullName(user.full_name)
    validation.errors.push(...fullNameValidation.errors)
    validation.warnings.push(...fullNameValidation.warnings)

    if (fullNameValidation.errors.length > 0) {
      validation.isValid = false
    }
  }

  if (user.profile_pic_url !== undefined) {
    const urlValidation = validateProfilePicURL(user.profile_pic_url)
    validation.errors.push(...urlValidation.errors)
    validation.warnings.push(...urlValidation.warnings)

    if (urlValidation.errors.length > 0) {
      validation.isValid = false
    }
  }

  // Validate boolean fields
  if (user.is_private !== undefined && typeof user.is_private !== 'boolean') {
    validation.warnings.push('is_private should be a boolean value')
  }

  if (user.is_verified !== undefined && typeof user.is_verified !== 'boolean') {
    validation.warnings.push('is_verified should be a boolean value')
  }

  return validation
}

/**
 * Validate Instagram user payload for database insertion
 */
export function validateCreateUserPayload(
  payload: any
): InstagramUserValidation {
  const validation: InstagramUserValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  if (!payload || typeof payload !== 'object') {
    validation.isValid = false
    validation.errors.push('User payload is required and must be an object')
    return validation
  }

  // Validate required fields
  const usernameValidation = validateUsername(payload.username)
  const pkValidation = validateUserPK(payload.user_pk)

  validation.errors.push(...usernameValidation.errors, ...pkValidation.errors)
  validation.warnings.push(
    ...usernameValidation.warnings,
    ...pkValidation.warnings
  )

  if (usernameValidation.errors.length > 0 || pkValidation.errors.length > 0) {
    validation.isValid = false
  }

  // Validate search_username (required for payload)
  if (!payload.search_username || typeof payload.search_username !== 'string') {
    validation.isValid = false
    validation.errors.push('search_username is required and must be a string')
  } else {
    const searchUsernameValidation = validateUsername(payload.search_username)
    validation.errors.push(...searchUsernameValidation.errors)
    validation.warnings.push(...searchUsernameValidation.warnings)

    if (searchUsernameValidation.errors.length > 0) {
      validation.isValid = false
    }
  }

  return validation
}

// =====================================
// BATCH VALIDATION FUNCTIONS
// =====================================

/**
 * Validate array of raw Instagram users
 */
export function validateRawInstagramUsers(users: any[]): {
  validUsers: RawInstagramUser[]
  invalidUsers: Array<{ user: any; validation: InstagramUserValidation }>
  totalProcessed: number
} {
  const result = {
    validUsers: [] as RawInstagramUser[],
    invalidUsers: [] as Array<{
      user: any
      validation: InstagramUserValidation
    }>,
    totalProcessed: 0,
  }

  if (!Array.isArray(users)) {
    logger.error('❌ Invalid input for batch validation', {
      description: 'Expected array of users',
      received: typeof users,
    })
    return result
  }

  logger.info('🔄 Starting batch validation of Instagram users...', {
    description: 'Batch validation initiated',
    totalUsers: users.length,
  })

  for (const user of users) {
    result.totalProcessed++

    const validation = validateRawInstagramUser(user)

    if (validation.isValid) {
      result.validUsers.push(user as RawInstagramUser)
    } else {
      result.invalidUsers.push({ user, validation })

      logger.warn('⚠️ Invalid Instagram user data found', {
        description: 'Validation failed',
        username: user?.username || 'unknown',
        errors: validation.errors,
        warnings: validation.warnings,
      })
    }
  }

  logger.info('✅ Batch validation completed', {
    description: 'Validation results',
    totalProcessed: result.totalProcessed,
    validUsers: result.validUsers.length,
    invalidUsers: result.invalidUsers.length,
    successRate: Math.round(
      (result.validUsers.length / result.totalProcessed) * 100
    ),
  })

  return result
}

// =====================================
// TRANSFORMATION FUNCTIONS
// =====================================

/**
 * Transform raw Instagram user to create payload
 */
export function transformToCreatePayload(
  rawUser: RawInstagramUser,
  searchTarget: string
): CreateInstagramUserPayload {
  // Validate inputs first
  const userValidation = validateRawInstagramUser(rawUser)
  if (!userValidation.isValid) {
    throw new InstagramScrapingError(
      `Invalid user data: ${userValidation.errors.join(', ')}`,
      'VALIDATION_ERROR',
      { user: rawUser, validation: userValidation }
    )
  }

  const searchValidation = validateUsername(searchTarget)
  if (!searchValidation.isValid) {
    throw new InstagramScrapingError(
      `Invalid search target: ${searchValidation.errors.join(', ')}`,
      'VALIDATION_ERROR',
      { searchTarget, validation: searchValidation }
    )
  }

  return {
    search_username: searchTarget.trim(),
    user_pk: rawUser.pk.trim(),
    username: rawUser.username.trim(),
    full_name: rawUser.full_name?.trim() || null,
    is_private: Boolean(rawUser.is_private),
    is_verified: Boolean(rawUser.is_verified),
    profile_pic_url: rawUser.profile_pic_url?.trim() || null,
    profile_chaining_secondary_label:
      rawUser.profile_chaining_secondary_label?.trim() || null,
    social_context: rawUser.social_context?.trim() || null,
  }
}

/**
 * Transform array of raw users to create payloads
 */
export function transformToCreatePayloads(
  rawUsers: RawInstagramUser[],
  searchTarget: string
): CreateInstagramUserPayload[] {
  logger.info('🔄 Transforming raw users to create payloads...', {
    description: 'Data transformation',
    userCount: rawUsers.length,
    searchTarget,
  })

  const payloads: CreateInstagramUserPayload[] = []
  const errors: Array<{ user: RawInstagramUser; error: string }> = []

  for (const rawUser of rawUsers) {
    try {
      const payload = transformToCreatePayload(rawUser, searchTarget)
      payloads.push(payload)
    } catch (error) {
      errors.push({
        user: rawUser,
        error: error instanceof Error ? error.message : String(error),
      })

      logger.warn('⚠️ Failed to transform user data', {
        description: 'Transformation error',
        username: rawUser.username,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  logger.info('✅ Data transformation completed', {
    description: 'Transformation results',
    successfulTransforms: payloads.length,
    failedTransforms: errors.length,
    successRate: Math.round((payloads.length / rawUsers.length) * 100),
  })

  if (errors.length > 0) {
    logger.warn('⚠️ Some users failed transformation', {
      description: 'Transformation warnings',
      errorCount: errors.length,
      errors: errors.slice(0, 5), // Log first 5 errors to avoid spam
    })
  }

  return payloads
}
