import { ThreeBackground } from './ThreeBackground';
import { BrainCircuit, Workflow, Database } from 'lucide-react';
import { SmartNavbar } from './SmartNavbar';

interface LandingPageProps {
  onSignIn: () => void;
  onSignUp: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export function LandingPage({ onSignIn, onSignUp, isDark, onToggleTheme }: LandingPageProps) {
  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      <ThreeBackground isDark={isDark} />

      {/* Smart Navbar */}
      <SmartNavbar
        user={null}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
      />

      {/* Hero Section */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 md:px-8 pt-24 pb-20 sm:pb-24">
        <div className="max-w-4xl text-center">
          {/* Trust Badge */}
          <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs rounded-full px-3 py-1 mb-6">
            <span>✨</span>
            <span>POWERED BY GOOGLE GEMINI 2.5 FLASH</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl mb-6 sm:mb-8 leading-tight">
            Transform Confusion
            <br />
            <span className="text-electric-blue">into Clarity</span>
          </h1>
          
          <p className="text-base sm:text-lg md:text-xl text-gray-400 mb-10 sm:mb-12 md:mb-14 max-w-2xl mx-auto px-4">
            Generate rich, illustrated tutorials from simple prompts. Learn complex concepts
            through AI-crafted articles with flowcharts and visual guides.
          </p>

          <div className="mb-20 sm:mb-24">
            <button
              onClick={onSignUp}
              className="bg-electric-blue hover:bg-blue-600 text-white px-8 sm:px-10 md:px-12 py-3 sm:py-3.5 md:py-4 rounded-full text-base sm:text-lg transition-all glow-blue transform hover:scale-105"
            >
              Start Learning
            </button>
          </div>

          {/* Bento Grid Features */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 md:gap-8 text-left mb-16">
            <div className="glass-surface p-6 sm:p-7 md:p-8 rounded-xl border border-white/10 hover:border-electric-blue/50 transition-all">
              <BrainCircuit className="text-electric-blue mb-4" size={40} />
              <h3 className="text-xl sm:text-2xl mb-3">AI-Powered Generation</h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Advanced neural networks analyze your topic and synthesize comprehensive learning materials
              </p>
            </div>

            <div className="glass-surface p-6 sm:p-7 md:p-8 rounded-xl border border-white/10 hover:border-electric-blue/50 transition-all">
              <Workflow className="text-emerald mb-4" size={40} />
              <h3 className="text-xl sm:text-2xl mb-3">Dynamic Flowcharts</h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Auto-generated SVG diagrams visualize system architectures and process flows
              </p>
            </div>

            <div className="glass-surface p-6 sm:p-7 md:p-8 rounded-xl border border-white/10 hover:border-electric-blue/50 transition-all sm:col-span-2 md:col-span-1">
              <Database className="text-purple-400 mb-4" size={40} />
              <h3 className="text-xl sm:text-2xl mb-3">Knowledge Base</h3>
              <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
                Indexed documentation and curated examples ensure accurate, relevant content
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>&copy; 2025 Text2Block. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="mailto:voonadhanvanth183@gmail.com" className="hover:text-white transition-colors">
              Contact Us
            </a>
            <button className="hover:text-white transition-colors">
              Privacy Policy
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}