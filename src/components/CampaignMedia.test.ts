import { describe, expect, it } from 'vitest'
import { isPublicHttpsUrl, resolveVideoSource } from './CampaignMedia'

describe('resolveVideoSource', () => {
  it('accepts direct HTTPS video files with query strings', () => {
    expect(resolveVideoSource('https://cdn.example/video.mp4?signature=abc')).toEqual({
      kind: 'file',
      url: 'https://cdn.example/video.mp4?signature=abc',
    })
  })

  it('converts recognized YouTube and Vimeo links to trusted embeds', () => {
    expect(resolveVideoSource('https://youtu.be/abc_123')).toEqual({
      kind: 'embed',
      url: 'https://www.youtube-nocookie.com/embed/abc_123',
    })
    expect(resolveVideoSource('https://vimeo.com/12345')).toEqual({
      kind: 'embed',
      url: 'https://player.vimeo.com/video/12345',
    })
  })

  it('rejects insecure links and unknown providers as embeddable video', () => {
    expect(resolveVideoSource('http://cdn.example/video.mp4')).toBeNull()
    expect(resolveVideoSource('https://unknown.example/watch/123')).toBeNull()
    expect(resolveVideoSource('javascript:alert(1)')).toBeNull()
  })

  it('requires public HTTPS URLs and rejects loopback hosts', () => {
    expect(isPublicHttpsUrl('https://cdn.example/video.mp4')).toBe(true)
    expect(isPublicHttpsUrl('http://cdn.example/image.jpg')).toBe(false)
    expect(isPublicHttpsUrl('https://localhost/video.mp4')).toBe(false)
    expect(isPublicHttpsUrl('https://localhost./video.mp4')).toBe(false)
    expect(isPublicHttpsUrl('https://localhost.localdomain/video.mp4')).toBe(false)
    expect(isPublicHttpsUrl('https://127.0.0.1/video.mp4')).toBe(false)
    expect(isPublicHttpsUrl('https://[::1]/video.mp4')).toBe(false)
  })
})
