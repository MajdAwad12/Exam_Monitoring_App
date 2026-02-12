// client/src/components/loading/RocketLoader.jsx
// NOTE: kept filename/export to avoid breaking existing imports.
// CHANGE: removed the “glass card” layout and returned to a full-screen center loader
// with a modern moon/star orbit (no dependencies).

export default function RocketLoader({ label = "Loading" } = {}) {
  return (
    <div className="rl-root" role="status" aria-label={label}>
      {/* background */}
      <div aria-hidden="true" className="rl-bg">
        <div className="rl-blob rl-blob-a" />
        <div className="rl-blob rl-blob-b" />
        <div className="rl-grid" />
        <div className="rl-stars" />
      </div>

      {/* center loader (no card) */}
      <div className="rl-center">
        <div className="rl-orbitSystem" aria-hidden="true">
          {/* orbit ring */}
          <div className="rl-orbitRing" />

          {/* subtle orbit glow */}
          <div className="rl-orbitGlow" />

          {/* center “moon / planet” */}
          <div className="rl-planet">
            <div className="rl-planetShine" />
            <div className="rl-planetShadow" />
            <div className="rl-craters" />
          </div>

          {/* orbiting star */}
          <div className="rl-orbit rl-orbit-fast">
            <div className="rl-star" />
          </div>

          {/* orbiting tiny moon */}
          <div className="rl-orbit rl-orbit-slow">
            <div className="rl-miniMoon" />
          </div>
        </div>

        <div className="rl-text">
          <div className="rl-title">{label}</div>
          <div className="rl-sub">Loading seats, events & live data…</div>
        </div>

        {/* minimal baseline shimmer (optional but modern) */}
        <div className="rl-bars" aria-hidden="true">
          <div className="rl-bar rl-bar1" />
          <div className="rl-bar rl-bar2" />
          <div className="rl-bar rl-bar3" />
        </div>

        <div className="rl-dots" aria-hidden="true">
          <span className="rl-dot" />
          <span className="rl-dot rl-dot2" />
          <span className="rl-dot rl-dot3" />
        </div>

        <div className="sr-only">
          If animations are distracting, enable reduced motion in your OS accessibility settings.
        </div>
      </div>

      <style>{`
        /* =========================
           Root + Background
        ========================== */
        .rl-root{
          position: relative;
          width: 100%;
          min-height: 62vh;
          overflow: hidden;
          background: #ffffff;
        }
        :global(.dark) .rl-root{
          background: rgb(2 6 23); /* slate-950 */
        }

        .rl-bg{
          position:absolute;
          inset:0;
          pointer-events:none;
        }

        .rl-blob{
          position:absolute;
          border-radius:9999px;
          filter: blur(48px);
          opacity: 0.9;
        }
        .rl-blob-a{
          width: 520px; height: 520px;
          left: -240px; top: -260px;
          background: rgba(148,163,184,0.45);
        }
        .rl-blob-b{
          width: 640px; height: 640px;
          right: -320px; bottom: -340px;
          background: rgba(226,232,240,0.55);
        }
        :global(.dark) .rl-blob-a{
          background: rgba(30,41,59,0.55);
          opacity: 0.85;
        }
        :global(.dark) .rl-blob-b{
          background: rgba(15,23,42,0.70);
          opacity: 0.9;
        }

        .rl-grid{
          position:absolute;
          inset:0;
          opacity: 0.10;
          background-image:
            linear-gradient(to right, rgba(148,163,184,0.35) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148,163,184,0.35) 1px, transparent 1px);
          background-size: 42px 42px;
          mask-image: radial-gradient(closest-side at 50% 45%, black 0%, transparent 78%);
          -webkit-mask-image: radial-gradient(closest-side at 50% 45%, black 0%, transparent 78%);
        }
        :global(.dark) .rl-grid{
          opacity: 0.08;
          background-image:
            linear-gradient(to right, rgba(148,163,184,0.22) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148,163,184,0.22) 1px, transparent 1px);
        }

        .rl-stars{
          position:absolute;
          inset:0;
          opacity: 0.55;
          background-image:
            radial-gradient(1px 1px at 12% 18%, rgba(255,255,255,0.75) 50%, transparent 55%),
            radial-gradient(1px 1px at 22% 62%, rgba(255,255,255,0.55) 50%, transparent 55%),
            radial-gradient(1px 1px at 38% 30%, rgba(255,255,255,0.65) 50%, transparent 55%),
            radial-gradient(1px 1px at 58% 18%, rgba(255,255,255,0.55) 50%, transparent 55%),
            radial-gradient(1px 1px at 66% 58%, rgba(255,255,255,0.60) 50%, transparent 55%),
            radial-gradient(1px 1px at 78% 28%, rgba(255,255,255,0.52) 50%, transparent 55%),
            radial-gradient(1px 1px at 86% 74%, rgba(255,255,255,0.60) 50%, transparent 55%),
            radial-gradient(2px 2px at 72% 44%, rgba(255,255,255,0.22) 45%, transparent 55%);
          animation: rlTwinkle 6.5s ease-in-out infinite;
          filter: blur(0.15px);
        }
        :global(.dark) .rl-stars{
          opacity: 0.75;
          animation-duration: 7.5s;
        }

        @keyframes rlTwinkle{
          0%,100%{ opacity: 0.52; transform: translateY(0); }
          50%{ opacity: 0.76; transform: translateY(-2px); }
        }

        /* =========================
           Center Content (no card)
        ========================== */
        .rl-center{
          position: relative;
          min-height: 62vh;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:center;
          padding: 24px 20px;
          text-align:center;
        }

        /* =========================
           Orbit System
        ========================== */
        .rl-orbitSystem{
          position: relative;
          width: 120px;
          height: 120px;
          display:grid;
          place-items:center;
        }

        .rl-orbitRing{
          position:absolute;
          inset: 14px;
          border-radius:9999px;
          border: 1px solid rgba(148,163,184,0.35);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.10);
          opacity: 0.85;
        }
        :global(.dark) .rl-orbitRing{
          border-color: rgba(148,163,184,0.22);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }

        .rl-orbitGlow{
          position:absolute;
          inset: 0;
          border-radius:9999px;
          background: radial-gradient(circle at 50% 50%, rgba(99,102,241,0.12), transparent 60%);
          filter: blur(10px);
          opacity: 0.9;
        }
        :global(.dark) .rl-orbitGlow{
          background: radial-gradient(circle at 50% 50%, rgba(99,102,241,0.16), transparent 60%);
          opacity: 1;
        }

        .rl-planet{
          position: relative;
          width: 44px;
          height: 44px;
          border-radius:9999px;
          background:
            radial-gradient(circle at 28% 26%, rgba(255,255,255,0.40), transparent 38%),
            radial-gradient(circle at 40% 40%, rgba(226,232,240,0.95), rgba(148,163,184,0.60) 62%, rgba(2,6,23,0.10) 100%);
          box-shadow:
            0 18px 40px -26px rgba(2,6,23,0.35),
            inset 0 0 0 1px rgba(255,255,255,0.20);
          overflow:hidden;
          z-index: 2;
        }
        :global(.dark) .rl-planet{
          background:
            radial-gradient(circle at 28% 26%, rgba(255,255,255,0.18), transparent 38%),
            radial-gradient(circle at 40% 40%, rgba(226,232,240,0.55), rgba(148,163,184,0.30) 62%, rgba(0,0,0,0.35) 100%);
          box-shadow:
            0 20px 46px -28px rgba(0,0,0,0.70),
            inset 0 0 0 1px rgba(255,255,255,0.10);
        }

        .rl-planetShine{
          position:absolute;
          left:-8px;
          top:-10px;
          width: 24px;
          height: 24px;
          border-radius:9999px;
          background: rgba(255,255,255,0.22);
          filter: blur(3px);
        }
        .rl-planetShadow{
          position:absolute;
          right:-12px;
          bottom:-12px;
          width: 30px;
          height: 30px;
          border-radius:9999px;
          background: rgba(0,0,0,0.12);
          filter: blur(10px);
        }
        :global(.dark) .rl-planetShadow{
          background: rgba(0,0,0,0.28);
        }

        .rl-craters{
          position:absolute;
          inset:0;
          background:
            radial-gradient(6px 6px at 38% 55%, rgba(100,116,139,0.20), transparent 62%),
            radial-gradient(5px 5px at 60% 38%, rgba(100,116,139,0.18), transparent 62%),
            radial-gradient(4px 4px at 58% 68%, rgba(100,116,139,0.14), transparent 62%),
            radial-gradient(3px 3px at 44% 32%, rgba(100,116,139,0.12), transparent 62%);
          opacity: 0.85;
          mix-blend-mode: multiply;
        }
        :global(.dark) .rl-craters{
          opacity: 0.55;
          mix-blend-mode: normal;
        }

        .rl-orbit{
          position:absolute;
          inset:0;
          transform-origin: 50% 50%;
          z-index: 3;
        }
        .rl-orbit-fast{ animation: rlOrbit 1.05s cubic-bezier(.55,.02,.45,.99) infinite; }
        .rl-orbit-slow{ animation: rlOrbit 1.9s linear infinite reverse; opacity: 0.92; }

        @keyframes rlOrbit{
          0%{ transform: rotate(0deg); }
          100%{ transform: rotate(360deg); }
        }

        /* orbiting “star” */
        .rl-star{
          position:absolute;
          left: 50%;
          top: 50%;
          width: 10px;
          height: 10px;
          transform: translate(-50%, -50%) translateX(44px);
          border-radius: 4px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(99,102,241,0.55) 55%, rgba(99,102,241,0.00) 100%);
          box-shadow: 0 16px 30px -22px rgba(2,6,23,0.35);
          clip-path: polygon(50% 0%, 62% 38%, 100% 50%, 62% 62%, 50% 100%, 38% 62%, 0% 50%, 38% 38%);
          filter: drop-shadow(0 6px 12px rgba(99,102,241,0.12));
        }
        :global(.dark) .rl-star{
          box-shadow: 0 18px 34px -26px rgba(0,0,0,0.75);
          filter: drop-shadow(0 10px 20px rgba(99,102,241,0.16));
        }

        /* orbiting mini moon */
        .rl-miniMoon{
          position:absolute;
          left: 50%;
          top: 50%;
          width: 7px;
          height: 7px;
          transform: translate(-50%, -50%) translateX(32px) translateY(8px);
          border-radius: 9999px;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.88), rgba(226,232,240,0.58) 55%, rgba(148,163,184,0.30) 100%);
          box-shadow: 0 14px 26px -22px rgba(2,6,23,0.30);
          opacity: 0.9;
        }
        :global(.dark) .rl-miniMoon{
          box-shadow: 0 18px 30px -24px rgba(0,0,0,0.75);
          opacity: 0.85;
        }

        /* =========================
           Text + minimal bars
        ========================== */
        .rl-text{ margin-top: 12px; }
        .rl-title{
          font-size: 14px;
          font-weight: 800;
          color: rgb(15 23 42);
          letter-spacing: 0.2px;
        }
        :global(.dark) .rl-title{ color: rgb(241 245 249); }

        .rl-sub{
          margin-top: 4px;
          font-size: 12px;
          font-weight: 600;
          color: rgb(100 116 139);
        }
        :global(.dark) .rl-sub{ color: rgb(148 163 184); }

        .rl-bars{
          margin-top: 16px;
          width: min(520px, 92vw);
          display:flex;
          flex-direction:column;
          gap: 10px;
          align-items:center;
        }
        .rl-bar{
          height: 10px;
          border-radius: 9999px;
          background: rgba(148,163,184,0.16);
          position: relative;
          overflow:hidden;
        }
        :global(.dark) .rl-bar{ background: rgba(148,163,184,0.12); }

        .rl-bar::after{
          content:"";
          position:absolute;
          inset:0;
          transform: translateX(-55%);
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.62), transparent);
          animation: rlShimmer 1.15s ease-in-out infinite;
        }
        :global(.dark) .rl-bar::after{
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
        }

        .rl-bar1{ width: 92%; }
        .rl-bar2{ width: 82%; }
        .rl-bar3{ width: 72%; }

        @keyframes rlShimmer{
          0%{ transform: translateX(-55%); }
          60%{ transform: translateX(55%); }
          100%{ transform: translateX(55%); }
        }

        /* dots */
        .rl-dots{
          margin-top: 14px;
          display:flex;
          gap: 8px;
          align-items:center;
          justify-content:center;
        }
        .rl-dot{
          width: 7px;
          height: 7px;
          border-radius: 9999px;
          background: rgba(99,102,241,0.40);
          animation: rlBounce 1.0s ease-in-out infinite;
        }
        .rl-dot2{ animation-delay: 0.12s; opacity: 0.65; }
        .rl-dot3{ animation-delay: 0.24s; opacity: 0.45; }

        @keyframes rlBounce{
          0%,100%{ transform: translateY(0); }
          50%{ transform: translateY(-3px); }
        }

        /* keep old skeleton class compatibility if used elsewhere */
        .skeleton{
          position: relative;
          overflow: hidden;
          background: rgba(148, 163, 184, 0.18);
        }
        :global(.dark) .skeleton{
          background: rgba(148, 163, 184, 0.14);
        }

        @media (prefers-reduced-motion: reduce){
          .rl-stars, .rl-orbit-fast, .rl-orbit-slow, .rl-bar::after, .rl-dot { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
