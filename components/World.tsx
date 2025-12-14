import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Entity, Player, Enemy, Particle, GameStatus, Vector3 } from '../types';
import * as Constants from '../constants';
import { generateEnemyFlavor } from '../services/gemini';

interface WorldProps {
  status: GameStatus;
  onGameOver: (score: number) => void;
  onScoreUpdate: (score: number) => void;
  inputState: React.MutableRefObject<{
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    a: boolean; // Jump
    b: boolean; // Punch
  }>;
}

// --- 3D Cube Helper Component ---
interface CubeProps {
  position: Vector3;
  size: Vector3; // x=width, y=depth, z=height
  colorClass: string; // Tailwind color base e.g. "bg-red"
  rotate?: Vector3;
  origin?: string;
  faceContent?: { [key: string]: React.ReactNode }; // Content for specific faces
}

const Cube: React.FC<CubeProps> = ({ position, size, colorClass, rotate = {x:0,y:0,z:0}, origin = 'center', faceContent }) => {
  const { x, y, z } = position;
  const { x: w, y: d, z: h } = size;
  
  // Shading helper: map base color to brightness levels
  const getColor = (shade: number) => {
    // Handle mapped colors to ensure they exist in Tailwind
    // The safelist in World component ensures these classes are generated
    if (colorClass.startsWith('bg-')) return `${colorClass}-${shade}`;
    return colorClass; 
  };

  return (
    <div
      className="absolute transform-style-3d"
      style={{
        transformStyle: 'preserve-3d', // Force 3D rendering inline
        width: 0, height: 0, // Container is a point
        transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) rotateZ(${rotate.z}deg)`,
      }}
    >
       {/* Cube Wrapper: Shifted so (0,0,0) of container is the Center-Bottom of the cube */}
       <div className="absolute transform-style-3d" style={{ transformStyle: 'preserve-3d' }}>
          
          {/* Top Face (Z = h) */}
          <div className={`absolute ${getColor(400)}`} style={{ 
              width: w, height: d, 
              transform: `translate3d(${-w/2}px, ${-d/2}px, ${h}px)`,
              filter: 'brightness(1.1)' 
          }}>
             {faceContent?.top}
          </div>

          {/* Bottom Face (Z = 0) */}
          <div className={`absolute ${getColor(900)}`} style={{ 
              width: w, height: d, 
              transform: `translate3d(${-w/2}px, ${-d/2}px, 0) rotateX(180deg)`,
              filter: 'brightness(0.5)'
          }} />

          {/* Front Face (Y = d/2) */}
          <div className={`absolute ${getColor(600)}`} style={{ 
              width: w, height: h, 
              transformOrigin: 'bottom center',
              transform: `translate3d(${-w/2}px, ${d/2}px, 0) rotateX(-90deg)`,
              filter: 'brightness(0.9)'
          }}>
             {faceContent?.front}
          </div>

          {/* Back Face (Y = -d/2) */}
          <div className={`absolute ${getColor(700)}`} style={{ 
              width: w, height: h, 
              transformOrigin: 'bottom center',
              transform: `translate3d(${-w/2}px, ${-d/2}px, 0) rotateX(90deg) rotateY(180deg)`,
              filter: 'brightness(0.8)'
          }} />

          {/* Right Face (X = w/2) */}
          <div className={`absolute ${getColor(500)}`} style={{ 
              transformOrigin: 'bottom center',
              // Right Face is in YZ plane.
              transform: `translate3d(${w/2}px, 0px, ${h/2}px) rotateY(90deg)`,
              width: d, height: h,
              marginTop: -h/2, marginLeft: -d/2, // Center the face on the pivot
              filter: 'brightness(0.7)'
          }}>
              {faceContent?.right}
          </div>

          {/* Left Face (X = -w/2) */}
           <div className={`absolute ${getColor(500)}`} style={{ 
              width: d, height: h, 
              transform: `translate3d(${-w/2}px, 0px, ${h/2}px) rotateY(-90deg)`,
              marginTop: -h/2, marginLeft: -d/2,
              filter: 'brightness(0.7)'
           }}>
              {faceContent?.left}
           </div>
       </div>
    </div>
  );
};

// --- Reusable Red Hat Model ---
const RedHat: React.FC = () => (
    <div className="transform-style-3d">
         {/* Main Dome */}
         <Cube position={{x: 0, y: 0, z: 0}} size={{x: 22, y: 20, z: 10}} colorClass="bg-red" />
         {/* Top Button */}
         <Cube position={{x: 0, y: 0, z: 10}} size={{x: 4, y: 4, z: 2}} colorClass="bg-red" />
         {/* Brim */}
         <Cube position={{x: 0, y: 10, z: 0}} size={{x: 22, y: 12, z: 2}} colorClass="bg-red" rotate={{x: 10, y: 0, z: 0}} />
    </div>
);

const World: React.FC<WorldProps> = ({ status, onGameOver, onScoreUpdate, inputState }) => {
  // --- Refs for Game Logic ---
  const playerRef = useRef<Player>({
    id: 'player',
    pos: { x: 0, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    width: 40,
    height: 40,
    color: 'bg-blue',
    isDead: false,
    type: 'player',
    hp: 3,
    maxHp: 3,
    isGrounded: true,
    isPunching: false,
    punchCooldown: 0,
    invincibleTime: 0,
    facingRight: true,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const shakeRef = useRef<number>(0);
  
  const [, setTick] = useState(0);

  const spawnEnemy = useCallback(async () => {
    const flavor = await generateEnemyFlavor();
    const edge = Math.floor(Math.random() * 4);
    let startX = 0, startY = 0;
    const padding = 100;

    switch(edge) {
        case 0: startX = (Math.random() - 0.5) * Constants.WORLD_WIDTH; startY = -Constants.WORLD_HEIGHT/2 - padding; break;
        case 1: startX = Constants.WORLD_WIDTH/2 + padding; startY = (Math.random() - 0.5) * Constants.WORLD_HEIGHT; break;
        case 2: startX = (Math.random() - 0.5) * Constants.WORLD_WIDTH; startY = Constants.WORLD_HEIGHT/2 + padding; break;
        case 3: startX = -Constants.WORLD_WIDTH/2 - padding; startY = (Math.random() - 0.5) * Constants.WORLD_HEIGHT; break;
    }

    const shapes: ('box' | 'blob' | 'spiky')[] = ['box', 'blob', 'spiky'];
    // Dark side colors
    const colors = ['bg-slate', 'bg-zinc', 'bg-neutral', 'bg-gray'];

    const newEnemy: Enemy = {
      id: `enemy-${Date.now()}-${Math.random()}`,
      pos: { x: startX, y: startY, z: 0 },
      vel: { x: 0, y: 0, z: 0 },
      width: 40, 
      height: 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      isDead: false,
      type: 'enemy',
      speed: 2.5 + Math.random() * 1.5, // Slightly faster aggressive enemies
      aggroRange: 1200,
      attackCooldown: 0,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      flavorText: flavor.name
    };

    enemiesRef.current.push(newEnemy);
  }, []);

  const createExplosion = (x: number, y: number, z: number, colorBase: string) => {
    let tailwindColor = 'bg-white';
    // Dark explosions for dark enemies
    if (colorBase.includes('slate') || colorBase.includes('gray') || colorBase.includes('zinc')) {
        tailwindColor = 'bg-red-500'; // Blood/Dark energy effect
    }

    for (let i = 0; i < 12; i++) {
      particlesRef.current.push({
        id: `p-${Date.now()}-${i}`,
        pos: { x, y, z: z + 20 },
        vel: { 
          x: (Math.random() - 0.5) * 15, 
          y: (Math.random() - 0.5) * 15, 
          z: 5 + Math.random() * 12 
        },
        life: 20 + Math.random() * 20,
        color: tailwindColor,
        size: 6 + Math.random() * 10
      });
    }
  };

  const checkCollision = (a: Vector3, b: Vector3, radA: number, radB: number) => {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = Math.abs(a.z - b.z);
    const dist = Math.sqrt(dx*dx + dy*dy);
    return dist < (radA + radB) && dz < 50; 
  };

  const update = useCallback(() => {
    if (status !== GameStatus.PLAYING) return;

    const player = playerRef.current;
    const inputs = inputState.current;

    if (inputs.right) { player.vel.x += 1; player.facingRight = true; }
    if (inputs.left) { player.vel.x -= 1; player.facingRight = false; }
    if (inputs.down) player.vel.y += 1;
    if (inputs.up) player.vel.y -= 1;

    player.vel.x *= Constants.FRICTION;
    player.vel.y *= Constants.FRICTION;

    const speed = Math.sqrt(player.vel.x**2 + player.vel.y**2);
    if (speed > Constants.PLAYER_SPEED) {
        const ratio = Constants.PLAYER_SPEED / speed;
        player.vel.x *= ratio;
        player.vel.y *= ratio;
    }

    player.pos.x += player.vel.x;
    player.pos.y += player.vel.y;

    const limitX = Constants.WORLD_WIDTH / 2 - player.width;
    const limitY = Constants.WORLD_HEIGHT / 2 - player.height;
    player.pos.x = Math.max(-limitX, Math.min(limitX, player.pos.x));
    player.pos.y = Math.max(-limitY, Math.min(limitY, player.pos.y));

    if (inputs.a && player.isGrounded) {
        player.vel.z = Constants.PLAYER_JUMP_FORCE;
        player.isGrounded = false;
    }

    player.vel.z -= Constants.GRAVITY;
    player.pos.z += player.vel.z;

    if (player.pos.z <= Constants.GROUND_LEVEL) {
        player.pos.z = Constants.GROUND_LEVEL;
        player.vel.z = 0;
        player.isGrounded = true;
    }

    if (player.punchCooldown > 0) player.punchCooldown--;
    if (inputs.b && player.punchCooldown === 0 && !player.isPunching) {
        player.isPunching = true;
        shakeRef.current = 5; // Slight shake on swing
        setTimeout(() => {
             playerRef.current.isPunching = false;
             playerRef.current.punchCooldown = Constants.PUNCH_COOLDOWN;
        }, Constants.PUNCH_DURATION * 16);
    }

    if (player.invincibleTime > 0) player.invincibleTime--;

    enemiesRef.current.forEach(enemy => {
        if (enemy.isDead) return;

        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        if (dist < enemy.aggroRange && dist > 10) {
            enemy.vel.x = (dx / dist) * enemy.speed;
            enemy.vel.y = (dy / dist) * enemy.speed;
        }

        enemy.pos.x += enemy.vel.x;
        enemy.pos.y += enemy.vel.y;

        if (checkCollision(player.pos, enemy.pos, 30, 30)) {
            if (player.isPunching) {
                // Check if enemy is in front of player
                const enemyDirX = enemy.pos.x - player.pos.x;
                const facingBonus = (player.facingRight && enemyDirX > -20) || (!player.facingRight && enemyDirX < 20);
                
                // Slightly larger range for hat swing
                if (facingBonus && dist < Constants.PUNCH_RANGE + 20) {
                    enemy.isDead = true;
                    createExplosion(enemy.pos.x, enemy.pos.y, enemy.pos.z, enemy.color);
                    scoreRef.current += 100;
                    shakeRef.current = 15;
                    onScoreUpdate(scoreRef.current);
                }
            } else if (player.invincibleTime <= 0) {
                player.hp--;
                player.invincibleTime = 60;
                player.vel.z = 10;
                shakeRef.current = 15;
                const knockbackDir = Math.atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
                player.vel.x = Math.cos(knockbackDir) * 15;
                player.vel.y = Math.sin(knockbackDir) * 15;
                
                if (player.hp <= 0) {
                    onGameOver(scoreRef.current);
                }
            }
        }
    });

    enemiesRef.current = enemiesRef.current.filter(e => !e.isDead);

    if (frameRef.current % Constants.ENEMY_SPAWN_RATE === 0 && enemiesRef.current.length < Constants.MAX_ENEMIES) {
        spawnEnemy();
    }

    particlesRef.current.forEach(p => {
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        p.pos.z += p.vel.z;
        p.vel.z -= Constants.GRAVITY;
        if (p.pos.z < 0) {
          p.pos.z = 0;
          p.vel.z *= -0.5; 
          p.vel.x *= 0.8;
          p.vel.y *= 0.8;
        }
        p.life--;
    });
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    if (shakeRef.current > 0) {
        shakeRef.current *= 0.85;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    frameRef.current++;
    setTick(prev => prev + 1);
  }, [status, onGameOver, onScoreUpdate, inputState, spawnEnemy]);

  useEffect(() => {
    let animationFrameId: number;
    const loop = () => {
        update();
        animationFrameId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animationFrameId);
  }, [update]);

  const shakeX = (Math.random() - 0.5) * shakeRef.current;
  const shakeY = (Math.random() - 0.5) * shakeRef.current;
  const camX = (-playerRef.current.pos.x * 0.9) + shakeX; 
  const camY = (-playerRef.current.pos.y * 0.9) + shakeY;

  return (
    <div className="w-full h-full bg-slate-900 flex items-center justify-center overflow-hidden relative">
        
        {/* Hidden Safelist to ensure Tailwind Generates these color classes */}
        <div className="hidden">
            {/* Basic colors */}
            <div className="bg-blue-400 bg-blue-500 bg-blue-600 bg-blue-700 bg-blue-900"></div>
            <div className="bg-red-400 bg-red-500 bg-red-600 bg-red-700 bg-red-900"></div>
            <div className="bg-orange-200 bg-orange-300 bg-orange-400 bg-orange-500 bg-orange-600 bg-orange-700 bg-orange-900"></div>
            <div className="bg-yellow-400 bg-yellow-500 bg-yellow-600 bg-yellow-700 bg-yellow-900"></div>
            
            {/* Dark Side Enemy Colors */}
            <div className="bg-slate-400 bg-slate-500 bg-slate-600 bg-slate-700 bg-slate-800 bg-slate-900"></div>
            <div className="bg-zinc-400 bg-zinc-500 bg-zinc-600 bg-zinc-700 bg-zinc-900"></div>
            <div className="bg-neutral-400 bg-neutral-500 bg-neutral-600 bg-neutral-700 bg-neutral-900"></div>
            <div className="bg-gray-400 bg-gray-500 bg-gray-600 bg-gray-700 bg-gray-900"></div>
        </div>

        <div className="scene-container w-full h-full relative bg-gradient-to-b from-[#050505] via-[#1a1025] to-[#050505]">
            
            <div 
                className="world-plane absolute top-1/2 left-1/2 w-0 h-0 transition-transform duration-75 ease-linear transform-style-3d"
                style={{
                    transformStyle: 'preserve-3d',
                    transform: `scale(0.8) rotateX(55deg) rotateZ(0deg) translateX(${camX}px) translateY(${camY}px)`
                }}
            >
                {/* Floor Grid */}
                <div 
                    className="absolute rounded-3xl shadow-[0_0_150px_rgba(220,38,38,0.2)] transform-style-3d"
                    style={{
                        width: Constants.WORLD_WIDTH,
                        height: Constants.WORLD_HEIGHT,
                        transform: `translate(-50%, -50%)`,
                        background: 'linear-gradient(180deg, #0a0a0a 0%, #171717 100%)',
                        border: '2px solid #333'
                    }}
                >
                    <div className="w-full h-full opacity-10" style={{
                        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)`,
                        backgroundSize: '100px 100px'
                    }}></div>
                </div>

                {/* Player Model - HUMAN BOY WITH RED HAT */}
                <div 
                    className="absolute transition-transform duration-75 transform-style-3d"
                    style={{
                        transformStyle: 'preserve-3d',
                        transform: `translate3d(${playerRef.current.pos.x}px, ${playerRef.current.pos.y}px, 0)`,
                        zIndex: 1000
                    }}
                >
                    <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-black/50 blur-md rounded-full" />

                     {playerRef.current.isPunching && (
                        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-56 h-56 rounded-full bg-red-500/20 blur-xl" style={{ transform: 'translateZ(10px)'}}></div>
                    )}

                    <div className={`transform-style-3d transition-transform duration-150 ${playerRef.current.invincibleTime > 0 && frameRef.current % 6 < 3 ? 'opacity-40' : 'opacity-100'}`}
                         style={{ transformStyle: 'preserve-3d', transform: `rotateZ(${playerRef.current.facingRight ? 0 : 180}deg) translateZ(${playerRef.current.pos.z}px)` }}
                    >
                        {/* Legs (Pants - Dark Slate) */}
                        <Cube position={{x: -5, y: 0, z: 0}} size={{x: 8, y: 10, z: 24}} colorClass="bg-slate" />
                        <Cube position={{x: 5, y: 0, z: 0}} size={{x: 8, y: 10, z: 24}} colorClass="bg-slate" />
                        {/* Shoes (Red) */}
                        <Cube position={{x: -5, y: 1, z: 0}} size={{x: 9, y: 12, z: 6}} colorClass="bg-red" />
                        <Cube position={{x: 5, y: 1, z: 0}} size={{x: 9, y: 12, z: 6}} colorClass="bg-red" />

                        {/* Torso (Blue Hoodie) */}
                        <Cube position={{x: 0, y: 0, z: 24}} size={{x: 20, y: 14, z: 20}} colorClass="bg-blue" />
                        
                        {/* Head (Skin Tone) */}
                        <Cube 
                            position={{x: 0, y: 0, z: 44}} 
                            size={{x: 18, y: 18, z: 18}} 
                            colorClass="bg-orange" // orange-200/300 via safelist map
                            faceContent={{
                                right: (
                                    // Face on the side (since rotation handles direction)
                                    <div className="w-full h-full flex items-center justify-end gap-1 pr-1 pb-2">
                                        <div className="w-2 h-4 bg-black rounded-full"></div>
                                        <div className="w-2 h-4 bg-black rounded-full"></div>
                                    </div>
                                )
                            }}
                        />

                        {/* Hair (Black/Dark Brown) visible under hat */}
                        <Cube position={{x: -10, y: 0, z: 50}} size={{x: 2, y: 16, z: 8}} colorClass="bg-gray" />
                        <Cube position={{x: 10, y: 0, z: 50}} size={{x: 2, y: 16, z: 8}} colorClass="bg-gray" />
                        <Cube position={{x: 0, y: -10, z: 48}} size={{x: 20, y: 2, z: 8}} colorClass="bg-gray" />

                        {/* THE RED HAT */}
                        {/* If not punching, it's on the head. If punching, it's gone (swung) */}
                        {!playerRef.current.isPunching && (
                            <div className="transform-style-3d" style={{ transform: 'translate3d(0, 0, 56px) rotateZ(-10deg)' }}>
                                <RedHat />
                            </div>
                        )}

                        {/* Arms (Skin + Sleeves) */}
                        {/* Left Arm (Inactive mostly) */}
                        <div className="transform-style-3d" style={{ transform: 'translate3d(0, -10, 38px) rotateX(-10deg)' }}>
                             <Cube position={{x: 0, y: 0, z: -8}} size={{x: 6, y: 6, z: 16}} colorClass="bg-blue" />
                             <Cube position={{x: 0, y: 0, z: -18}} size={{x: 6, y: 6, z: 6}} colorClass="bg-orange" />
                        </div>

                        {/* Right Arm (Active for attack) */}
                        <div className="transform-style-3d transition-all duration-100" style={{ 
                            transformStyle: 'preserve-3d',
                            transform: playerRef.current.isPunching 
                                ? 'translate3d(0, 10, 38px) rotateX(-80deg)' // Raised for swing
                                : 'translate3d(0, 10, 38px) rotateX(10deg)' // Idle
                        }}>
                             <Cube position={{x: 0, y: 0, z: -8}} size={{x: 6, y: 6, z: 16}} colorClass="bg-blue" />
                             <Cube position={{x: 0, y: 0, z: -18}} size={{x: 6, y: 6, z: 6}} colorClass="bg-orange" />
                             
                             {/* THE HAT WEAPON */}
                             {playerRef.current.isPunching && (
                                 <div className="transform-style-3d animate-spin" style={{ 
                                     transform: `translate3d(0, 0, -30px) scale(1.5) rotateY(${frameRef.current * 30}deg)`,
                                     transformOrigin: 'center'
                                 }}>
                                     <RedHat />
                                     {/* Swing Trail */}
                                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-2 bg-white/50 blur-md transform rotate-90"></div>
                                 </div>
                             )}
                        </div>

                    </div>
                </div>

                {/* Enemies - DARK SIDE STYLE */}
                {enemiesRef.current.map(enemy => (
                    <div
                        key={enemy.id}
                        className="absolute transform-style-3d transition-transform duration-75"
                        style={{
                            transformStyle: 'preserve-3d',
                            transform: `translate3d(${enemy.pos.x}px, ${enemy.pos.y}px, 0)`,
                        }}
                    >
                        {/* Dark Aura Shadow */}
                        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-red-900/30 blur-lg rounded-full animate-pulse" />
                        
                        <div className="transform-style-3d animate-bounce" style={{ transformStyle: 'preserve-3d', animationDuration: `${2000/enemy.speed}ms` }}>
                            {/* Main Body - Dark Cube */}
                            <Cube 
                                position={{x: 0, y: 0, z: 0}}
                                size={{x: 36, y: 36, z: 36}}
                                colorClass={enemy.color}
                                faceContent={{
                                    front: (
                                        // Glowing Red Evil Face
                                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-black/20">
                                            {/* Glowing Visor or Eyes */}
                                            <div className="flex gap-4">
                                                <div className="w-6 h-2 bg-red-500 shadow-[0_0_10px_#ef4444] rounded-sm animate-pulse"></div>
                                                <div className="w-6 h-2 bg-red-500 shadow-[0_0_10px_#ef4444] rounded-sm animate-pulse"></div>
                                            </div>
                                            {/* Jagged Mouth */}
                                            <div className="w-16 h-1 bg-red-900/50 mt-2"></div>
                                        </div>
                                    )
                                }}
                            />
                            
                            {/* Horns / Spikes */}
                            <Cube position={{x: -12, y: 0, z: 34}} size={{x: 8, y: 8, z: 12}} colorClass={enemy.color} />
                            <Cube position={{x: 12, y: 0, z: 34}} size={{x: 8, y: 8, z: 12}} colorClass={enemy.color} />

                            <div 
                                className="absolute -top-24 left-1/2 -translate-x-1/2 whitespace-nowrap bg-black/80 text-red-500 text-[10px] px-2 py-0.5 rounded-sm backdrop-blur-sm border border-red-900/50 tracking-widest uppercase font-bold"
                                style={{ transform: 'rotateX(-55deg)' }}
                            >
                                {enemy.flavorText || "SHADOW"}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Particles - darker theme usually, handled in explosion logic */}
                {particlesRef.current.map(p => (
                    <div
                        key={p.id}
                        className={`absolute rounded-full ${p.color}`}
                        style={{
                            width: p.size,
                            height: p.size,
                            transform: `translate3d(${p.pos.x}px, ${p.pos.y}px, ${p.pos.z}px)`,
                            opacity: p.life / 20,
                            boxShadow: '0 0 10px currentColor'
                        }}
                    />
                ))}

            </div>
            
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
                 <div className="flex gap-2">
                     {[...Array(playerRef.current.maxHp)].map((_, i) => (
                         <div key={i} className={`w-10 h-10 transition-all duration-300 ${i < playerRef.current.hp ? 'scale-100 opacity-100' : 'scale-75 opacity-30 grayscale'}`}>
                             ❤️
                         </div>
                     ))}
                 </div>
                 
                 <div className="flex flex-col items-end">
                     <div className="text-4xl font-black text-white drop-shadow-lg italic tracking-wider">
                         {scoreRef.current.toString().padStart(6, '0')}
                     </div>
                     <div className="text-red-500 font-bold text-sm tracking-widest uppercase">Score</div>
                 </div>
            </div>

        </div>
    </div>
  );
};

export default World;