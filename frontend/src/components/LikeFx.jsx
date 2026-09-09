import { useEffect, useRef, useState } from 'react';

// "Салют" из сердечек и чатиков при лайке.
//
// Props:
//   fireKey — число, которое увеличивается на 1 при каждом лайке.
//             Меняется fireKey -> запускаем новую порцию частиц.

const ICONS = ['❤️', '💕', '💖', '💗', '💬'];

// Готовит массив частиц со случайными параметрами (разлёт, скорость, размер).
function makeParticles() {
  return Array.from({ length: 11 }, (_, i) => ({
    key: i,
    icon: ICONS[Math.floor(Math.random() * ICONS.length)],
    dx: Math.round((Math.random() - 0.5) * 180), // сдвиг по горизонтали, px
    dur: 0.9 + Math.random() * 0.7, // длительность полёта, сек
    delay: Math.random() * 0.2, // задержка старта, сек
    size: 16 + Math.round(Math.random() * 18), // размер, px
  }));
}

export default function LikeFx({ fireKey }) {
  const [bursts, setBursts] = useState([]); // список активных "порций" частиц
  const timers = useRef([]); // храним id таймеров, чтобы погасить их при выходе

  useEffect(() => {
    if (!fireKey) return; // пропускаем самый первый рендер (fireKey === 0)

    const id = fireKey; // fireKey уникален для каждого лайка — годится как id
    setBursts((list) => [...list, { id, particles: makeParticles() }]);

    // через 1.8с частицы уже улетели — убираем порцию из состояния
    const timer = setTimeout(() => {
      setBursts((list) => list.filter((b) => b.id !== id));
    }, 1800);
    timers.current.push(timer);
  }, [fireKey]);

  // Пустой массив зависимостей => функция очистки сработает при удалении компонента.
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  if (bursts.length === 0) return null;

  return (
    <div className="likefx" aria-hidden="true">
      {bursts.map((burst) => (
        <div className="likefx__burst" key={burst.id}>
          {burst.particles.map((p) => (
            <span
              key={p.key}
              className="likefx__p"
              // CSS-переменные передаём прямо в style — их подхватит @keyframes
              style={{
                '--dx': `${p.dx}px`,
                '--dur': `${p.dur}s`,
                '--delay': `${p.delay}s`,
                fontSize: `${p.size}px`,
              }}
            >
              {p.icon}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}
