import React, { useState, useRef } from 'react';
import World from './components/World';
import Controls from './components/Controls';
import { GameStatus } from './types';

const App: React.FC = () => {
  const [gameStatus, setGameStatus] = useState<GameStatus>(GameStatus.MENU);
  const [finalScore, setFinalScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const inputState = useRef({
    up: false,
    down: false,
    left: false,
    right: false,
    a: false,
    b: false
  });

  const handleStart = () => {
    setFinalScore(0);
    setGameStatus(GameStatus.PLAYING);
  };

  const handleGameOver = (score: number) => {
    setFinalScore(score);
    if (score > highScore) setHighScore(score);
    setGameStatus(GameStatus.GAME_OVER);
  };

  return (
    <div className="w-screen h-screen bg-[#111] text-white relative overflow-hidden font-sans select-none">
      
      {/* Game Layer */}
      {(gameStatus === GameStatus.PLAYING || gameStatus === GameStatus.GAME_OVER) && (
        <World 
          status={gameStatus} 
          onGameOver={handleGameOver} 
          onScoreUpdate={() => {}} 
          inputState={inputState} 
        />
      )}

      {/* Controls */}
      {gameStatus === GameStatus.PLAYING && (
        <Controls inputState={inputState} />
      )}

      {/* Main Menu */}
      {gameStatus === GameStatus.MENU && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
          {/* Background Animation */}
          <div className="absolute inset-0 overflow-hidden">
             <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-[#111] to-[#111] animate-pulse"></div>
          </div>

          <div className="relative z-10 p-10 flex flex-col items-center">
            <div className="mb-10 transform hover:scale-105 transition-transform duration-700 cursor-default">
                <div className="text-8xl mb-4 drop-shadow-[0_0_25px_rgba(255,0,0,0.5)] animate-bounce">🧢</div>
                <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-gray-200 to-gray-500 drop-shadow-2xl tracking-tighter leading-tight text-center">
                  RED HAT<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">RUSH</span> 3D
                </h1>
            </div>
            
            <div className="flex flex-col gap-4 w-full max-w-xs">
                <button 
                  onClick={handleStart}
                  className="group relative w-full py-4 px-8 bg-white text-black rounded-full font-black text-xl tracking-wide hover:scale-105 active:scale-95 transition-all duration-300 shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] overflow-hidden"
                >
                  <span className="relative z-10">START GAME</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-200 to-transparent opacity-0 group-hover:opacity-50 -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
            </div>

            <div className="mt-12 text-white/40 text-sm font-bold tracking-widest uppercase flex gap-8">
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center mb-2">⌨️</div>
                    <span>WASD / Arrows</span>
                </div>
                <div className="flex flex-col items-center">
                    <div className="w-10 h-10 rounded-lg border border-white/20 flex items-center justify-center mb-2">⚡</div>
                    <span>Space (Jump) / Enter (Punch)</span>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameStatus === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-lg animate-[fadeIn_0.5s_ease-out]">
           <div className="relative p-10 rounded-[2rem] bg-gradient-to-b from-gray-900 to-black border border-white/10 shadow-2xl text-center max-w-md w-full mx-4 overflow-hidden">
              {/* Glow effect */}
              <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-500/20 rounded-full blur-3xl"></div>
              
              <h2 className="relative text-5xl font-black text-white mb-2 tracking-tighter italic">GAME OVER</h2>
              <div className="text-sm text-gray-500 uppercase tracking-[0.2em] mb-8">Don't give up!</div>
              
              <div className="flex justify-center items-end gap-2 mb-8">
                 <div className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-amber-600 tabular-nums">
                    {finalScore}
                 </div>
                 <div className="text-xl text-yellow-600 font-bold mb-2">PTS</div>
              </div>

              {highScore > 0 && (
                  <div className="bg-white/5 rounded-full py-1 px-4 inline-block mb-8 border border-white/5">
                      <span className="text-xs text-gray-400 uppercase font-bold mr-2">Best</span>
                      <span className="text-white font-bold">{highScore}</span>
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setGameStatus(GameStatus.MENU)}
                  className="py-4 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  MENU
                </button>
                <button 
                  onClick={handleStart}
                  className="py-4 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl font-bold text-white shadow-lg hover:shadow-red-900/50 hover:scale-105 active:scale-95 transition-all"
                >
                  RETRY
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;