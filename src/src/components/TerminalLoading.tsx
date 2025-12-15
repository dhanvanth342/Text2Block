import { useEffect, useState } from 'react';

const loadingSteps = [
  { text: '> Handshaking with Google Vertex AI...', delay: 0 },
  { text: '[OK]', delay: 800, inline: true },
  { text: '> Querying Vector Embeddings...', delay: 1200 },
  { text: '[OK]', delay: 2000, inline: true },
  { text: '> Synthesizing Diagram Topology...', delay: 2400 },
  { text: '[PROCESSING]', delay: 3200, inline: true },
  { text: '> Assembling Tutorial Content...', delay: 3800 },
  { text: '[OK]', delay: 4600, inline: true },
];

export function TerminalLoading() {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    loadingSteps.forEach((step, index) => {
      const timer = setTimeout(() => {
        setVisibleSteps(index + 1);
      }, step.delay);
      timers.push(timer);
    });

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="glass-surface rounded-lg p-6 w-full max-w-2xl border border-emerald/30">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald/80" />
          </div>
          <span className="text-sm text-gray-400 ml-2">text2block-terminal</span>
        </div>

        {/* Terminal Content */}
        <div className="font-mono text-sm space-y-2">
          {loadingSteps.slice(0, visibleSteps).map((step, index) => {
            const isStatus = step.inline;
            const prevStep = index > 0 ? loadingSteps[index - 1] : null;
            
            if (isStatus && prevStep && !prevStep.inline) {
              // This is a status that should be on the same line
              return null;
            }

            const nextStep = loadingSteps[index + 1];
            const hasInlineStatus = nextStep && nextStep.inline && visibleSteps > index + 1;

            return (
              <div key={index} className="flex items-center gap-2">
                <span className={isStatus ? 'text-emerald' : 'text-gray-300'}>
                  {step.text}
                </span>
                {!isStatus && hasInlineStatus && (
                  <span className="text-emerald animate-pulse">
                    {loadingSteps[index + 1].text}
                  </span>
                )}
                {!isStatus && !hasInlineStatus && visibleSteps === index + 1 && (
                  <span className="inline-block w-2 h-4 bg-emerald animate-pulse ml-1" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
