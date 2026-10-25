'use client';

import React, { useRef, useState } from 'react';
import { soundFx } from '@/lib/sound';

interface TiltCardProps {
  children: React.ReactNode;
  glowColor?: string;
  onClick?: () => void;
  className?: string;
}

export function TiltCard({ children, glowColor = '#7B2FF7', onClick, className = '' }: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotX = ((y - centerY) / centerY) * -10;
    const rotY = ((x - centerX) / centerX) * 10;
    setRotate({ x: rotX, y: rotY });
    setMousePos({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    soundFx.playHover();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotate({ x: 0, y: 0 });
    setMousePos({ x: 50, y: 50 });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => {
        soundFx.playClick();
        onClick?.();
      }}
      className={`relative cursor-pointer transition-transform duration-200 ease-out select-none ${className}`}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.025, 1.025, 1.025)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      }}
    >
      {/* Dynamic Hover Ambient Glow */}
      <div
        className="absolute -inset-1 rounded-3xl opacity-0 transition-opacity duration-300 blur-xl pointer-events-none"
        style={{
          background: glowColor,
          opacity: isHovered ? 0.38 : 0,
        }}
      />

      {/* Dynamic Specular Reflection Spotlight */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-200 pointer-events-none z-10"
        style={{
          background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.12) 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />
      {children}
    </div>
  );
}
