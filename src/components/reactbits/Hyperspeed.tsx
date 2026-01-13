import { useEffect, useRef } from "react";

interface HyperspeedProps {
  className?: string;
  effectOptions?: {
    onSpeedUp?: () => void;
    onSlowDown?: () => void;
    distortion?: "turbulentDistortion" | "mountainDistortion" | "xyDistortion" | "LongRaceDistortion" | "deepDistortion";
    length?: number;
    roadWidth?: number;
    islandWidth?: number;
    lanesPerRoad?: number;
    fov?: number;
    fovSpeedUp?: number;
    speedUp?: number;
    carLightsFade?: number;
    totalSideLightSticks?: number;
    lightPairsPerRoadWay?: number;
    shoulderLinesWidthPercentage?: number;
    brokenLinesWidthPercentage?: number;
    brokenLinesLengthPercentage?: number;
    lightStickWidth?: [number, number];
    lightStickHeight?: [number, number];
    movingAwaySpeed?: [number, number];
    movingCloserSpeed?: [number, number];
    carLightsLength?: [number, number];
    carLightsRadius?: [number, number];
    carWidthPercentage?: [number, number];
    carShiftX?: [number, number];
    carFloorSeparation?: [number, number];
    colors?: {
      roadColor?: number;
      islandColor?: number;
      background?: number;
      shoulderLines?: number;
      brokenLines?: number;
      leftCars?: [number, number, number];
      rightCars?: [number, number, number];
      sticks?: number;
    };
  };
}

const Hyperspeed: React.FC<HyperspeedProps> = ({
  className = "",
  effectOptions = {},
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
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

    const stars: { x: number; y: number; z: number }[] = [];
    const numStars = 400;
    const speed = effectOptions.speedUp || 0.5;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: Math.random() * canvas.width - canvas.width / 2,
        y: Math.random() * canvas.height - canvas.height / 2,
        z: Math.random() * canvas.width,
      });
    }

    const animate = () => {
      ctx.fillStyle = `rgba(9, 9, 11, 0.2)`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      for (const star of stars) {
        star.z -= speed * 10;

        if (star.z <= 0) {
          star.x = Math.random() * canvas.width - centerX;
          star.y = Math.random() * canvas.height - centerY;
          star.z = canvas.width;
        }

        const sx = (star.x / star.z) * canvas.width + centerX;
        const sy = (star.y / star.z) * canvas.height + centerY;
        const size = (1 - star.z / canvas.width) * 3;

        const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, size);
        gradient.addColorStop(0, "rgba(99, 102, 241, 1)");
        gradient.addColorStop(0.5, "rgba(99, 102, 241, 0.5)");
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();

        // Draw trail
        const prevSx = (star.x / (star.z + speed * 20)) * canvas.width + centerX;
        const prevSy = (star.y / (star.z + speed * 20)) * canvas.height + centerY;

        ctx.beginPath();
        ctx.strokeStyle = `rgba(99, 102, 241, ${0.5 - star.z / canvas.width})`;
        ctx.lineWidth = size * 0.5;
        ctx.moveTo(prevSx, prevSy);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [effectOptions]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ background: "#09090b" }}
    />
  );
};

export default Hyperspeed;
