"use client";

import { useEffect, useRef } from "react";

export default function NeuralBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let W = 0, H = 0;
    const mouse = { x: -999, y: -999 };
    const NODE_COUNT = 40;
    const CONNECT_DIST = 180;
    const MOUSE_RADIUS = 160;

    const resize = () => {
      const parent = canvas!.parentElement;
      if (!parent) return;
      W = canvas!.width = parent.clientWidth;
      H = canvas!.height = parent.clientHeight;
    };
    resize();

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 200); };
    window.addEventListener("resize", onResize);

    const onMouseMove = (e: MouseEvent) => {
      const parent = canvas!.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    document.addEventListener("mousemove", onMouseMove);

    const nodes: Array<{
      x: number; y: number; vx: number; vy: number;
      radius: number; baseRadius: number;
      pulsePhase: number; pulseSpeed: number;
      color: { r: number; g: number; b: number };
      activation: number;
    }> = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      const r = Math.random();
      let color: { r: number; g: number; b: number };
      if (r < 0.4) color = { r: 0, g: 240, b: 255 };
      else if (r < 0.7) color = { r: 139, g: 92, b: 246 };
      else if (r < 0.9) color = { r: 236, g: 72, b: 153 };
      else color = { r: 16, g: 185, b: 129 };

      nodes.push({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35, vy: (Math.random() - 0.5) * 0.35,
        radius: Math.random() * 1.5 + 0.8, baseRadius: Math.random() * 1.5 + 0.8,
        pulsePhase: Math.random() * Math.PI * 2, pulseSpeed: 0.015 + Math.random() * 0.015,
        color, activation: 0,
      });
    }

    let pulses: Array<{
      from: typeof nodes[0]; to: typeof nodes[0]; t: number; speed: number; color: string;
    }> = [];

    let animId: number;
    const animate = () => {
      ctx!.clearRect(0, 0, W, H);

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < CONNECT_DIST) {
            const alpha = (1 - dist / CONNECT_DIST) * 0.06;
            const act = Math.max(nodes[i].activation, nodes[j].activation);
            const finalAlpha = alpha + act * 0.1;
            const ci = nodes[i].color, cj = nodes[j].color;
            const grad = ctx!.createLinearGradient(nodes[i].x, nodes[i].y, nodes[j].x, nodes[j].y);
            grad.addColorStop(0, `rgba(${ci.r},${ci.g},${ci.b},${finalAlpha})`);
            grad.addColorStop(1, `rgba(${cj.r},${cj.g},${cj.b},${finalAlpha})`);
            ctx!.beginPath();
            ctx!.moveTo(nodes[i].x, nodes[i].y);
            ctx!.lineTo(nodes[j].x, nodes[j].y);
            ctx!.strokeStyle = grad;
            ctx!.lineWidth = 0.5 + act * 0.8;
            ctx!.stroke();

            if (act > 0.3 && Math.random() < 0.003) {
              const pr = Math.random();
              const pc = pr < 0.5 ? "0,240,255" : pr < 0.8 ? "139,92,246" : "236,72,153";
              pulses.push({ from: nodes[i], to: nodes[j], t: 0, speed: 0.01 + Math.random() * 0.02, color: pc });
            }
          }
        }
      }

      for (const n of nodes) {
        n.x += n.vx; n.y += n.vy; n.pulsePhase += n.pulseSpeed;
        const dx = mouse.x - n.x, dy = mouse.y - n.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_RADIUS && dist > 0) {
          const force = (MOUSE_RADIUS - dist) / MOUSE_RADIUS;
          if (dist > 50) { n.vx += (dx / dist) * force * 0.006; n.vy += (dy / dist) * force * 0.006; }
          else { n.vx -= (dx / dist) * force * 0.02; n.vy -= (dy / dist) * force * 0.02; }
          n.activation = Math.min(1, n.activation + 0.04);
        } else { n.activation = Math.max(0, n.activation - 0.008); }
        n.vx *= 0.99; n.vy *= 0.99;
        if (n.x < 0 || n.x > W) n.vx *= -1;
        if (n.y < 0 || n.y > H) n.vy *= -1;
        n.x = Math.max(0, Math.min(W, n.x));
        n.y = Math.max(0, Math.min(H, n.y));
        n.radius = n.baseRadius + Math.sin(n.pulsePhase) * 0.4 + n.activation * 1.5;
        const { r, g, b } = n.color;
        const alpha = 0.25 + n.activation * 0.45;
        if (n.activation > 0.1) {
          ctx!.beginPath(); ctx!.arc(n.x, n.y, n.radius * 3.5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(${r},${g},${b},${n.activation * 0.06})`; ctx!.fill();
        }
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${r},${g},${b},${alpha})`; ctx!.fill();
      }

      pulses = pulses.filter(p => {
        p.t += p.speed;
        if (p.t >= 1) return false;
        const x = p.from.x + (p.to.x - p.from.x) * p.t;
        const y = p.from.y + (p.to.y - p.from.y) * p.t;
        const alpha = Math.sin(p.t * Math.PI) * 0.7;
        ctx!.beginPath(); ctx!.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.color},${alpha})`; ctx!.fill();
        ctx!.beginPath(); ctx!.arc(x, y, 4, 0, Math.PI * 2);
        ctx!.fillStyle = `rgba(${p.color},${alpha * 0.15})`; ctx!.fill();
        return true;
      });
      if (pulses.length > 60) pulses = pulses.slice(-40);

      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ zIndex: 0, opacity: "var(--neural-opacity)", transition: "opacity 0.5s", pointerEvents: "none" }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      {/* Nebula glows */}
      <div className="absolute w-[800px] h-[800px] rounded-full -top-[20%] -left-[10%]" style={{ background: "radial-gradient(circle, rgba(0,240,255,0.04), transparent 70%)", filter: "blur(120px)", animation: "nebulaDrift1 25s ease-in-out infinite" }} />
      <div className="absolute w-[600px] h-[600px] rounded-full -bottom-[10%] -right-[5%]" style={{ background: "radial-gradient(circle, rgba(139,92,246,0.05), transparent 70%)", filter: "blur(120px)", animation: "nebulaDrift2 30s ease-in-out infinite" }} />
      <div className="absolute w-[500px] h-[500px] rounded-full top-[50%] left-[40%]" style={{ background: "radial-gradient(circle, rgba(236,72,153,0.03), transparent 70%)", filter: "blur(120px)", animation: "nebulaDrift1 20s ease-in-out infinite reverse" }} />
    </div>
  );
}
