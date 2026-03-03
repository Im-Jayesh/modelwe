"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";

export default function LandingPage() {
  const scrollRef = useRef(null);

  // Parallax Effect for the "VOGUE" text
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      if (scrollRef.current) {
        scrollRef.current.style.transform = `translateY(${scrolled * 0.3}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#F2F2EE] text-[#1E1E1C] overflow-x-hidden">
      
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex items-center justify-center pt-20">
        {/* Background Typography */}
        <div 
          ref={scrollRef}
          className="absolute inset-0 flex items-center justify-center z-0 select-none pointer-events-none"
        >
          <h1 className="text-[25vw] font-serif leading-none tracking-tighter opacity-[0.03] uppercase">
            ModelWE
          </h1>
        </div>

        <div className="container mx-auto px-6 relative z-10 grid grid-cols-1 lg:grid-cols-2 items-center gap-12">
          {/* Text Content */}
          <div className="order-2 lg:order-1">
            <p className="text-xs uppercase tracking-[0.5em] font-bold mb-6 opacity-60">
              The Digital Composite Card Evolution
            </p>
            <h2 className="text-6xl md:text-8xl font-serif leading-[0.9] mb-8">
              Your Career, <br />
              <span className="italic">Redefined.</span>
            </h2>
            <p className="text-lg md:text-xl opacity-80 max-w-md leading-relaxed mb-10 font-light">
              A high-end platform built for professional models. Seamlessly blend editorial portfolio design with social networking power.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/signup" 
                className="px-10 py-5 bg-[#1E1E1C] text-[#F2F2EE] text-sm uppercase tracking-widest font-bold rounded-full hover:bg-neutral-800 transition-all text-center shadow-xl hover:scale-105"
              >
                Create Your Z-Card
              </Link>
              <Link 
                href="/explore" 
                className="px-10 py-5 border border-black/20 text-sm uppercase tracking-widest font-bold rounded-full hover:bg-black/5 transition-all text-center"
              >
                Explore Talent
              </Link>
            </div>
          </div>

          {/* Hero Image Mockup */}
          <div className="order-1 lg:order-2 relative flex justify-center">
            <div className="relative w-[300px] h-[450px] md:w-[450px] md:h-[600px] group">
              {/* Decorative Border */}
              <div className="absolute -inset-4 border border-black/5 rounded-2xl -rotate-3 group-hover:rotate-0 transition-transform duration-700"></div>
              
              {/* The "Vogue" Hero Example */}
              <div className="relative w-full h-full overflow-hidden rounded-xl shadow-2xl">
                <Image 
                  src="/hero-sample.png" // Replace with your stunning model shot
                  alt="Model Portfolio Example"
                  fill
                  className="object-cover"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col justify-end p-8 text-white">
                  <p className="text-xs uppercase tracking-widest mb-1">New Face</p>
                  <h3 className="text-3xl font-serif italic">The Butterfly Effect</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURE: AI BACKGROUND REMOVAL --- */}
      <section className="py-32 bg-white">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
          <div className="relative aspect-[4/5] bg-neutral-100 rounded-3xl overflow-hidden group">
            {/* Split Screen AI Comparison */}
            <Image src="/raw-photo.png" alt="Raw" fill className="object-cover group-hover:opacity-0 transition-opacity duration-700" />
            <Image src="/removed-bg.png" alt="Clean" fill className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur px-4 py-2 rounded-full text-[10px] uppercase tracking-tighter font-bold shadow-sm">
              In-Browser AI Background Removal
            </div>
          </div>

          <div>
            <h3 className="text-4xl md:text-5xl font-serif mb-6">Built-in Studio <br /> <span className="italic">Intelligence</span></h3>
            <p className="text-lg opacity-70 leading-relaxed mb-8">
              Don&apos;t wait for a retoucher. Our integrated AI strips backgrounds instantly, creating high-impact, editorial "cut-out" looks for your hero section in seconds.
            </p>
            <ul className="space-y-4">
              {['One-click Background Removal', 'High-Res Cloudinary Storage', 'Custom Layout Theming'].map((feat) => (
                <li key={feat} className="flex items-center gap-3 font-medium text-sm uppercase tracking-widest">
                  <span className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center text-[10px]">✓</span>
                  {feat}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --- STATS / TRUST --- */}
      <section className="py-24 border-y border-black/5">
        <div className="max-w-[1200px] mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-12 text-center">
          <div>
            <p className="text-4xl font-serif mb-2">4K</p>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Precision Rendered</p>
          </div>
          <div>
            <p className="text-4xl font-serif mb-2">0.8s</p>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Upload Speed</p>
          </div>
          <div>
            <p className="text-4xl font-serif mb-2">Social</p>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Integrated Identity</p>
          </div>
          <div>
            <p className="text-4xl font-serif mb-2">Verified</p>
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-50">Industry Standards</p>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-32 bg-[#1E1E1C] text-[#F2F2EE] text-center px-6">
        <h2 className="text-5xl md:text-7xl font-serif mb-8 max-w-3xl mx-auto">
          Ready to join the <span className="italic">Network</span>?
        </h2>
        <p className="text-lg opacity-60 mb-12 max-w-xl mx-auto font-light">
          Join the elite community of models and agencies leveraging the most advanced portfolio system in the industry.
        </p>
        <Link 
          href="/register" 
          className="inline-block px-12 py-6 bg-white text-black text-sm uppercase tracking-widest font-bold rounded-full hover:scale-105 transition-transform shadow-2xl"
        >
          Start Your Free Profile
        </Link>
      </section>

      {/* --- FOOTER --- */}
      <footer className="py-12 text-center border-t border-black/5 opacity-40">
        <p className="text-[10px] uppercase tracking-widest">
          © {new Date().getFullYear()} MODELWE — Built for the Visionaries.
        </p>
      </footer>
    </div>
  );
}