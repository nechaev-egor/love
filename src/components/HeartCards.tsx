"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { createPortal } from "react-dom";

import { loadPhotos } from "@/lib/photos";

const CARD_SIZE = 0.22;
const DURATION_MS = 2200;
const HEART_SCALE = 0.9;
const MAX_CARDS = 100;

function getHeartPoints(count: number): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y =
      13 * Math.cos(t) -
      5 * Math.cos(2 * t) -
      2 * Math.cos(3 * t) -
      Math.cos(4 * t);
    points.push({
      x: (x / 18) * HEART_SCALE,
      y: (y / 18) * HEART_SCALE,
    });
  }
  return points;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

type HeartCardsProps = {
  fullScreen?: boolean;
  onReady?: () => void;
};

const HOVER_SCALE = 1.25;
const HOVER_THRESHOLD = 0.2;

export default function HeartCards({ fullScreen, onReady }: HeartCardsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglError, setWebglError] = useState(false);
  const [enlargedCard, setEnlargedCard] = useState<{ src: string } | null>(null);
  const initWebGL = useCallback(
    (gl: WebGLRenderingContext, images: HTMLImageElement[]) => {
      const vsSource = `attribute vec2 a_center;
attribute vec2 a_corner;
uniform float u_scale;
uniform float u_cardScale;
varying vec2 v_uv;
void main() {
  v_uv = a_corner * 0.5 + 0.5;
  vec2 pos = a_center + a_corner * u_scale * u_cardScale;
  gl_Position = vec4(pos, 0.0, 1.0);
}`;

      const fsSource = `precision mediump float;
uniform sampler2D u_texture;
uniform float u_aspect;
varying vec2 v_uv;
void main() {
  float ratio = u_aspect;
  vec2 texCoord;
  if (ratio > 1.0) {
    texCoord = vec2((v_uv.x - 0.5) / ratio + 0.5, v_uv.y);
  } else if (ratio < 1.0) {
    texCoord = vec2(v_uv.x, (v_uv.y - 0.5) * ratio + 0.5);
  } else {
    texCoord = v_uv;
  }
  vec2 uv = vec2(texCoord.x, 1.0 - texCoord.y);
  vec4 tex = texture2D(u_texture, uv);
  float e = step(0.92, v_uv.x) + step(v_uv.x, 0.08) + step(0.92, v_uv.y) + step(v_uv.y, 0.08);
  vec3 col = mix(tex.rgb, vec3(1.0, 0.95, 0.95), e);
  gl_FragColor = vec4(col, 1.0);
}`;

      const vs = gl.createShader(gl.VERTEX_SHADER)!;
      gl.shaderSource(vs, vsSource);
      gl.compileShader(vs);
      if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
        console.error("Vertex shader:", gl.getShaderInfoLog(vs));
        return null;
      }

      const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
      gl.shaderSource(fs, fsSource);
      gl.compileShader(fs);
      if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
        console.error("Fragment shader:", gl.getShaderInfoLog(fs));
        return null;
      }

      const program = gl.createProgram()!;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
      }

      const colors = [
        [1.0, 0.4, 0.5],
        [1.0, 0.6, 0.7],
        [0.95, 0.5, 0.6],
        [1.0, 0.7, 0.75],
        [0.9, 0.45, 0.55],
      ];

      const createTexture = (img: HTMLImageElement | null, color?: number[]) => {
        const tex = gl.createTexture()!;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (img) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        } else {
          const [r, g, b] = color ?? [1, 0.5, 0.6];
          const data = new Uint8Array([r * 255, g * 255, b * 255, 255]);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
        }
        return tex;
      };

      const textures: WebGLTexture[] = [];
      if (images.length > 0) {
        for (const img of images) {
          textures.push(createTexture(img));
        }
      } else {
        for (const col of colors) {
          textures.push(createTexture(null, col));
        }
      }

      gl.useProgram(program);
      const a_center = gl.getAttribLocation(program, "a_center");
      const a_corner = gl.getAttribLocation(program, "a_corner");
      const u_scale = gl.getUniformLocation(program, "u_scale");
      const u_cardScale = gl.getUniformLocation(program, "u_cardScale");
      const u_texture = gl.getUniformLocation(program, "u_texture");
      const u_aspect = gl.getUniformLocation(program, "u_aspect");

      const aspects: number[] = [];
      if (images.length > 0) {
        for (const img of images) {
          aspects.push(img.naturalWidth / img.naturalHeight || 1);
        }
      } else {
        textures.forEach(() => aspects.push(1));
      }

      const corners = new Float32Array([
        -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
      ]);

      const cornerBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, corners, gl.STATIC_DRAW);

      const centerBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
      const bufferSize = Math.max(MAX_CARDS, textures.length) * 6 * 2 * 4;
      gl.bufferData(gl.ARRAY_BUFFER, bufferSize, gl.DYNAMIC_DRAW);

      return {
        program,
        a_center,
        a_corner,
        u_scale,
        u_cardScale,
        u_texture,
        u_aspect,
        cornerBuffer,
        centerBuffer,
        textures,
        aspects,
      };
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const init = async () => {
      if (cancelled) return;
      const gl = canvas.getContext("webgl", {
        alpha: true,
        antialias: true,
        failIfMajorPerformanceCaveat: false,
      }) as WebGLRenderingContext | null;
      if (!gl) {
        setWebglError(true);
        return;
      }
      const images = await loadPhotos();
      if (cancelled) return;
      const setup = initWebGL(gl, images);
      if (!setup) {
        setWebglError(true);
        return;
      }
      const imageSrcs = images.map((img) => img.src);
      cleanup = runAnimation(gl, setup, canvas, {
        imageSrcs,
        onCardTap: (src) => setEnlargedCard({ src }),
        onFirstFrame: () => onReady?.(),
      });
    };

    const runAnimation = (
      gl: WebGLRenderingContext,
      setup: NonNullable<ReturnType<typeof initWebGL>>,
      canvas: HTMLCanvasElement,
      opts: {
        imageSrcs: string[];
        onCardTap: (src: string) => void;
        onFirstFrame?: () => void;
      }
    ) => {
    const { imageSrcs, onCardTap, onFirstFrame } = opts;

    const {
      a_center,
      a_corner,
      u_scale,
      u_cardScale,
      u_texture,
      u_aspect,
      cornerBuffer,
      centerBuffer,
      textures,
      aspects,
    } = setup;

    const cardCount = textures.length;
    const heartPoints = getHeartPoints(cardCount);
    const startPositions = heartPoints.map(() => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
    }));

    const centerData = new Float32Array(cardCount * 6 * 2);
    let startTime: number | null = null;
    let rafId: number;
    let hoveredIndex = -1;
    const currentCenters = new Array<{ x: number; y: number }>(cardCount);

    function clientToNdc(clientX: number, clientY: number): { x: number; y: number } {
      const rect = canvas.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      return { x, y };
    }

    function hitTest(ndc: { x: number; y: number }): number {
      let best = -1;
      let bestDist = HOVER_THRESHOLD;
      for (let i = 0; i < cardCount; i++) {
        const c = currentCenters[i];
        const dx = ndc.x - c.x;
        const dy = ndc.y - c.y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    }

    function render(now: number) {
      if (startTime === null) {
        startTime = now;
        onFirstFrame?.();
      }
      const elapsed = now - startTime;
      const t = Math.min(elapsed / DURATION_MS, 1);
      const eased = easeOutCubic(t);

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      for (let i = 0; i < cardCount; i++) {
        const sx = startPositions[i].x;
        const sy = startPositions[i].y;
        const ex = heartPoints[i].x;
        const ey = heartPoints[i].y;
        const cx = sx + (ex - sx) * eased;
        const cy = sy + (ey - sy) * eased;

        for (let j = 0; j < 6; j++) {
          centerData[i * 12 + j * 2] = cx;
          centerData[i * 12 + j * 2 + 1] = cy;
        }
        currentCenters[i] = { x: cx, y: cy };
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, centerData);

      gl.uniform1f(u_scale, CARD_SIZE * 0.5);
      for (let i = 0; i < cardCount; i++) {
        const ti = i % textures.length;
        const tex = textures[ti];
        const aspect = aspects[ti];
        const scale = i === hoveredIndex ? HOVER_SCALE : 1;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(u_texture, 0);
        gl.uniform1f(u_aspect, aspect);
        gl.uniform1f(u_cardScale, scale);

        gl.bindBuffer(gl.ARRAY_BUFFER, centerBuffer);
        gl.enableVertexAttribArray(a_center);
        gl.vertexAttribPointer(a_center, 2, gl.FLOAT, false, 0, i * 6 * 2 * 4);

        gl.bindBuffer(gl.ARRAY_BUFFER, cornerBuffer);
        gl.enableVertexAttribArray(a_corner);
        gl.vertexAttribPointer(a_corner, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }

      rafId = requestAnimationFrame(render);
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const ndc = clientToNdc(e.clientX, e.clientY);
      const hit = hitTest(ndc);
      if (hit !== hoveredIndex) {
        hoveredIndex = hit;
        canvas.style.cursor = hit >= 0 ? "pointer" : "default";
      }
    };

    const onPointerLeave = () => {
      hoveredIndex = -1;
      canvas.style.cursor = "default";
    };

    let touchStartHit = -1;
    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        const ndc = clientToNdc(e.clientX, e.clientY);
        touchStartHit = hitTest(ndc);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerType === "touch") {
        if (touchStartHit >= 0 && imageSrcs[touchStartHit]) {
          const ndc = clientToNdc(e.clientX, e.clientY);
          const hit = hitTest(ndc);
          if (hit === touchStartHit) {
            onCardTap(imageSrcs[touchStartHit]);
          }
        }
        touchStartHit = -1;
      } else if (e.pointerType === "mouse") {
        const ndc = clientToNdc(e.clientX, e.clientY);
        const hit = hitTest(ndc);
        if (hit >= 0 && imageSrcs[hit]) {
          onCardTap(imageSrcs[hit]);
        }
      }
    };

    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerleave", onPointerLeave);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointerup", onPointerUp);

      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio ?? 1, 2);
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
          canvas.width = w * dpr;
          canvas.height = h * dpr;
          gl.viewport(0, 0, canvas.width, canvas.height);
        }
      };
      resize();
      window.addEventListener("resize", resize);
      rafId = requestAnimationFrame(render);

      const cleanup = () => {
        window.removeEventListener("resize", resize);
        canvas.removeEventListener("pointermove", onPointerMove);
        canvas.removeEventListener("pointerleave", onPointerLeave);
        canvas.removeEventListener("pointerdown", onPointerDown);
        canvas.removeEventListener("pointerup", onPointerUp);
        cancelAnimationFrame(rafId);
        gl.getExtension("WEBGL_lose_context")?.loseContext();
      };
      return cleanup;
    };

    const rafIdInit = requestAnimationFrame(init);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafIdInit);
      cleanup?.();
    };
  }, [initWebGL]);

  if (webglError) {
    return (
      <div className="flex h-[320px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-rose-200 to-pink-300 text-center text-rose-800 dark:from-rose-900/50 dark:to-pink-900/50 dark:text-rose-200">
        <p className="text-lg">💕 Heart is assembling...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <canvas
        ref={canvasRef}
        className={`w-full bg-transparent ${fullScreen ? "h-full" : "h-[320px] rounded-2xl"}`}
        style={{ width: "100%", height: fullScreen ? "100%" : "320px" }}
      />
      {enlargedCard &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setEnlargedCard(null)}
            onKeyDown={(e) => e.key === "Escape" && setEnlargedCard(null)}
            role="button"
            tabIndex={0}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setEnlargedCard(null);
              }}
              className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white/30 md:hidden"
              aria-label="Close"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <img
              src={enlargedCard.src}
              alt="Enlarged photo"
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body
        )}
    </div>
  );
}
