"use client";

import { useEffect, useState, useRef } from "react";

const MAX_HEARTS = 180;
const HEART_DURATION_MS = 5000;
const SPAWN_INTERVAL_MS = 120;

type Heart = {
  id: number;
  x: number;
  y: number;
  scale: number;
  dx: number;
  dy: number;
};

export default function FloatingHearts() {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const idRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const getSize = () => {
      const el = containerRef.current;
      return {
        w: el?.clientWidth ?? (typeof window !== "undefined" ? window.innerWidth : 800),
        h: el?.clientHeight ?? (typeof window !== "undefined" ? window.innerHeight : 600),
      };
    };

    const spawn = () => {
      setHearts((prev) => {
        if (prev.length >= MAX_HEARTS) return prev;
        const { w, h } = getSize();
        const margin = 40;

        // random start anywhere (including slightly offscreen)
        const x =
          Math.random() * (w + margin * 2) - margin;
        const y =
          Math.random() * (h + margin * 2) - margin;

        // полностью рандомное направление
        const angle = Math.random() * Math.PI * 2;
        const scale = Math.random() * 0.4 + 0.15;
        const distance = 80 + Math.random() * 220;
        const id = ++idRef.current;

        setTimeout(() => {
          setHearts((p) => p.filter((heart) => heart.id !== id));
        }, HEART_DURATION_MS);

        return [
          ...prev,
          {
            id,
            x,
            y,
            scale,
            dx: Math.cos(angle) * distance,
            dy: Math.sin(angle) * distance,
          },
        ];
      });
    };

    const interval = setInterval(spawn, SPAWN_INTERVAL_MS);
    for (let i = 0; i < 12; i++) setTimeout(spawn, i * 80);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <svg
        className="absolute inset-0 h-full w-full"
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
      >
        <defs>
          <g id="heart">
            <g>
              <path
                className="fill-rose-300 dark:fill-rose-900/40"
                d="M102.7,12.4L102.7,12.4C90.5,0.2,71.3-1,57.7,8.8c-13.6-9.9-32.9-8.7-45.2,3.5l0,0
                                   c-13.6,13.6-13.6,35.8,0,49.3L48.8,98c1.8,1.8,4,2.9,6.3,3.3c3.9,0.9,8.2-0.1,11.2-3.2l36.3-36.3C116.2,48.2,116.2,26,102.7,12.4
                                   z"
              />
            </g>
            <g>
              <path
                className="fill-rose-200 dark:fill-rose-800/30"
                d="M74.7,34L74.7,34c-4.6-4.6-11.9-5.1-17.1-1.4c-5.2-3.8-12.5-3.3-17.1,1.3c-5.1,5.1-5.1,13.6,0,18.7
                                   l13.8,13.8c0.7,0.7,1.5,1.1,2.4,1.3c1.5,0.3,3.1-0.1,4.2-1.2l13.8-13.8C79.9,47.6,79.9,39.2,74.7,34z"
              />
            </g>
          </g>
        </defs>
        {hearts.map(({ id, x, y, scale, dx, dy }) => (
          <g key={id} transform={`translate(${x},${y})`}>
            <use
              href="#heart"
              className="floating-heart"
              style={
                {
                  ["--heart-scale" as string]: scale,
                  ["--heart-dx" as string]: `${dx}px`,
                  ["--heart-dy" as string]: `${dy}px`,
                } as React.CSSProperties
              }
            />
          </g>
        ))}
      </svg>
    </div>
  );
}
