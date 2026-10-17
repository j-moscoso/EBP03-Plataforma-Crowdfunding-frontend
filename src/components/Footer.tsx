export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xs">IF</span>
            <span className="font-display font-700 text-gray-900">ImpulsaFund</span>
          </div>
          <p className="text-xs text-gray-500">Conectamos ideas con financiadores para hacer posible el futuro.</p>
        </div>
        <div className="border-t border-gray-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-gray-400">© 2026 ImpulsaFund. Todos los derechos reservados.</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Conexión segura HTTPS/TLS
          </div>
        </div>
      </div>
    </footer>
  )
}
