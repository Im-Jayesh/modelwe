import Link from "next/link";

export default function ExploreComingSoon() {
  return (
    <div className="min-h-screen bg-[#1E1E1C] text-[#F2F2EE] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 text-center max-w-2xl">
        <p className="text-xs uppercase tracking-[0.4em] opacity-60 mb-6 font-semibold text-pink-400">Phase II</p>
        <h1 className="text-5xl md:text-7xl font-serif tracking-tight mb-8 leading-tight">
          The Network <br />
          <span className="italic opacity-80">is expanding.</span>
        </h1>
        <p className="text-sm md:text-base opacity-70 leading-relaxed max-w-md mx-auto mb-12">
          We are currently building the industry's most advanced discovery engine. Soon, you will be able to explore trending models, agencies, and creative directors globally.
        </p>
        
        <Link 
          href="/dashboard"
          className="inline-block px-8 py-4 bg-[#F2F2EE] text-[#1E1E1C] text-xs uppercase tracking-widest font-bold rounded-full hover:bg-white hover:scale-105 transition-all"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}