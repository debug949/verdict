'use client'

import { useEffect, useRef } from 'react'

const LERP_DOT  = 0.18
const LERP_RING = 0.10
const RING_SIZE = 38

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

export function VerdictCursor() {
  const dotRef   = useRef<HTMLDivElement>(null)
  const ringRef  = useRef<HTMLDivElement>(null)
  const burstRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const dot   = dotRef.current!
    const ring  = ringRef.current!
    const burst = burstRef.current!

    let mx = -200, my = -200
    let dx = -200, dy = -200
    let rx = -200, ry = -200
    let raf = 0
    let hovering = false

    const INTERACTIVE = 'a, button, input, textarea, select, [role="button"], label, [tabindex]'

    function getNearestInteractive(target: EventTarget | null) {
      if (!(target instanceof Element)) return null
      return target.closest(INTERACTIVE) as HTMLElement | null
    }

    function onMove(e: MouseEvent) {
      mx = e.clientX
      my = e.clientY

      const el = getNearestInteractive(e.target)
      hovering = !!el

      if (el) {
        ring.style.width  = `${RING_SIZE + 10}px`
        ring.style.height = `${RING_SIZE + 10}px`
        ring.style.borderColor = 'rgba(232,48,74,0.55)'
        ring.style.boxShadow = '0 0 14px rgba(232,48,74,0.20)'
      } else {
        ring.style.width  = `${RING_SIZE}px`
        ring.style.height = `${RING_SIZE}px`
        ring.style.borderColor = 'rgba(232,48,74,0.40)'
        ring.style.boxShadow = '0 0 8px rgba(232,48,74,0.12)'
      }
    }

    function onClick(e: MouseEvent) {
      burst.style.left = `${e.clientX}px`
      burst.style.top  = `${e.clientY}px`
      burst.style.animation = 'none'
      // Force reflow
      void burst.offsetWidth
      burst.style.animation = 'verdict-burst 0.42s cubic-bezier(0.22,1,0.36,1) forwards'
    }

    function onLeave() {
      mx = -200; my = -200
    }

    function tick() {
      dx = lerp(dx, mx, LERP_DOT)
      dy = lerp(dy, my, LERP_DOT)

      let targetX = mx, targetY = my
      if (hovering) {
        // Magnetic: pull ring center toward midpoint between ring and cursor
        targetX = lerp(rx, mx, 0.30)
        targetY = lerp(ry, my, 0.30)
      }
      rx = lerp(rx, targetX, LERP_RING)
      ry = lerp(ry, targetY, LERP_RING)

      dot.style.transform  = `translate(${dx - 3}px, ${dy - 3}px)`
      ring.style.transform = `translate(${rx - RING_SIZE / 2}px, ${ry - RING_SIZE / 2}px)`

      raf = requestAnimationFrame(tick)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('click', onClick)
    document.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('click', onClick)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <>
      <style>{`
        .verdict-cursor-dot {
          position: fixed; top: 0; left: 0; z-index: 9999;
          width: 6px; height: 6px; border-radius: 50%;
          background: #e8304a;
          pointer-events: none; will-change: transform;
          box-shadow: 0 0 6px rgba(232,48,74,0.6);
        }
        .verdict-cursor-ring {
          position: fixed; top: 0; left: 0; z-index: 9998;
          width: ${RING_SIZE}px; height: ${RING_SIZE}px; border-radius: 50%;
          border: 1.5px solid rgba(232,48,74,0.40);
          box-shadow: 0 0 8px rgba(232,48,74,0.12);
          pointer-events: none; will-change: transform;
          transition: width 0.18s cubic-bezier(0.34,1.56,0.64,1),
                      height 0.18s cubic-bezier(0.34,1.56,0.64,1),
                      border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .verdict-cursor-burst {
          position: fixed; top: 0; left: 0; z-index: 9997;
          width: 40px; height: 40px; border-radius: 50%;
          pointer-events: none; transform: translate(-50%,-50%);
          background: radial-gradient(circle, rgba(232,48,74,0.35) 0%, transparent 70%);
        }
        @keyframes verdict-burst {
          0%   { transform: translate(-50%,-50%) scale(0.3); opacity: 0.8; }
          60%  { transform: translate(-50%,-50%) scale(2.2); opacity: 0.3; }
          100% { transform: translate(-50%,-50%) scale(3.0); opacity: 0; }
        }
        body { cursor: none; }
        a, button, input, textarea, select,
        [role="button"], label, [tabindex] { cursor: none; }
      `}</style>
      <div ref={dotRef}   className="verdict-cursor-dot"   aria-hidden="true" />
      <div ref={ringRef}  className="verdict-cursor-ring"  aria-hidden="true" />
      <div ref={burstRef} className="verdict-cursor-burst" aria-hidden="true" />
    </>
  )
}
