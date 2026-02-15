import React, { useState } from 'react';
import { ShieldCheck, Terminal, Users, Cpu } from 'lucide-react';

interface LandingPageProps {
  onLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isBooting, setIsBooting] = useState(false);

  const handleEnter = () => {
    setIsBooting(true);
    setTimeout(onLogin, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-green-500 font-mono flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(0,50,0,0.2)_0%,_black_80%)] z-0"></div>
      <div className="absolute inset-0 z-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>

      <div className="max-w-6xl w-full z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full lg:h-auto my-auto overflow-y-auto lg:overflow-visible py-8">
        
        {/* LEFT COLUMN: Project Identity */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-8 lg:border-r border-green-900/50 lg:pr-10">
            <div className="space-y-4">
                <div className="text-xs font-bold tracking-[0.4em] text-green-600 uppercase">BEEE Project // Group 3</div>
                <h1 className="text-6xl md:text-7xl font-black text-white tracking-tighter uppercase leading-[0.85] drop-shadow-[0_0_15px_rgba(0,255,0,0.3)]">
                  Safety<br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-green-700">Interlock</span><br/>
                  System
                </h1>
            </div>
            
            <p className="text-green-400/80 text-lg leading-relaxed border-l-4 border-green-500 pl-6 py-2 bg-green-900/10 backdrop-blur-sm">
              A logic-controlled robotic exoskeleton simulation designed to prevent mechanical failure through real-time safety constraints.
            </p>

            <button 
              onClick={handleEnter}
              disabled={isBooting}
              className={`
                group relative overflow-hidden bg-green-500 text-black font-bold uppercase tracking-widest px-8 py-6 text-xl shadow-[0_0_20px_rgba(0,255,0,0.3)]
                transition-all hover:bg-white hover:shadow-[0_0_50px_rgba(0,255,0,0.6)] hover:scale-[1.02]
                disabled:opacity-50 disabled:cursor-wait w-full lg:w-auto text-center clip-path-slant
              `}
            >
              <div className="relative z-10 flex items-center justify-center gap-3">
                {isBooting ? <Cpu className="animate-spin" /> : <Terminal />}
                {isBooting ? 'System Initializing...' : 'Initialize Simulation'}
              </div>
            </button>
        </div>

        {/* RIGHT COLUMN: Roster & Logic */}
        <div className="lg:col-span-7 flex flex-col gap-8 justify-center">
            
            {/* TEAM ROSTER - Leaderboard Style */}
            <div className="w-full space-y-4">
                <div className="text-center mb-6">
                    <h3 className="text-4xl font-black uppercase tracking-[0.2em] text-green-500 drop-shadow-[0_0_10px_rgba(0,255,0,0.6)]">
                        Team Roster
                    </h3>
                    <div className="text-green-700 font-bold tracking-[0.5em] text-xs mt-2 uppercase">Group 03 Ranking</div>
                </div>

                <div className="flex flex-col gap-3">
                    {[
                        { id: 'A472', name: 'TIWARY ASHIT' },
                        { id: 'A480', name: 'KAMATH UNNATTI' },
                        { id: 'A463', name: 'PYATI SHASHANK' },
                        { id: 'A484', name: 'PAVAGADHI HRUTV' }
                    ].map((member, index) => (
                        <div 
                            key={member.id} 
                            className="group relative flex items-center justify-between px-6 py-4 bg-black/80 border-2 border-green-600/30 hover:bg-green-500 hover:border-green-400 transition-all duration-200 shadow-lg hover:shadow-[0_0_25px_rgba(0,255,0,0.5)] cursor-default"
                        >
                            <div className="flex items-center gap-6 z-10">
                                {/* Rank */}
                                <span className="font-mono text-3xl font-black text-green-600 group-hover:text-black w-8 text-center italic">
                                    {index + 1}
                                </span>
                                
                                {/* Icon */}
                                <div className="bg-green-900/50 p-2 rounded-full group-hover:bg-black/20 transition-colors border border-green-500/30 group-hover:border-black/30">
                                    <Users size={22} className="text-green-400 group-hover:text-black" />
                                </div>

                                {/* Name */}
                                <span className="text-xl md:text-2xl font-bold uppercase tracking-wider text-green-100 group-hover:text-black drop-shadow-sm">
                                    {member.name}
                                </span>
                            </div>

                            {/* ID */}
                            <span className="font-mono text-lg md:text-xl font-bold text-green-500 group-hover:text-black z-10 opacity-80">
                                {member.id}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Solution Logic Card - Expanded Size */}
            <div className="bg-black/60 border-t border-green-500/30 backdrop-blur-md pt-8 pb-4 flex flex-col justify-center">
                 <div className="flex items-center gap-4 mb-6 opacity-90 pl-2">
                    <ShieldCheck size={32} className="text-green-400" />
                    <h3 className="text-green-400 font-bold uppercase tracking-widest text-2xl">Solution Logic</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-red-900/10 border-l-4 border-red-500 p-5 hover:bg-red-900/20 transition-colors">
                        <div className="text-red-500 font-bold text-sm uppercase tracking-wider mb-2">Issue</div>
                        <p className="text-base text-gray-300 leading-snug">
                           Prevent mechanical clipping and unsafe angles.
                        </p>
                    </div>
                    <div className="bg-cyan-900/10 border-l-4 border-cyan-500 p-5 hover:bg-cyan-900/20 transition-colors">
                        <div className="text-cyan-400 font-bold text-sm uppercase tracking-wider mb-2">Logic</div>
                        <p className="text-base text-gray-300 leading-snug">
                           Compare <strong>Angle</strong> vs <strong>Threshold</strong>.
                        </p>
                    </div>
                    <div className="bg-green-900/10 border-l-4 border-green-500 p-5 hover:bg-green-900/20 transition-colors">
                        <div className="text-green-400 font-bold text-sm uppercase tracking-wider mb-2">Action</div>
                        <p className="text-base text-gray-300 leading-snug">
                           Trigger <strong>Critical Failure</strong> lock if unsafe.
                        </p>
                    </div>
                 </div>
            </div>

        </div>
      </div>
    </div>
  );
};
