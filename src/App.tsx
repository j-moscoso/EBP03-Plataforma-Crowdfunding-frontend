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
  if (pathname === "/" || pathname === "/register") return "register"
  if (pathname === "/login") return "login"
  if (/^\/campaigns\/[^/]+$/.test(pathname)) return "campaign-page"
  if (/^\/payment-flow\/[^/]+$/.test(pathname)) return "payment-flow"
  if (pathname === "/creator-dashboard") return "creator-dashboard"
  if (pathname === "/sponsor-dashboard") return "sponsor-dashboard"
  if (pathname === "/create-campaign") return "create-campaign"
  return "projects"
}

function campaignIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/campaigns\/([^/]+)/)
  return match ? match[1] : null
}

function paymentCampaignIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/payment-flow\/([^/]+)$/)
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

  const [ownCampaigns, setOwnCampaigns] = useState<Campaign[]>([])

  const [editingDraftId, setEditingDraftId] = useState<string | null>(null)

  const [viewingCampaignId, setViewingCampaignId] = useState<string | null>(
    () =>
      campaignIdFromPath(window.location.pathname) ??
      paymentCampaignIdFromPath(window.location.pathname),
  )

  const [booting, setBooting] = useState(true)

  useEffect(() => {
    const handlePopState = () => {
      setScreen(screenForPath(window.location.pathname))
      setViewingCampaignId(
        campaignIdFromPath(window.location.pathname) ??
          paymentCampaignIdFromPath(window.location.pathname),
      )
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
        if (error instanceof ApiError && error.status === 401) {
          setUser(null)
          setDrafts([])
          setOwnCampaigns([])
          setEditingDraftId(null)
          if (
            window.location.pathname === "/" ||
            [
              "/creator-dashboard",
              "/sponsor-dashboard",
              "/create-campaign",
              "/payment-flow",
            ].some((path) => window.location.pathname.startsWith(path))
          )
            navigate("register", true)
        } else {
          console.error("No se pudo restaurar la sesión.")
        }
      })
      .finally(() => setBooting(false))
  }, [])

  useEffect(() => {
    api
      .campaigns()
      .then((page) => setCampaigns(page.content))
      .catch(() => undefined)

    setOwnCampaigns([])
    setDrafts([])
    if (user?.role !== "creator") return

    api
      .campaignsMine()
      .then((page) => setOwnCampaigns(page.content))
      .catch(() => undefined)
    api
      .drafts()
      .then((page) => setDrafts(page.content))
      .catch(() => undefined)
  }, [user])

  useEffect(() => {
    const privateScreens: Screen[] = [
      "creator-dashboard",
      "sponsor-dashboard",
      "create-campaign",
      "payment-flow",
    ]
    if (!user && privateScreens.includes(screen)) navigate("register", true)
    if (
      user?.role !== "creator" &&
      ["creator-dashboard", "create-campaign"].includes(screen)
    )
      navigate(user ? "projects" : "register", true)
    if (user?.role !== "sponsor" && screen === "sponsor-dashboard")
      navigate(user ? "projects" : "register", true)
  }, [screen, user])

  function navigate(
    nextScreen: Screen,
    replace = false,
    campaignId: string | null = viewingCampaignId,
  ) {
    setScreen(nextScreen)

    const publicPaths: Partial<Record<Screen, string>> = {
      home: "/projects",
      projects: "/projects",
      login: "/login",
      register: "/register",
      "creator-dashboard": "/creator-dashboard",
      "sponsor-dashboard": "/sponsor-dashboard",
      "create-campaign": "/create-campaign",
    }
    const path =
      nextScreen === "campaign-page" && campaignId
        ? `/campaigns/${campaignId}`
        : nextScreen === "payment-flow" && campaignId
          ? `/payment-flow/${campaignId}`
          : publicPaths[nextScreen]
    setViewingCampaignId(
      nextScreen === "campaign-page" || nextScreen === "payment-flow"
        ? campaignId
        : null,
    )
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
    setOwnCampaigns([])
    setEditingDraftId(null)
    setViewingCampaignId(null)
    setIsNewUser(false)

    try {
      await api.logout()
    } catch (error) {
      console.error("No se pudo invalidar la sesión en el servidor.", error)
    } finally {
      navigate("register")
    }
  }

  function openDraft(id: string | null) {
    setEditingDraftId(id)

    navigate("create-campaign")
  }

  function viewCampaign(id: string) {
    navigate("campaign-page", false, id)
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
            campaigns={ownCampaigns}
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
              setOwnCampaigns((previous) => [campaign, ...previous])
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
