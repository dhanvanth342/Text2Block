import { MessageSquare, GitBranch, BookOpen, ArrowRight, Code, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HowItWorksDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksDropdown({ isOpen, onClose }: HowItWorksDropdownProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="absolute top-full right-0 mt-2 w-[700px] max-w-[90vw] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden"
        >
          {/* Content Area - 3-Step Workflow */}
          <div className="p-6">
            <div className="flex items-center justify-between gap-3">
              {/* Step 1: Enter Query */}
              <div className="flex-1 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-electric-blue/10 border border-electric-blue/30 mb-3">
                  <MessageSquare size={22} className="text-electric-blue" />
                </div>
                <h3 className="text-sm mb-1.5">Enter Query</h3>
                <p className="text-xs text-gray-400">
                  Describe a topic or ask any question about concepts you want to learn
                </p>
              </div>

              {/* Arrow 1 */}
              <div className="flex-shrink-0">
                <ArrowRight size={20} className="text-gray-600" />
              </div>

              {/* Step 2: Smart Routing */}
              <div className="flex-1 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-success-green/10 border border-success-green/30 mb-3">
                  <GitBranch size={22} className="text-success-green" />
                </div>
                <h3 className="text-sm mb-1.5">Smart Routing</h3>
                <p className="text-xs text-gray-400">
                  AI analyzes your intent — answers directly or creates an editable tutorial prompt
                </p>
              </div>

              {/* Arrow 2 */}
              <div className="flex-shrink-0">
                <ArrowRight size={20} className="text-gray-600" />
              </div>

              {/* Step 3: Rich Tutorial */}
              <div className="flex-1 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/30 mb-3">
                  <BookOpen size={22} className="text-purple-400" />
                </div>
                <h3 className="text-sm mb-1.5">Rich Tutorial</h3>
                <p className="text-xs text-gray-400">
                  Get comprehensive tutorials with interactive code blocks and images
                </p>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-5 p-3 rounded-lg bg-white/5 border border-white/10">
              <div className="flex items-center justify-center gap-4 text-xs text-gray-300">
                <span className="flex items-center gap-1.5">
                  <Code size={14} className="text-emerald-400" />
                  <span>Interactive code with copy</span>
                </span>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1.5">
                  <Image size={14} className="text-purple-400" />
                  <span>AI-curated images</span>
                </span>
                <span className="text-gray-600">•</span>
                <span className="flex items-center gap-1.5">
                  <BookOpen size={14} className="text-electric-blue" />
                  <span>Saved to your history</span>
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 border-t border-slate-700 bg-slate-900/50">
            <button
              onClick={onClose}
              className="w-full btn-primary py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm"
            >
              <span>Start Learning</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}