import { useEffect, useState } from 'react'
import type { Notification, Screen, User } from '../types'
import { ApiError, api, apiErrorMessage } from '../services/api'

interface NavbarProps {
  user: User | null
  navigate: (screen: Screen, id?: string | null) => void
  onLogout: () => void
  onSessionExpired: () => void
}

export default function Navbar({ user, navigate, onLogout, onSessionExpired }: NavbarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [panelOpen, setPanelOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function loadNotifications() {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      setNotifications((await api.notifications()).content)
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) onSessionExpired()
      else setError(apiErrorMessage(requestError, 'No pudimos cargar tus notificaciones.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPanelOpen(false)
    setNotifications([])
    setError('')
    if (user) void loadNotifications()
  }, [user?.id])

  useEffect(() => {
    if (!panelOpen) return
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPanelOpen(false)
    }
    window.addEventListener('keydown', closeWithEscape)
    return () => window.removeEventListener('keydown', closeWithEscape)
  }, [panelOpen])

  const unreadCount = notifications.filter(notification => !notification.read).length

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button type="button" onClick={() => navigate('projects')} className="flex items-center gap-2 font-display font-800 text-xl tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg">
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">IF</span>
            <span className="text-gray-900 hidden min-[390px]:inline">Impulsa<span className="text-primary">Fund</span></span>
          </button>
          <button type="button" onClick={() => navigate('projects')} className="hidden md:block text-sm text-gray-600 hover:text-primary font-medium">
            Explorar proyectos
          </button>
          <div className="flex items-center gap-2 sm:gap-3">
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(user.role === 'creator' ? 'creator-dashboard' : 'sponsor-dashboard')}
                  className="hidden sm:block text-xs font-semibold text-gray-600 hover:text-primary"
                >
                  Mi panel
                </button>
                {user.role === 'creator' && (
                  <button type="button" onClick={() => navigate('create-campaign')} className="hidden lg:block text-sm font-medium text-primary border border-primary rounded-lg px-4 py-2 hover:bg-primary-light">
                    Nueva campaña
                  </button>
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      const opening = !panelOpen
                      setPanelOpen(opening)
                      if (opening) void loadNotifications()
                    }}
                    className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-500 hover:text-primary hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30"
                    aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
                    aria-expanded={panelOpen}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 min-w-4 h-4 px-1 rounded-full bg-error text-white text-[10px] font-bold flex items-center justify-center">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                  </button>

                  {panelOpen && (
                    <div className="fixed sm:absolute top-16 sm:top-11 left-3 right-3 sm:left-auto sm:right-0 sm:w-96 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50" role="dialog" aria-label="Centro de notificaciones">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h2 className="font-display font-700 text-gray-900">Notificaciones</h2>
                          <p className="text-xs text-gray-400 mt-0.5">{unreadCount} sin leer</p>
                        </div>
                        <button type="button" onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-2 py-1" aria-label="Cerrar notificaciones">×</button>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto">
                        {loading ? (
                          <div className="py-12 text-center text-sm text-gray-500" role="status">Cargando notificaciones...</div>
                        ) : error ? (
                          <div className="p-5 text-center">
                            <p className="text-sm text-error">{error}</p>
                            <button type="button" onClick={() => void loadNotifications()} className="mt-3 text-sm font-semibold text-primary hover:underline">Reintentar</button>
                          </div>
                        ) : notifications.length === 0 ? (
                          <p className="py-12 px-5 text-center text-sm text-gray-500">No tienes notificaciones.</p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map(notification => (
                              <button
                                type="button"
                                key={notification.id}
                                onClick={() => {
                                  setPanelOpen(false)
                                  if (notification.campaignId) navigate('campaign-page', notification.campaignId)
                                }}
                                disabled={!notification.campaignId}
                                className={`w-full px-5 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary/30 disabled:cursor-default ${notification.read ? 'bg-white' : 'bg-primary-light/30'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${notification.read ? 'bg-gray-200' : 'bg-primary'}`} aria-hidden="true" />
                                  <span className="min-w-0">
                                    <span className="block text-sm font-semibold text-gray-900">{notification.title}</span>
                                    <span className="block text-xs text-gray-500 mt-1 line-clamp-2">{notification.body}</span>
                                    <span className="block text-xs text-primary font-medium mt-2">{notification.type === 'CAMPAIGN_UPDATE_PUBLISHED' ? 'Actualización del proyecto' : 'Notificación'}</span>
                                    <span className="block text-[11px] text-gray-400 mt-1">{new Date(notification.createdAt).toLocaleString('es-ES')}</span>
                                  </span>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">{user.name[0]?.toUpperCase()}</div>
                <div className="hidden xl:block">
                  <p className="text-xs font-semibold text-gray-900">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.role === 'creator' ? 'Creador' : 'Patrocinador'}</p>
                </div>
                <button type="button" onClick={() => navigate('settings')} className="hidden sm:block text-xs text-gray-500 hover:text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-1.5 py-1">Configuración</button>
                <button type="button" onClick={onLogout} className="text-xs text-gray-500 hover:text-error font-medium">Salir</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => navigate('login')} className="text-sm font-medium text-gray-700 hover:text-primary px-2 sm:px-3 py-2">Iniciar sesión</button>
                <button type="button" onClick={() => navigate('register')} className="hidden sm:block text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-hover">Registrarse</button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
