import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type {
  Campaign,
  Draft,
  Notification,
  Screen,
  CampaignSummary,
  User,
} from './types'
import { ApiError, api, apiErrorMessage } from './services/api'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Register from './screens/Register'
import Login from './screens/Login'
import CreatorDashboard from './screens/CreatorDashboard'
import SponsorDashboard from './screens/SponsorDashboard'
import CreateCampaign from './screens/CreateCampaign'
import CampaignPage from './screens/CampaignPage'
import PaymentFlow from './screens/PaymentFlow'
import PasswordReset from './screens/PasswordReset'
import UserSettings from './screens/UserSettings'
import CreatorProfile from './screens/CreatorProfile'
import TransactionHistory from './screens/TransactionHistory'
import SupportedProjects from './screens/SupportedProjects'
import Subscriptions from './screens/Subscriptions'

interface Route {
  screen: Screen
  campaignId: string | null
  rewardId: string | null
  draftId: string | null
  resetToken: string | null
}

function routeFromPath(pathname: string, search: string): Route {
  const campaign = pathname.match(/^\/campaigns\/([^/]+)\/?$/)
  const payment = pathname.match(/^\/payment-flow\/([^/]+)\/?$/)
  if (campaign) return { screen: 'campaign-page', campaignId: decodeURIComponent(campaign[1]), rewardId: null, draftId: null, resetToken: null }
  if (payment) return {
    screen: 'payment-flow',
    campaignId: decodeURIComponent(payment[1]),
    rewardId: new URLSearchParams(search).get('reward'),
    draftId: null,
    resetToken: null,
  }
  if (pathname.replace(/\/+$/, '') === '/password-reset/confirm') {
    return {
      screen: 'password-reset-confirm',
      campaignId: null,
      rewardId: null,
      draftId: null,
      resetToken: new URLSearchParams(search).get('token'),
    }
  }
  const map: Record<string, Screen> = {
    '/': 'login',
    '/register': 'register',
    '/login': 'login',
    '/password-reset': 'password-reset-request',
    '/settings': 'settings',
    '/creator-profile': 'creator-profile',
    '/projects': 'projects',
    '/creator-dashboard': 'creator-dashboard',
    '/sponsor-dashboard': 'sponsor-dashboard',
    '/subscriptions': 'subscriptions',
    '/transaction-history': 'transaction-history',
    '/supported-projects': 'supported-projects',
    '/create-campaign': 'create-campaign',
  }
  return {
    screen: map[pathname.replace(/\/+$/, '') || '/'] ?? 'register',
    campaignId: null,
    rewardId: null,
    draftId: new URLSearchParams(search).get('draft'),
    resetToken: null,
  }
}

function pathFor(screen: Screen, id?: string | null) {
  const paths: Record<Screen, string> = {
    home: '/',
    projects: '/projects',
    register: '/register',
    login: '/login',
    'password-reset-request': '/password-reset',
    'password-reset-confirm': '/password-reset/confirm',
    settings: '/settings',
    'creator-profile': '/creator-profile',
    'creator-dashboard': '/creator-dashboard',
    'sponsor-dashboard': '/sponsor-dashboard',
    subscriptions: '/subscriptions',
    'transaction-history': '/transaction-history',
    'supported-projects': '/supported-projects',
    'create-campaign': id ? `/create-campaign?draft=${encodeURIComponent(id)}` : '/create-campaign',
    'campaign-page': id ? `/campaigns/${encodeURIComponent(id)}` : '/projects',
    'payment-flow': id ? `/payment-flow/${encodeURIComponent(id)}` : '/projects',
  }
  return paths[screen]
}

export default function App() {
  const [route, setRoute] = useState(() => routeFromPath(location.pathname, location.search))
  const [sessionLoading, setSessionLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [mine, setMine] = useState<CampaignSummary[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [privateLoading, setPrivateLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [privateError, setPrivateError] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationsError, setNotificationsError] = useState('')
  const notificationSessionRef = useRef<string | null>(null)

  const navigate = useCallback((screen: Screen, id?: string | null) => {
    const path = pathFor(screen, id)
    history.pushState({}, '', path)
    setRoute(routeFromPath(location.pathname, location.search))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const handleSessionExpired = useCallback(() => {
    notificationSessionRef.current = null
    setUser(null)
    setMine([])
    setDrafts([])
    setNotifications([])
    setNotificationsError('')
    navigate('login')
  }, [navigate])

  const refreshNotifications = useCallback(async (background = false) => {
    const sessionUserId = notificationSessionRef.current
    if (!sessionUserId) return
    if (!background) setNotificationsLoading(true)
    try {
      const response = await api.notifications()
      if (notificationSessionRef.current !== sessionUserId) return
      setNotifications(response.content)
      setNotificationsError('')
    } catch (error) {
      if (notificationSessionRef.current !== sessionUserId) return
      if (error instanceof ApiError && error.status === 401) {
        handleSessionExpired()
        return
      }
      setNotificationsError(apiErrorMessage(error, 'No pudimos cargar tus notificaciones.'))
    } finally {
      if (!background && notificationSessionRef.current === sessionUserId) setNotificationsLoading(false)
    }
  }, [handleSessionExpired])

  const selectReward = useCallback((campaignId: string, rewardId: string) => {
    history.pushState({}, '', `/payment-flow/${encodeURIComponent(campaignId)}?reward=${encodeURIComponent(rewardId)}`)
    setRoute(routeFromPath(location.pathname, location.search))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const refreshProjects = useCallback(async () => {
    setProjectsLoading(true)
    setProjectsError('')
    try {
      setCampaigns((await api.campaigns()).content)
    } catch (error) {
      setProjectsError(apiErrorMessage(error, 'No pudimos cargar las campañas.'))
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  const refreshCreatorData = useCallback(async () => {
    setPrivateLoading(true)
    setPrivateError('')
    try {
      const [campaignResponse, draftResponse] = await Promise.all([api.campaignsMine(), api.drafts()])
      setMine(campaignResponse.content)
      setDrafts(draftResponse.content)
    } catch (error) {
      setPrivateError(apiErrorMessage(error, 'No pudimos cargar tu panel.'))
    } finally {
      setPrivateLoading(false)
    }
  }, [])

  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath(location.pathname, location.search))
    addEventListener('popstate', onPopState)
    return () => removeEventListener('popstate', onPopState)
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.dispatchEvent(new Event('impulsafund:route-ready'))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [route.screen, route.campaignId, route.rewardId, route.draftId, route.resetToken])

  useEffect(() => {
    void (async () => {
      let restored: User | null = null
      try {
        restored = await api.me()
        setUser(restored)
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) {
          console.error('No se pudo restaurar la sesión:', error)
        }
      } finally {
        setSessionLoading(false)
      }
      const current = routeFromPath(location.pathname, location.search)
      if (current.screen === 'register' || current.screen === 'home') {
        const target = restored ? '/projects' : '/login'
        history.replaceState({}, '', target)
        setRoute(routeFromPath(location.pathname, location.search))
      }
    })()
  }, [])

  useEffect(() => {
    if (!sessionLoading) void refreshProjects()
  }, [sessionLoading, refreshProjects])

  useEffect(() => {
    if (user?.role === 'creator') void refreshCreatorData()
    else {
      setMine([])
      setDrafts([])
      setPrivateError('')
    }
  }, [user, refreshCreatorData])

  useEffect(() => {
    if (!user) {
      notificationSessionRef.current = null
      setNotifications([])
      setNotificationsError('')
      setNotificationsLoading(false)
      return
    }

    notificationSessionRef.current = user.id
    void refreshNotifications()
    const configuredInterval = Number(import.meta.env.VITE_NOTIFICATION_POLL_MS ?? 30000)
    if (!Number.isFinite(configuredInterval) || configuredInterval <= 0) return
    const interval = window.setInterval(() => void refreshNotifications(true), configuredInterval)
    return () => window.clearInterval(interval)
  }, [user?.id, refreshNotifications])

  useEffect(() => {
    if (sessionLoading) return
    if ((route.screen === 'supported-projects' || route.screen === 'subscriptions') && !user) {
      navigate('login')
      return
    }
    const privateScreens: Screen[] = ['creator-dashboard', 'sponsor-dashboard', 'subscriptions', 'transaction-history', 'supported-projects', 'create-campaign', 'settings', 'creator-profile']
    if (privateScreens.includes(route.screen) && !user) {
      navigate('login')
      return
    }
    if (route.screen === 'creator-dashboard' && user?.role !== 'creator') navigate('projects')
    if (route.screen === 'sponsor-dashboard' && user?.role !== 'sponsor') navigate('projects')
    if (route.screen === 'subscriptions' && user?.role !== 'sponsor') navigate('projects')
    if (route.screen === 'transaction-history' && user?.role !== 'sponsor') navigate('projects')
    if (route.screen === 'supported-projects' && user?.role !== 'sponsor') navigate('projects')
    if (route.screen === 'create-campaign' && user?.role !== 'creator') navigate('projects')
    if (route.screen === 'creator-profile' && user?.role !== 'creator') navigate('projects')
  }, [route.screen, sessionLoading, user, navigate])

  useEffect(() => {
    if (
      sessionLoading ||
      route.screen !== 'create-campaign' ||
      !route.draftId ||
      user?.role !== 'creator' ||
      drafts.some(draft => draft.id === route.draftId)
    ) return
    let active = true
    setPrivateLoading(true)
    setPrivateError('')
    void api.draft(route.draftId)
      .then(draft => {
        if (!active) return
        setDrafts(current => current.some(item => item.id === draft.id) ? current : [draft, ...current])
      })
      .catch(error => {
        if (active) setPrivateError(apiErrorMessage(error, 'No pudimos cargar el borrador.'))
      })
      .finally(() => {
        if (active) setPrivateLoading(false)
      })
    return () => { active = false }
  }, [drafts, route.draftId, route.screen, sessionLoading, user])

  const editingDraft = useMemo(
    () => drafts.find(draft => draft.id === route.draftId) ?? null,
    [drafts, route.draftId],
  )

  function handleAuth(authenticatedUser: User) {
    setUser(authenticatedUser)
    navigate('projects')
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch (error) {
      console.error('No se pudo cerrar la sesión en el servidor:', error)
    } finally {
      notificationSessionRef.current = null
      setUser(null)
      setMine([])
      setDrafts([])
      setNotifications([])
      setNotificationsError('')
      navigate('login')
    }
  }

  function upsertDraft(draft: Draft) {
    setDrafts(current => {
      const exists = current.some(item => item.id === draft.id)
      return exists ? current.map(item => item.id === draft.id ? draft : item) : [draft, ...current]
    })
  }

  function handlePublished(campaign: Campaign, draftId: string) {
    setDrafts(current => current.filter(item => item.id !== draftId))
    setMine(current => [campaign, ...current.filter(item => item.id !== campaign.id)])
    if (campaign.status === 'ACTIVE') {
      setCampaigns(current => [campaign, ...current.filter(item => item.id !== campaign.id)])
    }
  }


  if (sessionLoading) {
    return <div className="min-h-screen bg-bg flex items-center justify-center text-sm font-semibold text-gray-600">Cargando sesión...</div>
  }

  const showFooter = route.screen !== 'payment-flow'
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar
        user={user}
        navigate={navigate}
        onLogout={handleLogout}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsError={notificationsError}
        onRefreshNotifications={() => void refreshNotifications()}
        onReadNotification={async id => {
          try {
            await api.markNotificationRead(id)
            setNotifications(current => current.map(notification => notification.id === id ? { ...notification, read: true } : notification))
            setNotificationsError('')
            return true
          } catch (error) {
            if (error instanceof ApiError && error.status === 401) {
              handleSessionExpired()
              return false
            }
            setNotificationsError(apiErrorMessage(error, 'No pudimos marcar la notificación como leída.'))
            return false
          }
        }}
      />
      <main className="flex-1">
        {(route.screen === 'home' || route.screen === 'register') && (
          <Register navigate={navigate} onLogin={handleAuth} />
        )}
        {route.screen === 'login' && <Login navigate={navigate} onLogin={handleAuth} />}
        {route.screen === 'password-reset-request' && (
          <PasswordReset
            mode="request"
            token={null}
            navigate={navigate}
            clearToken={() => undefined}
          />
        )}
        {route.screen === 'password-reset-confirm' && (
          <PasswordReset
            mode="confirm"
            token={route.resetToken}
            navigate={navigate}
            clearToken={() => history.replaceState({}, '', '/password-reset/confirm')}
          />
        )}
        {route.screen === 'settings' && user && (
          <UserSettings
            navigate={navigate}
            onUserUpdated={setUser}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {route.screen === 'creator-profile' && user?.role === 'creator' && (
          <CreatorProfile
            navigate={navigate}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {route.screen === 'projects' && (
          <CampaignPage
            campaignId={null}
            campaigns={campaigns}
            loading={projectsLoading}
            error={projectsError}
            navigate={navigate}
            onSelectReward={selectReward}
            user={user}
          />
        )}
        {route.screen === 'campaign-page' && (
          <CampaignPage
            campaignId={route.campaignId}
            campaigns={campaigns}
            loading={projectsLoading}
            error={projectsError}
            navigate={navigate}
            onSelectReward={selectReward}
            user={user}
          />
        )}
        {route.screen === 'creator-dashboard' && user?.role === 'creator' && (
          <CreatorDashboard
            user={user}
            campaigns={mine}
            drafts={drafts}
            loading={privateLoading}
            error={privateError}
            navigate={navigate}
            onDraftDeleted={id => setDrafts(current => current.filter(item => item.id !== id))}
          />
        )}
        {route.screen === 'sponsor-dashboard' && user?.role === 'sponsor' && (
          <SponsorDashboard
            user={user}
            navigate={navigate}
          />
        )}
        {route.screen === 'subscriptions' && user?.role === 'sponsor' && (
          <Subscriptions
            user={user}
            creators={[...campaigns, ...mine].flatMap(campaign =>
              campaign.creator ? [{ id: campaign.creator.id, name: campaign.creator.name }] : [],
            )}
            navigate={navigate}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {route.screen === 'transaction-history' && user?.role === 'sponsor' && (
          <TransactionHistory
            navigate={navigate}
          />
        )}
        {route.screen === 'supported-projects' && user?.role === 'sponsor' && (
          <SupportedProjects
            navigate={navigate}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {route.screen === 'create-campaign' && user?.role === 'creator' && route.draftId && !editingDraft && (
          <div className="min-h-screen bg-bg flex items-center justify-center px-4 text-center">
            <div>
              <p className="text-sm font-semibold text-gray-600">{privateLoading ? 'Cargando borrador...' : privateError || 'No encontramos el borrador.'}</p>
              {!privateLoading && <button onClick={() => navigate('creator-dashboard')} className="mt-4 text-sm font-semibold text-primary">Volver al panel</button>}
            </div>
          </div>
        )}
        {route.screen === 'create-campaign' && user?.role === 'creator' && (!route.draftId || editingDraft) && (
          <CreateCampaign
            initialDraft={editingDraft}
            navigate={navigate}
            onSaveDraft={upsertDraft}
            onPublish={handlePublished}
            user={user}
          />
        )}
        {route.screen === 'payment-flow' && (
          <PaymentFlow
            campaignId={route.campaignId}
            initialRewardId={route.rewardId}
            user={user}
            navigate={navigate}
          />
        )}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
