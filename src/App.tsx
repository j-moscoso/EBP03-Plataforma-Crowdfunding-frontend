import { useEffect, useState } from "react"
 
import { type Campaign, type Draft, type Screen, type User } from "./types"
 
import { api, ApiError } from "./services/api"
 
import Navbar from "./components/Navbar"
 
import Footer from "./components/Footer"
 
import Register from "./screens/Register"
 
import Login from "./screens/Login"
 
import CreatorDashboard from "./screens/CreatorDashboard"
 
import SponsorDashboard from "./screens/SponsorDashboard"
 
import CreateCampaign from "./screens/CreateCampaign"
 
import CampaignPage from "./screens/CampaignPage"
 
import PaymentFlow from "./screens/PaymentFlow"
 
function screenForPath(pathname: string): Screen {
  if (pathname === "/login") return "login"
  if (pathname === "/register") return "register"
  if (pathname.startsWith("/campaigns/")) return "campaign-page"
  return "projects"
}
 
function campaignIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)/)
  return match ? match[1] : null
}
 
export default function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    screenForPath(window.location.pathname),
  )
 
  const [user, setUser] = useState<User | null>(null)
 
  const [isNewUser, setIsNewUser] = useState(false)
 
  const [drafts, setDrafts] = useState<Draft[]>([])
 
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
 
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)
 
  const [viewingCampaignId, setViewingCampaignId] = useState<string | null>(
    () => campaignIdFromPath(window.location.pathname),
  )
 
  const [booting, setBooting] = useState(true)
 
  useEffect(() => {
    const handlePopState = () => {
      setScreen(screenForPath(window.location.pathname))
      setViewingCampaignId(campaignIdFromPath(window.location.pathname))
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])
 
  useEffect(() => {
    api
      .me()
      .then((currentUser) => {
        setUser(currentUser)
 
        if (["/", "/login", "/register"].includes(window.location.pathname))
          navigate("projects", true)
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError && error.status === 401))
          console.error("No se pudo restaurar la sesión.")
      })
      .finally(() => setBooting(false))
  }, [])
 
  useEffect(() => {
    api
      .campaigns()
      .then((page) => setCampaigns(page.content))
      .catch(() => undefined)
 
    if (user?.role === "creator")
      api
        .drafts()
        .then((page) => setDrafts(page.content))
        .catch(() => undefined)
  }, [user])
 
  function navigate(nextScreen: Screen, replace = false) {
    setScreen(nextScreen)
 
    const publicPaths: Partial<Record<Screen, string>> = {
      home: "/projects",
      projects: "/projects",
      login: "/login",
      register: "/register",
    }
    const path = publicPaths[nextScreen]
    if (path && window.location.pathname !== path) {
      if (replace) window.history.replaceState({}, "", path)
      else window.history.pushState({}, "", path)
    }
 
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
 
  function handleLogin(nextUser: User) {
    setIsNewUser(false)
 
    setUser(nextUser)
 
    navigate("projects")
  }
 
  async function handleLogout() {
    setUser(null)
 
    setDrafts([])
 
    setCampaigns([])
 
    setIsNewUser(false)
 
    try {
      await api.logout()
    } finally {
      navigate("projects")
    }
  }
 
  function openDraft(id: string | null) {
    setEditingDraftId(id)
 
    navigate("create-campaign")
  }
 
  function viewCampaign(id: string) {
    setViewingCampaignId(id)
    setScreen("campaign-page")
 
    const path = `/campaigns/${id}`
    if (window.location.pathname !== path) {
      window.history.pushState({}, "", path)
    }
 
    window.scrollTo({ top: 0, behavior: "smooth" })
  }
 
  function updateDraft(draft: Draft) {
    setDrafts((previous) =>
      previous.some((item) => item.id === draft.id)
        ? previous.map((item) => (item.id === draft.id ? draft : item))
        : [draft, ...previous],
    )
  }
 
  function removeDraft(id: string) {
    setDrafts((previous) => previous.filter((item) => item.id !== id))
  }
 
  const editingDraft = editingDraftId
    ? (drafts.find((draft) => draft.id === editingDraftId) ?? null)
    : null
 
  const viewingCampaign = viewingCampaignId
    ? (campaigns.find((campaign) => campaign.id === viewingCampaignId) ?? null)
    : null
 
  const showFooter = screen !== "payment-flow"
 
  if (booting)
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-sm text-gray-500">
        Cargando sesión...
      </div>
    )
 
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar user={user} navigate={navigate} onLogout={handleLogout} />
      <main className="flex-1">
        {screen === "login" && (
          <Login navigate={navigate} onLogin={handleLogin} />
        )}
        {screen === "register" && (
          <Register navigate={navigate} onLogin={handleLogin} />
        )}
        {screen === "creator-dashboard" && user?.role === "creator" && (
          <CreatorDashboard
            navigate={navigate}
            user={user}
            isNew={isNewUser}
            drafts={drafts}
            campaigns={campaigns}
            onOpenDraft={openDraft}
            onDeleteDraft={async (id) => {
              await api.deleteDraft(id)
              removeDraft(id)
            }}
            onViewCampaign={viewCampaign}
          />
        )}
        {screen === "sponsor-dashboard" && user?.role === "sponsor" && (
          <SponsorDashboard navigate={navigate} user={user} isNew={isNewUser} />
        )}
        {screen === "create-campaign" && user?.role === "creator" && (
          <CreateCampaign
            navigate={navigate}
            initialDraft={editingDraft}
            onSaveDraft={updateDraft}
            onPublish={(campaign) => {
              setCampaigns((previous) => [campaign, ...previous])
              removeDraft(campaign.id)
              navigate("creator-dashboard")
            }}
            user={user}
          />
        )}
        {(screen === "projects" || screen === "campaign-page") && (
          <CampaignPage
            navigate={navigate}
            user={user}
            campaigns={campaigns}
            activeCampaign={viewingCampaign}
            activeCampaignId={viewingCampaignId}
            onViewCampaign={viewCampaign}
          />
        )}
        {screen === "payment-flow" && (
          <PaymentFlow
            navigate={navigate}
            campaignId={viewingCampaignId}
            user={user}
          />
        )}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}
