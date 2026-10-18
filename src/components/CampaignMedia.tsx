import { useEffect, useState } from 'react'
import type { CampaignMediaType } from '../types'

type VideoSource =
  | { kind: 'file'; url: string }
  | { kind: 'embed'; url: string }

export function resolveVideoSource(value: string): VideoSource | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  if (url.protocol !== 'https:') return null

  if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) {
    return { kind: 'file', url: url.toString() }
  }

  const host = url.hostname.toLowerCase()
  let videoId: string | null = null
  if (host === 'youtu.be') {
    videoId = url.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(host)) {
    videoId = url.pathname === '/watch'
      ? url.searchParams.get('v')
      : url.pathname.match(/^\/embed\/([^/]+)/)?.[1] ?? null
  } else if (host === 'vimeo.com' || host === 'www.vimeo.com') {
    videoId = url.pathname.match(/^\/(\d+)/)?.[1] ?? null
    if (videoId) return { kind: 'embed', url: `https://player.vimeo.com/video/${videoId}` }
  } else if (host === 'player.vimeo.com') {
    videoId = url.pathname.match(/^\/video\/(\d+)/)?.[1] ?? null
    if (videoId) return { kind: 'embed', url: `https://player.vimeo.com/video/${videoId}` }
  }

  return videoId && /^[A-Za-z0-9_-]+$/.test(videoId)
    ? { kind: 'embed', url: `https://www.youtube-nocookie.com/embed/${videoId}` }
    : null
}

export function isPublicHttpsUrl(value: string) {
  try {
    const url = new URL(value)
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
    const isLoopback = hostname === 'localhost'
      || hostname.endsWith('.localhost')
      || hostname === 'localhost.localdomain'
      || hostname.endsWith('.localhost.localdomain')
      || hostname === '::1'
      || hostname === '0.0.0.0'
      || /^127\./.test(hostname)
      || /^::ffff:127(?:\.|$)/.test(hostname)
    return url.protocol === 'https:' && !isLoopback
  } catch {
    return false
  }
}

function mediaHost(value: string) {
  try {
    return new URL(value).hostname
  } catch {
    return 'este proveedor'
  }
}

function VideoFallback({ url, title }: { url: string; title: string }) {
  return (
    <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center px-4 text-center">
      <p className="text-sm font-semibold text-white">No pudimos reproducir el video de {mediaHost(url)} para {title}.</p>
      <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 text-sm text-white underline">
        Abrir video en una pestaña nueva
      </a>
    </div>
  )
}

export default function CampaignMedia({
  url,
  mediaType,
  title,
  className,
}: {
  url: string | null
  mediaType?: CampaignMediaType
  title: string
  className: string
}) {
  const [failed, setFailed] = useState(false)
  useEffect(() => setFailed(false), [url, mediaType])

  if (!url) return <div className={`${className} bg-gradient-to-br from-gray-100 to-gray-200`} />
  if (!isPublicHttpsUrl(url)) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center px-4 text-center`} role="img" aria-label={`Medio no disponible para ${title}`}>
        <p className="text-sm text-gray-500">Usa una URL HTTPS pública; las direcciones localhost no son accesibles para otros usuarios.</p>
      </div>
    )
  }

  if (failed && mediaType === 'VIDEO') return <VideoFallback url={url} title={title} />
  if (failed) {
    return (
      <div className={`${className} bg-gray-100 flex items-center justify-center px-4 text-center`} role="img" aria-label={`Medio no disponible para ${title}`}>
        <p className="text-sm text-gray-500">No pudimos mostrar la imagen de esta campaña.</p>
      </div>
    )
  }

  if (mediaType !== 'VIDEO') {
    return (
      <div className={`${className} bg-gray-100 overflow-hidden`}>
        <img
          src={url}
          alt={`Portada de ${title}`}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  const source = resolveVideoSource(url)
  if (!source) {
    return <div className={`${className} overflow-hidden rounded-xl`}><VideoFallback url={url} title={title} /></div>
  }

  return (
    <div className={`${className} bg-gray-900 overflow-hidden`}>
      {source.kind === 'file' ? (
        <video
          src={source.url}
          title={`Video de ${title}`}
          controls
          playsInline
          preload="metadata"
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <iframe
          src={source.url}
          title={`Video de ${title}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-presentation"
          allowFullScreen
          onError={() => setFailed(true)}
        />
      )}
    </div>
  )
}
