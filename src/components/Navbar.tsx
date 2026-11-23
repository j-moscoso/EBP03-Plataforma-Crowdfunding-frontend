import { useEffect, useState } from 'react'
import type { Notification, Screen, User } from '../types'
import ThemeToggle from './ThemeToggle'

interface NavbarProps {
  user: User | null
  navigate: (screen: Screen, id?: string | null) => void
  onLogout: () => void
  notifications: Notification[]
  notificationsLoading: boolean
  notificationsError: string
  onRefreshNotifications: () => void
  onReadNotification: (id: string) => Promise<boolean>
}

const notificationTypeLabels: Record<string, string> = {
  NEW_CONTRIBUTION: 'Nuevo aporte',
  CAMPAIGN_UPDATE_PUBLISHED: 'Actualización',
}

function NotificationIcon({ type }: { type: string }) {
  if (type === 'NEW_CONTRIBUTION') {
    return (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m3-9.5c0-1.38-1.34-2.5-3-2.5S9 7.12 9 8.5s1.34 2.5 3 2.5 3 1.12 3 2.5-1.34 2.5-3 2.5-3-1.12-3-2.5" />
      </svg>
    )
  }
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export default function Navbar({
  user,
  navigate,
  onLogout,
  notifications,
  notificationsLoading,
  notificationsError,
  onRefreshNotifications,
  onReadNotification,
}: NavbarProps) {
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    setPanelOpen(false)
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
            <ThemeToggle />
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => navigate(user.role === 'creator' ? 'creator-dashboard' : 'sponsor-dashboard')}
                  className="hidden sm:block text-xs font-semibold text-gray-600 hover:text-primary"
                >
                  Mi panel
                </button>
                {user.role === 'sponsor' && (
                  <button type="button" onClick={() => navigate('subscriptions')} className="hidden lg:block text-sm font-medium text-primary border border-primary rounded-lg px-4 py-2 hover:bg-primary-light focus:outline-none focus:ring-2 focus:ring-primary/30">
                    Mis suscripciones
                  </button>
                )}
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
                      if (opening) onRefreshNotifications()
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
                    <div className="fixed sm:absolute top-16 sm:top-11 left-3 right-3 sm:left-auto sm:right-0 sm:w-96 bg-white rounded-2xl border border-gray-100 shadow-xl overflow-hidden z-50 motion-safe:animate-[fade-in_150ms_ease-out]" role="dialog" aria-modal="false" aria-labelledby="notifications-title">
                      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                        <div>
                          <h2 id="notifications-title" className="font-display font-700 text-gray-900">Notificaciones</h2>
                          <p className="text-xs text-gray-400 mt-0.5">{unreadCount} sin leer</p>
                        </div>
                        <button type="button" onClick={() => setPanelOpen(false)} className="text-gray-400 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-md px-2 py-1 text-xl leading-none" aria-label="Cerrar notificaciones">×</button>
                      </div>
                      <span className="sr-only" aria-live="polite">{unreadCount} notificaciones sin leer</span>
                      <div className="max-h-[70vh] overflow-y-auto">
                        {notificationsError && (
                          <div className="m-3 rounded-xl bg-error/10 px-4 py-3 text-sm text-error" role="alert">
                            <p>{notificationsError}</p>
                            <button type="button" onClick={onRefreshNotifications} className="mt-2 font-semibold underline underline-offset-2 focus:outline-none focus:ring-2 focus:ring-error/30 rounded">Reintentar</button>
                          </div>
                        )}
                        {notificationsLoading && notifications.length === 0 ? (
                          <div className="p-5 space-y-4" aria-label="Cargando notificaciones" aria-busy="true">
                            {[0, 1, 2].map(item => (
                              <div key={item} className="flex gap-3 animate-pulse motion-reduce:animate-none">
                                <span className="w-8 h-8 rounded-full bg-gray-100 shrink-0" />
                                <span className="flex-1 space-y-2">
                                  <span className="block h-3 w-2/3 rounded bg-gray-100" />
                                  <span className="block h-3 w-full rounded bg-gray-100" />
                                  <span className="block h-3 w-1/3 rounded bg-gray-100" />
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : notifications.length === 0 && !notificationsError ? (
                          <p className="py-12 px-5 text-center text-sm text-gray-500">No tienes notificaciones</p>
                        ) : (
                          <div className="divide-y divide-gray-100">
                            {notifications.map(notification => (
                              <button
                                type="button"
                                key={notification.id}
                                onClick={async () => {
                                  const readSucceeded = await onReadNotification(notification.id)
                                  if (readSucceeded && notification.campaignId) {
                                    setPanelOpen(false)
                                    navigate('campaign-page', notification.campaignId)
                                  }
                                }}
                                className={`w-full px-5 py-4 text-left hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary transition-colors motion-reduce:transition-none ${notification.read ? 'bg-white' : 'bg-primary-light/40'}`}
                              >
                                <div className="flex items-start gap-3">
                                  <span className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notification.read ? 'bg-gray-100 text-gray-500' : 'bg-primary/15 text-primary'}`}>
                                    <NotificationIcon type={notification.type} />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2 text-[11px] font-semibold text-primary">
                                      {!notification.read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" aria-hidden="true" />}
                                      {notificationTypeLabels[notification.type] ?? 'Notificación'}
                                      <span className="ml-auto text-gray-400 font-medium">{notification.read ? 'Leída' : 'Sin leer'}</span>
                                    </span>
                                    <span className="block text-sm font-semibold text-gray-900">{notification.title}</span>
                                    <span className="block text-xs text-gray-500 mt-1">{notification.body}</span>
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
