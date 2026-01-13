import { useEffect, useRef } from "react";

interface ThreadsProps {
  className?: string;
  color?: [number, number, number];
  amplitude?: number;
  distance?: number;
  enableMouseInteraction?: boolean;
}

const Threads: React.FC<ThreadsProps> = ({
  className = "",
  color = [79, 70, 229], // indigo-600
  amplitude = 1,
  distance = 0,
  enableMouseInteraction = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    };

    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) * window.devicePixelRatio,
        y: (e.clientY - rect.top) * window.devicePixelRatio,
      };
    };

    if (enableMouseInteraction) {
      canvas.addEventListener("mousemove", handleMouseMove);
    }

    const numLines = 30;
    const lines: { points: { x: number; y: number; vx: number; vy: number }[] }[] = [];

    for (let i = 0; i < numLines; i++) {
      const points = [];
      const numPoints = 50;
      const baseY = (canvas.height / numLines) * i;

      for (let j = 0; j < numPoints; j++) {
        points.push({
          x: (canvas.width / numPoints) * j,
          y: baseY,
          vx: 0,
          vy: 0,
        });
      }
      lines.push({ points });
    }

    let time = 0;

    const animate = () => {
      ctx.fillStyle = "rgba(9, 9, 11, 0.1)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      time += 0.02;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const baseY = (canvas.height / numLines) * i;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${0.3 + (i / numLines) * 0.4})`;
        ctx.lineWidth = 1.5;

        for (let j = 0; j < line.points.length; j++) {
          const point = line.points[j];
          const waveOffset = Math.sin(time + j * 0.1 + i * 0.2) * 20 * amplitude;
          const targetY = baseY + waveOffset;

          if (enableMouseInteraction) {
            const dx = point.x - mouseRef.current.x;
            const dy = point.y - mouseRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const maxDist = 150;

            if (dist < maxDist) {
              const force = (1 - dist / maxDist) * 50;
              point.vy += (dy / dist) * force * 0.1;
            }
          }

          point.vy += (targetY - point.y) * 0.05;
          point.vy *= 0.9;
          point.y += point.vy;

          if (j === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }

        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (enableMouseInteraction) {
        canvas.removeEventListener("mousemove", handleMouseMove);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [color, amplitude, distance, enableMouseInteraction]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ background: "#09090b" }}
    />
  );
};

export default Threads;
