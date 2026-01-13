import { motion } from "framer-motion";

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  colors?: string[];
  animationSpeed?: number;
  showBorder?: boolean;
}

const GradientText: React.FC<GradientTextProps> = ({
  children,
  className = "",
  colors = ["#4f46e5", "#6366f1", "#818cf8", "#6366f1", "#4f46e5"],
  animationSpeed = 8,
  showBorder = false,
}) => {
  const gradientStyle = {
    backgroundImage: `linear-gradient(90deg, ${colors.join(", ")})`,
    backgroundSize: "200% 100%",
  };

  return (
    <motion.span
      className={`inline-block bg-clip-text text-transparent ${className}`}
      style={gradientStyle}
      animate={{
        backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
      }}
      transition={{
        duration: animationSpeed,
        ease: "linear",
        repeat: Infinity,
      }}
    >
      {showBorder && (
        <span
          className="absolute inset-0 rounded-lg"
          style={{
            ...gradientStyle,
            padding: "2px",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
      )}
      {children}
    </motion.span>
  );
};

export default GradientText;
