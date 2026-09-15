export default function Splash({ fading }) {
  return (
    <div className={`splash${fading ? ' splash--out' : ''}`}>
      <svg
        className="splash__mark"
        viewBox="0 0 200 200"
        width="96"
        height="96"
        role="img"
        aria-label="TiAmo"
      >
        <defs>
          <linearGradient id="splashGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f0d9a0" />
            <stop offset="1" stopColor="#d8687a" />
          </linearGradient>
        </defs>
        <path
          d="M132,100 A38,38 0 1,0 78,132 A28,28 0 1,1 132,100 Z"
          fill="url(#splashGrad)"
        />
        <path
          d="M142,60 C144,65 148,68 153,69 C148,70 144,73 142,78 C140,73 136,70 131,69 C136,68 140,65 142,60 Z"
          fill="#e3b567"
        />
      </svg>
      <div className="splash__word">TIAMO</div>
    </div>
  );
}
