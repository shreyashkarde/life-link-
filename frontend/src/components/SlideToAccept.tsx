import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { ChevronRight, ShieldAlert, XCircle } from 'lucide-react';

interface SlideToAcceptProps {
  onTrigger: () => void;
  label: string;
  theme: 'accept' | 'reject';
}

export const SlideToAccept: React.FC<SlideToAcceptProps> = ({ onTrigger, label, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [maxDrag, setMaxDrag] = useState(200);
  const x = useMotionValue(0);

  // Transform opacity and color based on drag distance
  const opacity = useTransform(x, [0, maxDrag], [1, 0.1]);
  const width = useTransform(x, [0, maxDrag], ['0%', '100%']);

  useEffect(() => {
    if (containerRef.current) {
      // Container width minus handle width minus border padding
      const containerWidth = containerRef.current.offsetWidth;
      setMaxDrag(containerWidth - 58);
    }
  }, []);

  const handleDragEnd = () => {
    if (x.get() >= maxDrag * 0.85) {
      onTrigger();
    } else {
      // Snap back
      x.set(0);
    }
  };

  const isAccept = theme === 'accept';

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-14 rounded-full overflow-hidden select-none p-1 flex items-center justify-between ${
        isAccept
          ? 'bg-emerald-950/20 border border-emerald-500/30'
          : 'bg-rose-950/20 border border-rose-500/30'
      }`}
    >
      {/* Background slide indicator */}
      <motion.div
        style={{ width }}
        className={`absolute left-0 top-0 bottom-0 rounded-full opacity-60 ${
          isAccept
            ? 'bg-gradient-to-r from-emerald-600 to-teal-500'
            : 'bg-gradient-to-r from-rose-600 to-orange-500'
        }`}
      />

      {/* Center instruction text */}
      <motion.div
        style={{ opacity }}
        className={`absolute inset-0 flex items-center justify-center font-semibold text-sm pointer-events-none ${
          isAccept ? 'text-emerald-400' : 'text-rose-400'
        }`}
      >
        {label}
      </motion.div>

      {/* Draggable handle */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: maxDrag }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className={`w-12 h-12 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-10 shadow-lg ${
          isAccept
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white'
            : 'bg-gradient-to-r from-rose-500 to-red-600 text-white'
        }`}
      >
        {isAccept ? <ChevronRight className="w-6 h-6 animate-pulse" /> : <XCircle className="w-5 h-5 animate-pulse" />}
      </motion.div>

      {/* End icon visual cue */}
      <div className={`mr-4 opacity-30 ${isAccept ? 'text-emerald-400' : 'text-rose-400'}`}>
        {isAccept ? <ShieldAlert className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
      </div>
    </div>
  );
};
export default SlideToAccept;
