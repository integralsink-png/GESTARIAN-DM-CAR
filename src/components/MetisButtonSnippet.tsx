        <button
          onClick={() => {
            playSound('click');
            window.dispatchEvent(new Event('metis-toggle-panel'));
          }}
          className="w-16 h-16 rounded-full bg-transparent text-[#a855f7] shadow-[0_0_10px_rgba(168,85,247,0.9),inset_0_0_5px_rgba(168,85,247,0.9)] border-[1px] border-white flex items-center justify-center transition-all hover:scale-105 flex-shrink-0 relative"
          style={{ filter: 'drop-shadow(0 0 5px #a855f7)' }}
          aria-label="Asistente METIS"
        >
          <span className="font-thin text-[29px] text-white tracking-widest leading-none" style={{ WebkitTextStroke: '0.2px rgba(255, 255, 255, 0.9)' }}>AI</span>
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-green-400 rounded-full border-[2px] border-transparent animate-metis-dot" />
        </button>
