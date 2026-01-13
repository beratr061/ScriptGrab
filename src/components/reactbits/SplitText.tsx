import { useRef, useEffect, useState } from "react";
import { motion, Variants, Easing } from "framer-motion";

interface SplitTextProps {
  text: string;
  className?: string;
  delay?: number;
  animationFrom?: { opacity?: number; y?: number; x?: number; scale?: number; rotate?: number };
  animationTo?: { opacity?: number; y?: number; x?: number; scale?: number; rotate?: number };
  easing?: Easing;
  threshold?: number;
  rootMargin?: string;
  onAnimationComplete?: () => void;
}

const SplitText: React.FC<SplitTextProps> = ({
  text,
  className = "",
  delay = 0.03,
  animationFrom = { opacity: 0, y: 40 },
  animationTo = { opacity: 1, y: 0 },
  easing = "easeOut",
  threshold = 0.1,
  rootMargin = "0px",
  onAnimationComplete,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  const letters = text.split("");

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay,
      },
    },
  };

  const letterVariants: Variants = {
    hidden: animationFrom,
    visible: {
      ...animationTo,
      transition: {
        duration: 0.4,
        ease: easing,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      onAnimationComplete={onAnimationComplete}
      aria-label={text}
    >
      {letters.map((letter, index) => (
        <motion.span
          key={index}
          variants={letterVariants}
          className="inline-block"
          style={{ whiteSpace: letter === " " ? "pre" : "normal" }}
        >
          {letter === " " ? "\u00A0" : letter}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default SplitText;
