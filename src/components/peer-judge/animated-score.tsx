'use client';

import { useEffect, useRef, useState } from 'react';
import { animate } from 'framer-motion';

interface AnimatedScoreProps {
  value: number;
  className?: string;
}

export function AnimatedScore({ value, className }: AnimatedScoreProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const controls = animate(prevValueRef.current, value, {
      duration: 0.8,
      ease: 'easeOut',
      onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
    });

    prevValueRef.current = value;
    return () => controls.stop();
  }, [value]);

  return <span className={className}>{displayValue}</span>;
}
