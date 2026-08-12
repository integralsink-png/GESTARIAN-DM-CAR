export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 lg:p-24 bg-background overflow-hidden relative">
      <main className="z-10 w-full max-w-6xl flex flex-col items-center gap-16 animate-fade-in">
        
        {/* Header Section */}
        <div className="text-center space-y-8 flex flex-col items-center">
          
          {/* Logo GESTARIAN */}
          <div className="relative w-32 h-32 bg-primary text-on-primary rounded-[2.5rem] flex items-center justify-center shadow-md mb-2 rotate-3 hover:rotate-0 transition-transform duration-300 border-4 border-on-primary/10">
             <span className="text-8xl font-black tracking-tighter drop-shadow-sm -mt-2">G</span>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-on-background">
              GESTARIAN
            </h1>
            
            <h2 className="text-2xl md:text-3xl text-on-background/90 font-bold tracking-wide">
              GESTIÓN TOTAL EN TU BOLSILLO
            </h2>
            <p className="text-lg md:text-xl text-on-background/60 max-w-2xl mx-auto font-medium italic mt-2">
              "Usa el espacio de tu oficina para criar gallinas."
            </p>
          </div>
        </div>

        {/* Modules Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {/* Dashboard Module Card */}
          <div className="minimal-card flex flex-col items-center text-center gap-2 cursor-pointer group">
            <div className="minimal-icon-box">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Dashboard</h3>
            <p className="text-sm text-on-surface/70 mt-1">Resumen y métricas de tu taller en tiempo real.</p>
          </div>

          {/* Expedientes Module Card */}
          <div className="minimal-card flex flex-col items-center text-center gap-2 cursor-pointer group">
            <div className="flex items-center justify-center rounded-2xl w-14 h-14 bg-secondary text-on-secondary mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Expedientes</h3>
            <p className="text-sm text-on-surface/70 mt-1">Presupuestos, citas, reparaciones y facturas.</p>
          </div>

          {/* Config Module Card */}
          <div className="minimal-card flex flex-col items-center text-center gap-2 cursor-pointer group">
            <div className="flex items-center justify-center rounded-2xl w-14 h-14 bg-tertiary text-on-tertiary mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold">Ajustes</h3>
            <p className="text-sm text-on-surface/70 mt-1">Organizaciones, roles y preferencias del sistema.</p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="mt-2 flex flex-col sm:flex-row gap-4 w-full sm:w-auto px-4">
           <a href="/app" className="minimal-button w-full sm:w-auto text-center block">
             Acceder al Sistema
           </a>
           <button className="minimal-button-outline w-full sm:w-auto">
             Conocer más
           </button>
        </div>
        
      </main>
    </div>
  );
}
