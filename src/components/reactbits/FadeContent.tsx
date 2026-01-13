import { useRef, useEffect, useState } from "react";
import { motion, Variants, Easing } from "framer-motion";

interface FadeContentProps {
  children: React.ReactNode;
  className?: string;
  blur?: boolean;
  duration?: number;
  delay?: number;
  easing?: Easing;
  direction?: "up" | "down" | "left" | "right" | "none";
  distance?: number;
  threshold?: number;
  initialOpacity?: number;
  onAnimationComplete?: () => void;
}

const FadeContent: React.FC<FadeContentProps> = ({
  children,
  className = "",
  blur = false,
  duration = 0.6,
  delay = 0,
  easing = "easeOut",
  direction = "up",
  distance = 20,
  threshold = 0.1,
  initialOpacity = 0,
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
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  const getDirectionOffset = () => {
    switch (direction) {
      case "up":
        return { y: distance };
      case "down":
        return { y: -distance };
      case "left":
        return { x: distance };
      case "right":
        return { x: -distance };
      default:
        return {};
    }
  };

  const variants: Variants = {
    hidden: {
      opacity: initialOpacity,
      filter: blur ? "blur(10px)" : "blur(0px)",
      ...getDirectionOffset(),
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: easing,
      },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      onAnimationComplete={onAnimationComplete}
    >
      {children}
    </motion.div>
  );
};

export default FadeContent;
