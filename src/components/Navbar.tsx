import { type Screen, type User } from "../types"

interface NavbarProps {
  user: User | null

  navigate: (s: Screen) => void

  onLogout: () => void
}

export default function Navbar({ user, navigate, onLogout }: NavbarProps) {
  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => navigate("projects")}
            className="flex items-center gap-2 font-display font-800 text-xl tracking-tight"
          >
            <span className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-sm">
              IF
            </span>
            <span className="text-gray-900">
              Impulsa<span className="text-primary">Fund</span>
            </span>
          </button>

          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => navigate("projects")}
              className="text-sm text-gray-600 hover:text-primary font-medium transition-colors"
            >
              Explorar proyectos
            </button>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                {user.role === "creator" && (
                  <button
                    onClick={() => navigate("create-campaign")}
                    className="hidden sm:flex text-sm font-medium text-primary border border-primary rounded-lg px-4 py-2 hover:bg-primary-light transition-colors"
                  >
                    Nueva campaña
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-semibold">
                    {user.name[0]}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-xs font-semibold text-gray-900">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {user.role === "creator" ? "Creador" : "Patrocinador"}
                    </p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="ml-2 text-xs text-gray-500 hover:text-error transition-colors font-medium"
                  >
                    Salir
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate("login")}
                  className="text-sm font-medium text-gray-700 hover:text-primary transition-colors px-3 py-2"
                >
                  Iniciar sesión
                </button>
                <button
                  onClick={() => navigate("register")}
                  className="text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-hover transition-colors"
                >
                  Registrarse
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
