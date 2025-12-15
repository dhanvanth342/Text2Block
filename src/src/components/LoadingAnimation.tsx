import { useState, useEffect } from 'react';
import { Image, GitBranch, FileText } from 'lucide-react';

interface LoadingAnimationProps {
  isOpen: boolean;
}

const optimizationStages = [
  { icon: Image, text: 'Analyzing Request...', duration: 1500 },
  { icon: GitBranch, text: 'Identifying Key Concepts...', duration: 2000 },
  { icon: FileText, text: 'Structuring Response...', duration: 1500 },
];

const generationStages = [
  { icon: Image, text: 'Retrieving Images...', duration: 1500 },
  { icon: GitBranch, text: 'Generating Flowcharts...', duration: 2000 },
  { icon: FileText, text: 'Rendering Markdown...', duration: 1500 },
];

interface LoadingAnimationProps {
  isOpen: boolean;
  mode?: 'optimization' | 'generation';
  customStatus?: string | null;
}

export function LoadingAnimation({ isOpen, mode = 'generation', customStatus }: LoadingAnimationProps) {
  const [currentStage, setCurrentStage] = useState(0);

  const stages = mode === 'optimization' ? optimizationStages : generationStages;

  useEffect(() => {
    if (!isOpen || customStatus) {
      setCurrentStage(0);
      return;
    }

    const timer = setTimeout(() => {
      if (currentStage < stages.length - 1) {
        setCurrentStage(currentStage + 1);
      }
    }, stages[currentStage].duration);

    return () => clearTimeout(timer);
  }, [isOpen, currentStage, customStatus, stages]);

  if (!isOpen) return null;

  const CurrentIcon = stages[currentStage].icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="text-center">
        {/* Isometric Construction Animation */}
        <div className="relative w-64 h-64 mx-auto mb-8">
          {/* Animated cubes */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ transform: 'rotateX(60deg) rotateZ(45deg)' }}>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="absolute w-16 h-16 bg-electric-blue/30 border-2 border-electric-blue animate-bounce"
                  style={{
                    animationDelay: `${i * 0.2}s`,
                    left: `${i * 20}px`,
                    top: `${i * 20}px`,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="glass-surface w-24 h-24 rounded-2xl flex items-center justify-center border border-electric-blue glow-blue">
              <CurrentIcon className="text-electric-blue animate-pulse" size={48} />
            </div>
          </div>
        </div>

        {/* Status text */}
        <div className="space-y-4">
          <h3 className="text-2xl min-h-[2rem]">
            {customStatus || stages[currentStage].text}
          </h3>

          {/* Progress dots (Only show if NOT using custom status) */}
          {!customStatus && (
            <div className="flex items-center justify-center gap-2">
              {stages.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStage
                      ? 'w-8 bg-electric-blue glow-blue'
                      : index < currentStage
                      ? 'w-2 bg-emerald'
                      : 'w-2 bg-gray-600'
                  }`}
                />
              ))}
            </div>
          )}

          {customStatus && (
             <div className="flex items-center justify-center gap-1">
               <div className="w-2 h-2 rounded-full bg-electric-blue animate-bounce" style={{ animationDelay: '0s' }} />
               <div className="w-2 h-2 rounded-full bg-electric-blue animate-bounce" style={{ animationDelay: '0.2s' }} />
               <div className="w-2 h-2 rounded-full bg-electric-blue animate-bounce" style={{ animationDelay: '0.4s' }} />
             </div>
          )}

          <p className="text-gray-400 text-sm">
            {mode === 'optimization' ? 'Refining your query...' : 'Crafting your personalized tutorial...'}
          </p>
        </div>
      </div>
    </div>
  );
}
