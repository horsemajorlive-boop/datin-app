import { useEffect, useState } from 'react';
import { getTelegram } from '../telegram';

// ВРЕМЕННЫЙ диагностический бейдж — удалить после того, как найдём
// причину "уезжающей" строки ввода в чате на реальных телефонах.
// Три фикса подряд (синхронизация высоты, safe-area отступы, скрытие
// нижней навигации) не помогли — значит, наша гипотеза о причине неверна,
// и нужны реальные цифры с устройства пользователя, а не очередная догадка.
// Показывает сырые значения viewport/safe-area прямо на экране, чтобы
// их можно было прочитать со скриншота.

function readMetrics() {
  const tg = getTelegram();
  const root = document.documentElement;
  const cs = getComputedStyle(root);
  return {
    platform: tg?.platform ?? '—',
    version: tg?.version ?? '—',
    innerHeight: window.innerHeight,
    innerWidth: window.innerWidth,
    vvHeight: window.visualViewport?.height ?? '—',
    vvOffsetTop: window.visualViewport?.offsetTop ?? '—',
    tgViewportHeight: tg?.viewportHeight ?? '—',
    tgViewportStableHeight: tg?.viewportStableHeight ?? '—',
    tgIsExpanded: tg?.isExpanded ?? '—',
    safeTop: tg?.safeAreaInset?.top ?? '—',
    safeBottom: tg?.safeAreaInset?.bottom ?? '—',
    contentSafeTop: tg?.contentSafeAreaInset?.top ?? '—',
    contentSafeBottom: tg?.contentSafeAreaInset?.bottom ?? '—',
    cssVh: cs.getPropertyValue('--tg-vh').trim() || '—',
    cssSafeTop: cs.getPropertyValue('--tg-safe-top').trim() || '—',
    cssSafeBottom: cs.getPropertyValue('--tg-safe-bottom').trim() || '—',
  };
}

export default function DebugViewportBadge() {
  const [m, setM] = useState(readMetrics);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const update = () => {
      setM(readMetrics());
      const bar = document.querySelector('.chat__inputbar');
      setRect(bar ? bar.getBoundingClientRect() : null);
    };
    update();
    const id = setInterval(update, 1000);
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    const tg = getTelegram();
    tg?.onEvent?.('viewportChanged', update);
    tg?.onEvent?.('safeAreaChanged', update);
    tg?.onEvent?.('contentSafeAreaChanged', update);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      tg?.offEvent?.('viewportChanged', update);
      tg?.offEvent?.('safeAreaChanged', update);
      tg?.offEvent?.('contentSafeAreaChanged', update);
    };
  }, []);

  return (
    <pre
      style={{
        position: 'fixed',
        top: 2,
        left: 2,
        zIndex: 99999,
        margin: 0,
        padding: '4px 6px',
        fontSize: 9,
        lineHeight: 1.35,
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.78)',
        color: '#5f5',
        borderRadius: 6,
        maxWidth: '96vw',
        whiteSpace: 'pre-wrap',
        pointerEvents: 'none',
      }}
    >
{`platform=${m.platform} v=${m.version} expanded=${m.tgIsExpanded}
innerH=${m.innerHeight} innerW=${m.innerWidth}
vv.h=${m.vvHeight} vv.top=${m.vvOffsetTop}
tg.vpH=${m.tgViewportHeight} tg.vpStableH=${m.tgViewportStableHeight}
safeArea top=${m.safeTop} bottom=${m.safeBottom}
contentSafeArea top=${m.contentSafeTop} bottom=${m.contentSafeBottom}
css --tg-vh=${m.cssVh} --tg-safe-top=${m.cssSafeTop} --tg-safe-bottom=${m.cssSafeBottom}
inputbar.bottom=${rect ? Math.round(rect.bottom) : '—'} inputbar.top=${rect ? Math.round(rect.top) : '—'}`}
    </pre>
  );
}
