import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Campaign, Draft, Screen, User } from './types'
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

interface Route {
  screen: Screen
  campaignId: string | null
  draftId: string | null
  resetToken: string | null
}

function routeFromPath(pathname: string, search: string): Route {
  const campaign = pathname.match(/^\/campaigns\/([^/]+)\/?$/)
  const payment = pathname.match(/^\/payment-flow\/([^/]+)\/?$/)
  if (campaign) return { screen: 'campaign-page', campaignId: decodeURIComponent(campaign[1]), draftId: null, resetToken: null }
  if (payment) return { screen: 'payment-flow', campaignId: decodeURIComponent(payment[1]), draftId: null, resetToken: null }
  if (pathname.replace(/\/+$/, '') === '/password-reset/confirm') {
    return {
      screen: 'password-reset-confirm',
      campaignId: null,
      draftId: null,
      resetToken: new URLSearchParams(search).get('token'),
    }
  }
  const map: Record<string, Screen> = {
    '/': 'register',
    '/register': 'register',
    '/login': 'login',
    '/password-reset': 'password-reset-request',
    '/settings': 'settings',
    '/creator-profile': 'creator-profile',
    '/projects': 'projects',
    '/creator-dashboard': 'creator-dashboard',
    '/sponsor-dashboard': 'sponsor-dashboard',
    '/transaction-history': 'transaction-history',
    '/supported-projects': 'supported-projects',
    '/create-campaign': 'create-campaign',
  }
  return {
    screen: map[pathname.replace(/\/+$/, '') || '/'] ?? 'register',
    campaignId: null,
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [mine, setMine] = useState<Campaign[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [privateLoading, setPrivateLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [privateError, setPrivateError] = useState('')

  const navigate = useCallback((screen: Screen, id?: string | null) => {
    const path = pathFor(screen, id)
    history.pushState({}, '', path)
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
    if (sessionLoading) return
    if (route.screen === 'supported-projects' && !user) {
      navigate('login')
      return
    }
    const privateScreens: Screen[] = ['creator-dashboard', 'sponsor-dashboard', 'transaction-history', 'supported-projects', 'create-campaign', 'settings', 'creator-profile']
    if (privateScreens.includes(route.screen) && !user) {
      navigate('login')
      return
    }
    if (route.screen === 'creator-dashboard' && user?.role !== 'creator') navigate('projects')
    if (route.screen === 'sponsor-dashboard' && user?.role !== 'sponsor') navigate('projects')
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

  function handleSessionExpired() {
    setUser(null)
    setMine([])
    setDrafts([])
    navigate('login')
  }

  async function handleLogout() {
    try {
      await api.logout()
    } catch (error) {
      console.error('No se pudo cerrar la sesión en el servidor:', error)
    } finally {
      setUser(null)
      setMine([])
      setDrafts([])
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
      <Navbar user={user} navigate={navigate} onLogout={handleLogout} onSessionExpired={handleSessionExpired} />
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
            user={user}
            onSessionExpired={handleSessionExpired}
          />
        )}
        {route.screen === 'campaign-page' && (
          <CampaignPage
            campaignId={route.campaignId}
            campaigns={campaigns}
            loading={projectsLoading}
            error={projectsError}
            navigate={navigate}
            user={user}
            onSessionExpired={handleSessionExpired}
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
          <SponsorDashboard user={user} navigate={navigate} onSessionExpired={handleSessionExpired} />
        )}
        {route.screen === 'transaction-history' && user?.role === 'sponsor' && (
          <TransactionHistory navigate={navigate} onSessionExpired={handleSessionExpired} />
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
          />
        )}
        {route.screen === 'payment-flow' && (
          <PaymentFlow campaignId={route.campaignId} user={user} navigate={navigate} onSessionExpired={handleSessionExpired} />
        )}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
