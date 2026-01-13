import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

interface DecryptedTextProps {
  text: string;
  speed?: number;
  maxIterations?: number;
  characters?: string;
  className?: string;
  parentClassName?: string;
  encryptedClassName?: string;
  animateOn?: "view" | "hover";
  revealDirection?: "start" | "end" | "center";
  onAnimationComplete?: () => void;
}

const DecryptedText: React.FC<DecryptedTextProps> = ({
  text,
  speed = 50,
  maxIterations = 10,
  characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()_+",
  className = "",
  parentClassName = "",
  encryptedClassName = "text-zinc-500",
  animateOn = "view",
  revealDirection = "start",
  onAnimationComplete,
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isAnimating, setIsAnimating] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);
  const containerRef = useRef<HTMLSpanElement>(null);

  const getRandomChar = useCallback(() => {
    return characters[Math.floor(Math.random() * characters.length)];
  }, [characters]);

  const animate = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText((prev) =>
        prev
          .split("")
          .map((char, index) => {
            if (char === " ") return " ";

            let revealIndex: number;
            if (revealDirection === "start") {
              revealIndex = Math.floor(iteration / maxIterations * text.length);
            } else if (revealDirection === "end") {
              revealIndex = text.length - Math.floor(iteration / maxIterations * text.length);
            } else {
              const center = Math.floor(text.length / 2);
              const progress = Math.floor(iteration / maxIterations * center);
              revealIndex = index >= center - progress && index <= center + progress ? index : -1;
            }

            if (revealDirection === "start" && index < revealIndex) {
              return text[index];
            } else if (revealDirection === "end" && index >= revealIndex) {
              return text[index];
            } else if (revealDirection === "center" && revealIndex === index) {
              return text[index];
            }

            return getRandomChar();
          })
          .join("")
      );

      iteration++;

      if (iteration >= maxIterations) {
        clearInterval(interval);
        setDisplayText(text);
        setIsAnimating(false);
        setHasAnimated(true);
        onAnimationComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed, maxIterations, getRandomChar, revealDirection, isAnimating, onAnimationComplete]);

  useEffect(() => {
    if (animateOn !== "view" || hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          animate();
        }
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [animate, animateOn, hasAnimated]);

  const handleMouseEnter = () => {
    if (animateOn === "hover") {
      animate();
    }
  };

  return (
    <motion.span
      ref={containerRef}
      className={parentClassName}
      onMouseEnter={handleMouseEnter}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {displayText.split("").map((char, index) => {
        const isRevealed = char === text[index];
        return (
          <span
            key={index}
            className={isRevealed ? className : encryptedClassName}
          >
            {char}
          </span>
        );
      })}
    </motion.span>
  );
};

export default DecryptedText;
