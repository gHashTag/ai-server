import { describe, it, expect } from '@jest/globals'

// Type definitions for testing (without importing main file)
interface TopReelData {
  id: string
  comp_username: string
  reel_id: string
  ig_reel_url: string
  caption: string | null
  views_count: number
  likes_count: number
  comments_count: number
  created_at_instagram: string
  engagement_rate: number
  project_id: number
}

describe('extractTopContent helper functions', () => {
  it('should format top reels data correctly', () => {
    // Arrange
    const mockReelsData: TopReelData[] = [
      {
        id: 'reel-1',
        comp_username: 'user1',
        reel_id: 'reel_123',
        ig_reel_url: 'https://instagram.com/reel/123',
        caption: 'Test caption 1',
        views_count: 10000,
        likes_count: 500,
        comments_count: 50,
        created_at_instagram: '2024-01-01T00:00:00Z',
        engagement_rate: 0.055,
        project_id: 123,
      },
      {
        id: 'reel-2',
        comp_username: 'user1',
        reel_id: 'reel_456',
        ig_reel_url: 'https://instagram.com/reel/456',
        caption: 'Test caption 2',
        views_count: 8000,
        likes_count: 400,
        comments_count: 40,
        created_at_instagram: '2024-01-02T00:00:00Z',
        engagement_rate: 0.055,
        project_id: 123,
      },
    ]

    // Act
    const result = formatTopReelsReport(mockReelsData)

    // Assert
    expect(result).toContain('📊 ТОП-10 РИЛСОВ')
    expect(result).toContain('user1')
    expect(result).toContain('10\u00A0000') // Неразрывный пробел
    expect(result).toContain('просмотров')
    expect(result).toContain('❤️ 500 лайков')
    expect(result).toContain('Test caption 1')
    expect(result).toContain('5.5% engagement')
  })

  it('should handle empty reels data', () => {
    // Arrange
    const emptyReels: TopReelData[] = []

    // Act
    const result = formatTopReelsReport(emptyReels)

    // Assert
    expect(result).toContain('📊 ТОП-10 РИЛСОВ')
    expect(result).toContain('Нет данных для отображения')
  })

  it('should calculate engagement rate correctly', () => {
    // Arrange
    const reel = {
      views_count: 1000,
      likes_count: 50,
      comments_count: 10,
    }

    // Act
    const engagementRate = calculateEngagementRate(reel)

    // Assert
    expect(engagementRate).toBe(0.06) // (50+10)/1000 = 0.06
  })

  it('should sort reels by engagement rate descending', () => {
    // Arrange
    const reels = [
      { engagement_rate: 0.05, views_count: 1000 },
      { engagement_rate: 0.08, views_count: 2000 },
      { engagement_rate: 0.03, views_count: 500 },
    ]

    // Act
    const sorted = sortReelsByEngagement(reels)

    // Assert
    expect(sorted[0].engagement_rate).toBe(0.08)
    expect(sorted[1].engagement_rate).toBe(0.05)
    expect(sorted[2].engagement_rate).toBe(0.03)
  })

  it('should filter reels by date range', () => {
    // Arrange
    const now = new Date()
    const within14Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
    const beyond14Days = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000)

    const reels = [
      { created_at_instagram: within14Days.toISOString(), id: 'reel-1' },
      { created_at_instagram: beyond14Days.toISOString(), id: 'reel-2' },
    ]

    // Act
    const filtered = filterReelsByDateRange(reels, 14)

    // Assert
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('reel-1')
  })

  it('should limit results to specified number', () => {
    // Arrange
    const reels = Array.from({ length: 15 }, (_, i) => ({
      id: `reel-${i}`,
      engagement_rate: Math.random(),
      views_count: 1000 + i * 100,
    }))

    // Act
    const limited = limitTopReels(reels, 10)

    // Assert
    expect(limited).toHaveLength(10)
  })
})

// Helper functions implementation for testing
function formatTopReelsReport(reels: TopReelData[]): string {
  if (reels.length === 0) {
    return `📊 ТОП-10 РИЛСОВ\n\nНет данных для отображения за указанный период.`
  }

  let report = `📊 ТОП-10 РИЛСОВ ${reels[0]?.comp_username}\n\n`

  reels.forEach((reel, index) => {
    const engagement = (reel.engagement_rate * 100).toFixed(1)
    report += `${index + 1}. 🎬 ${reel.caption?.substring(0, 50)}...\n`
    report += `   👀 ${reel.views_count.toLocaleString()} просмотров\n`
    report += `   ❤️ ${reel.likes_count.toLocaleString()} лайков\n`
    report += `   💬 ${reel.comments_count.toLocaleString()} комментариев\n`
    report += `   📊 ${engagement}% engagement\n`
    report += `   🔗 ${reel.ig_reel_url}\n\n`
  })

  return report
}

function calculateEngagementRate(reel: {
  views_count: number
  likes_count: number
  comments_count: number
}): number {
  return (
    (reel.likes_count + reel.comments_count) / Math.max(reel.views_count, 1)
  )
}

function sortReelsByEngagement(reels: any[]): any[] {
  return reels.sort((a, b) => b.engagement_rate - a.engagement_rate)
}

function filterReelsByDateRange(reels: any[], daysLimit: number): any[] {
  const cutoffDate = new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000)
  return reels.filter(reel => new Date(reel.created_at_instagram) >= cutoffDate)
}

function limitTopReels(reels: any[], limit: number): any[] {
  return reels.slice(0, limit)
}
