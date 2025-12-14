import React, { useEffect, useState, useRef } from 'react';
import { KEYS } from '../constants';

interface ControlsProps {
  inputState: React.MutableRefObject<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    a: boolean;
    b: boolean;
  }>;
}

const Controls: React.FC<ControlsProps> = ({ inputState }) => {
  // Local state for visual feedback only (physics uses the ref directly)
  const [activeKeys, setActiveKeys] = useState({
    up: false, down: false, left: false, right: false, a: false, b: false
  });

  const dpadRef = useRef<HTMLDivElement>(null);

  // --- Keyboard Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let updated = false;
      const key = e.key;

      // Check keys and update ref + visual state
      if (KEYS.UP.includes(key)) { inputState.current.up = true; setActiveKeys(p => ({...p, up: true})); updated = true; }
      if (KEYS.DOWN.includes(key)) { inputState.current.down = true; setActiveKeys(p => ({...p, down: true})); updated = true; }
      if (KEYS.LEFT.includes(key)) { inputState.current.left = true; setActiveKeys(p => ({...p, left: true})); updated = true; }
      if (KEYS.RIGHT.includes(key)) { inputState.current.right = true; setActiveKeys(p => ({...p, right: true})); updated = true; }
      if (KEYS.A.includes(key)) { inputState.current.a = true; setActiveKeys(p => ({...p, a: true})); updated = true; }
      if (KEYS.B.includes(key)) { inputState.current.b = true; setActiveKeys(p => ({...p, b: true})); updated = true; }

      // Prevent default browser actions (scrolling, etc.) for game keys
      if (updated) e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key;
      if (KEYS.UP.includes(key)) { inputState.current.up = false; setActiveKeys(p => ({...p, up: false})); }
      if (KEYS.DOWN.includes(key)) { inputState.current.down = false; setActiveKeys(p => ({...p, down: false})); }
      if (KEYS.LEFT.includes(key)) { inputState.current.left = false; setActiveKeys(p => ({...p, left: false})); }
      if (KEYS.RIGHT.includes(key)) { inputState.current.right = false; setActiveKeys(p => ({...p, right: false})); }
      if (KEYS.A.includes(key)) { inputState.current.a = false; setActiveKeys(p => ({...p, a: false})); }
      if (KEYS.B.includes(key)) { inputState.current.b = false; setActiveKeys(p => ({...p, b: false})); }
    };

    // Safety: Clear inputs if window loses focus (tab switch, alert, etc.)
    const handleBlur = () => {
      inputState.current = { up: false, down: false, left: false, right: false, a: false, b: false };
      setActiveKeys({ up: false, down: false, left: false, right: false, a: false, b: false });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [inputState]);

  // --- Touch / Pointer Handling ---

  // D-Pad Logic (Single touch zone for sliding)
  const handleDpadPointer = (e: React.PointerEvent) => {
    e.preventDefault();
    if (!dpadRef.current) return;

    // Calculate pointer position relative to D-Pad center
    const rect = dpadRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = e.clientX - centerX;
    const dy = e.clientY - centerY;

    // Deadzone prevents accidental inputs near center
    const deadzone = 15; 
    
    const newUp = dy < -deadzone;
    const newDown = dy > deadzone;
    const newLeft = dx < -deadzone;
    const newRight = dx > deadzone;

    // Allow diagonals by checking threshold independently
    inputState.current.up = newUp;
    inputState.current.down = newDown;
    inputState.current.left = newLeft;
    inputState.current.right = newRight;

    setActiveKeys(prev => ({ ...prev, up: newUp, down: newDown, left: newLeft, right: newRight }));
  };

  const handleDpadEnd = (e: React.PointerEvent) => {
    e.preventDefault();
    inputState.current.up = false;
    inputState.current.down = false;
    inputState.current.left = false;
    inputState.current.right = false;
    setActiveKeys(prev => ({ ...prev, up: false, down: false, left: false, right: false }));
  };

  // Action Button Logic
  const handleBtn = (key: 'a' | 'b', active: boolean) => (e: React.PointerEvent) => {
    e.preventDefault();
    // Capture pointer to ensure we catch the 'up' event even if finger slides off
    if (active) {
        (e.target as Element).setPointerCapture(e.pointerId);
    } else {
        try { (e.target as Element).releasePointerCapture(e.pointerId); } catch(err) {}
    }
    
    inputState.current[key] = active;
    setActiveKeys(prev => ({ ...prev, [key]: active }));
  };

  return (
    <div className="absolute bottom-8 w-full px-6 flex justify-between items-end z-50 pointer-events-none select-none">
      
      {/* D-Pad Zone - Single Container for Sliding */}
      <div 
        ref={dpadRef}
        className="w-48 h-48 relative pointer-events-auto touch-none"
        onPointerDown={handleDpadPointer}
        onPointerMove={(e) => { if (e.buttons === 1) handleDpadPointer(e); }}
        onPointerUp={handleDpadEnd}
        onPointerLeave={handleDpadEnd}
      >
         {/* Visual Background */}
         <div className="absolute inset-0 bg-white/5 rounded-full backdrop-blur-sm border border-white/10 shadow-xl"></div>
         
         {/* Directional Visuals */}
         {/* UP */}
         <div className={`absolute top-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-100 ${activeKeys.up ? 'bg-white/40 scale-95' : 'bg-white/10'}`}>
            <span className="rotate-0 text-white text-xl drop-shadow-md">▲</span>
         </div>
         {/* DOWN */}
         <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-100 ${activeKeys.down ? 'bg-white/40 scale-95' : 'bg-white/10'}`}>
            <span className="rotate-180 text-white text-xl drop-shadow-md">▲</span>
         </div>
         {/* LEFT */}
         <div className={`absolute left-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-100 ${activeKeys.left ? 'bg-white/40 scale-95' : 'bg-white/10'}`}>
             <span className="-rotate-90 text-white text-xl drop-shadow-md">▲</span>
         </div>
         {/* RIGHT */}
         <div className={`absolute right-2 top-1/2 -translate-y-1/2 w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-100 ${activeKeys.right ? 'bg-white/40 scale-95' : 'bg-white/10'}`}>
             <span className="rotate-90 text-white text-xl drop-shadow-md">▲</span>
         </div>

         {/* Center Decor */}
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/5 border border-white/10"></div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-6 mb-4 pointer-events-auto items-end touch-none">
        {/* B Button (Punch) */}
        <div className="flex flex-col items-center gap-2 group">
            <div 
                className={`w-20 h-20 rounded-full border-b-[6px] border-red-900 flex items-center justify-center text-white font-black text-2xl transition-all duration-75 shadow-lg
                ${activeKeys.b 
                    ? 'bg-red-600 border-b-0 translate-y-[6px] shadow-none scale-95' 
                    : 'bg-gradient-to-br from-red-500 to-red-600 hover:brightness-110'}`}
                onPointerDown={handleBtn('b', true)}
                onPointerUp={handleBtn('b', false)}
                onPointerLeave={handleBtn('b', false)}
            >
                B
            </div>
            <span className="text-white/50 font-bold text-xs tracking-wider group-active:text-red-400">PUNCH</span>
        </div>
        
        {/* A Button (Jump) */}
        <div className="flex flex-col items-center gap-2 -mt-12 group">
            <div 
                className={`w-24 h-24 rounded-full border-b-[6px] border-emerald-900 flex items-center justify-center text-white font-black text-3xl transition-all duration-75 shadow-lg
                ${activeKeys.a 
                    ? 'bg-emerald-600 border-b-0 translate-y-[6px] shadow-none scale-95' 
                    : 'bg-gradient-to-br from-emerald-400 to-emerald-600 hover:brightness-110'}`}
                onPointerDown={handleBtn('a', true)}
                onPointerUp={handleBtn('a', false)}
                onPointerLeave={handleBtn('a', false)}
            >
                A
            </div>
            <span className="text-white/50 font-bold text-xs tracking-wider group-active:text-emerald-400">JUMP</span>
        </div>
      </div>
    </div>
  );
};

export default Controls;