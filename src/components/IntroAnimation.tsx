// src/components/IntroAnimation.tsx
import React from 'react';

interface IntroAnimationProps {
  showIntro: boolean;
  introState: 'start' | 'grow' | 'fadeOut';
}

export const IntroAnimation: React.FC<IntroAnimationProps> = ({
  showIntro,
  introState,
}) => {
  if (!showIntro) return null;

  return (
    <div 
      className={`fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-black transition-opacity duration-500 ease-in-out ${
        introState === 'fadeOut' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
      }}
    >
      <h1 
        className={`font-extralight tracking-[0.4em] uppercase text-2xl sm:text-4xl text-white text-center transition-transform duration-1000 ease-out ${
          introState === 'start' ? 'scale-50 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{
          textShadow: '0 0 20px rgba(45, 212, 191, 0.9), 0 0 40px rgba(45, 212, 191, 0.6), 0 0 60px rgba(45, 212, 191, 0.3)'
        }}
      >
        GESTARIAN
      </h1>
    </div>
  );
};
