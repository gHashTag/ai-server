import { validate } from 'class-validator'
import { CreateUserDto, UpdateUserDto } from '@/dtos/users.dto'
import { jest, describe, it, expect } from '@jest/globals'

describe('User DTOs', () => {
  describe('CreateUserDto', () => {
    it('should validate valid email and password', async () => {
      const dto = new CreateUserDto()
      dto.email = 'test@example.com'
      dto.password = 'validpassword123'

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })

    it('should fail validation for invalid email', async () => {
      const dto = new CreateUserDto()
      dto.email = 'invalid-email'
      dto.password = 'validpassword123'

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('email')
      expect(errors[0].constraints).toHaveProperty('isEmail')
    })

    it('should fail validation for short password', async () => {
      const dto = new CreateUserDto()
      dto.email = 'test@example.com'
      dto.password = 'short'

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('minLength')
    })

    it('should fail validation for long password', async () => {
      const dto = new CreateUserDto()
      dto.email = 'test@example.com'
      dto.password = 'a'.repeat(40) // 40 characters, exceeds maxLength of 32

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('maxLength')
    })

    it('should fail validation for empty password', async () => {
      const dto = new CreateUserDto()
      dto.email = 'test@example.com'
      dto.password = ''

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('isNotEmpty')
    })

    it('should fail validation for non-string password', async () => {
      const dto = new CreateUserDto()
      dto.email = 'test@example.com'
      dto.password = 123456789 as any

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('isString')
    })

    it('should validate password with exactly minimum length', async () => {
      const dto = new CreateUserDto()
      dto.email = 'test@example.com'
      dto.password = 'a'.repeat(9) // exactly 9 characters

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })

    it('should validate password with exactly maximum length', async () => {
      const dto = new CreateUserDto()
      dto.email = 'test@example.com'
      dto.password = 'a'.repeat(32) // exactly 32 characters

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })
  })

  describe('UpdateUserDto', () => {
    it('should validate valid password', async () => {
      const dto = new UpdateUserDto()
      dto.password = 'validpassword123'

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })

    it('should fail validation for short password', async () => {
      const dto = new UpdateUserDto()
      dto.password = 'short'

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('minLength')
    })

    it('should fail validation for long password', async () => {
      const dto = new UpdateUserDto()
      dto.password = 'a'.repeat(40) // 40 characters, exceeds maxLength of 32

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('maxLength')
    })

    it('should fail validation for empty password', async () => {
      const dto = new UpdateUserDto()
      dto.password = ''

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('isNotEmpty')
    })

    it('should fail validation for non-string password', async () => {
      const dto = new UpdateUserDto()
      dto.password = 123456789 as any

      const errors = await validate(dto)
      expect(errors.length).toBeGreaterThan(0)
      expect(errors[0].property).toBe('password')
      expect(errors[0].constraints).toHaveProperty('isString')
    })

    it('should validate password with exactly minimum length', async () => {
      const dto = new UpdateUserDto()
      dto.password = 'a'.repeat(9) // exactly 9 characters

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })

    it('should validate password with exactly maximum length', async () => {
      const dto = new UpdateUserDto()
      dto.password = 'a'.repeat(32) // exactly 32 characters

      const errors = await validate(dto)
      expect(errors).toHaveLength(0)
    })
  })
})