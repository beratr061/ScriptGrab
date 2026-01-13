import { useRef, useEffect, useState } from "react";
import { motion, Variants } from "framer-motion";

interface BlurTextProps {
  text: string;
  delay?: number;
  className?: string;
  animateBy?: "words" | "letters";
  direction?: "top" | "bottom";
  onAnimationComplete?: () => void;
}

const BlurText: React.FC<BlurTextProps> = ({
  text,
  delay = 0.05,
  className = "",
  animateBy = "words",
  direction = "bottom",
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
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  const elements = animateBy === "words" ? text.split(" ") : text.split("");

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: delay,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: {
      opacity: 0,
      filter: "blur(10px)",
      y: direction === "top" ? -20 : 20,
    },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        duration: 0.4,
        ease: "easeOut",
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
    >
      {elements.map((element, index) => (
        <motion.span
          key={index}
          variants={itemVariants}
          className="inline-block"
        >
          {element}
          {animateBy === "words" && index < elements.length - 1 && "\u00A0"}
        </motion.span>
      ))}
    </motion.div>
  );
};

export default BlurText;
