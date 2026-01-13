import { useEffect, useRef } from "react";

interface MagnetLinesProps {
  className?: string;
  rows?: number;
  columns?: number;
  containerSize?: string;
  lineColor?: string;
  lineWidth?: string;
  lineHeight?: string;
  baseAngle?: number;
  style?: React.CSSProperties;
}

const MagnetLines: React.FC<MagnetLinesProps> = ({
  className = "",
  rows = 9,
  columns = 9,
  containerSize = "80%",
  lineColor = "rgb(79, 70, 229)",
  lineWidth = "2px",
  lineHeight = "24px",
  baseAngle = -10,
  style = {},
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      linesRef.current.forEach((line) => {
        if (!line) return;

        const lineRect = line.getBoundingClientRect();
        const lineCenterX = lineRect.left + lineRect.width / 2 - rect.left;
        const lineCenterY = lineRect.top + lineRect.height / 2 - rect.top;

        const deltaX = mouseX - lineCenterX;
        const deltaY = mouseY - lineCenterY;
        const angle = Math.atan2(deltaY, deltaX) * (180 / Math.PI);

        line.style.transform = `rotate(${angle + 90}deg)`;
      });
    };

    const handleMouseLeave = () => {
      linesRef.current.forEach((line) => {
        if (!line) return;
        line.style.transform = `rotate(${baseAngle}deg)`;
        line.style.transition = "transform 0.5s ease-out";
      });
    };

    container.addEventListener("mousemove", handleMouseMove);
    container.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      container.removeEventListener("mousemove", handleMouseMove);
      container.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [baseAngle]);

  const lines = [];
  let index = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const currentIndex = index;
      lines.push(
        <div
          key={`${row}-${col}`}
          ref={(el) => {
            if (el) linesRef.current[currentIndex] = el;
          }}
          className="transition-transform duration-100"
          style={{
            width: lineWidth,
            height: lineHeight,
            backgroundColor: lineColor,
            borderRadius: "9999px",
            transform: `rotate(${baseAngle}deg)`,
          }}
        />
      );
      index++;
    }
  }

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 flex items-center justify-center ${className}`}
      style={{ background: "#09090b", ...style }}
    >
      <div
        className="grid gap-6"
        style={{
          width: containerSize,
          height: containerSize,
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          placeItems: "center",
        }}
      >
        {lines}
      </div>
    </div>
  );
};

export default MagnetLines;
