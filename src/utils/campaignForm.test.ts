import { describe, expect, it } from 'vitest'
import {
  formatGoalInput,
  isValidIsoDate,
  localDateInputValue,
  numericGoalValue,
} from './campaignForm'

describe('campaign form values', () => {
  it('formats campaign goals while retaining up to two decimal places', () => {
    expect(formatGoalInput('30000')).toBe('30,000')
    expect(formatGoalInput('1500000.25')).toBe('1,500,000.25')
    expect(formatGoalInput('1500000.256')).toBe('1,500,000.25')
    expect(numericGoalValue('1,500,000.25')).toBe('1500000.25')
  })

  it('uses the local date for date inputs', () => {
    expect(localDateInputValue(new Date(2026, 2, 4, 23, 59))).toBe('2026-03-04')
  })

  it('rejects malformed or impossible ISO calendar dates', () => {
    expect(isValidIsoDate('2026-11-23')).toBe(true)
    expect(isValidIsoDate('2026-02-31')).toBe(false)
    expect(isValidIsoDate('23-11-2026')).toBe(false)
  })
})
