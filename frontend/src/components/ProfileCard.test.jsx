import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRef } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ProfileCard from './ProfileCard';

const profile = {
  id: 1,
  name: 'Аня',
  age: 24,
  city: 'Москва',
  interests: [],
  photos: ['/uploads/1.jpg', '/uploads/2.jpg'],
};

// Курсор при down/up. jsdom не считает раскладку (getBoundingClientRect даёт
// одни нули), поэтому "тап в левую половину" карточки — это просто
// отрицательный clientX (см. handlePointerUp: localX = clientX - rect.left).
//
// ВАЖНО: три fireEvent идут БЕЗ общего act() — каждый fireEvent уже сам
// оборачивается в act() внутри RTL и синхронно проталкивает ре-рендер.
// Если обернуть все три в один act(), React батчит их в один рендер, и
// handlePointerMove/handlePointerUp читают drag из ЗАМЫКАНИЯ предыдущего
// рендера — жест перестаёт распознаваться (проверено экспериментально).
function drag(el, { downX = 0, downY = 0, moveX = downX, moveY = downY } = {}) {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: downX, clientY: downY });
  fireEvent.pointerMove(el, { pointerId: 1, clientX: moveX, clientY: moveY });
  fireEvent.pointerUp(el, { pointerId: 1, clientX: moveX, clientY: moveY });
}

function renderCard(props = {}) {
  const onSwipeAttempt = vi.fn(() => true);
  const onFlyEnd = vi.fn();
  const onOpen = vi.fn();
  const onSuperlikeIntent = vi.fn();
  const utils = render(
    <ProfileCard
      profile={profile}
      active
      onSwipeAttempt={onSwipeAttempt}
      onFlyEnd={onFlyEnd}
      onOpen={onOpen}
      onSuperlikeIntent={onSuperlikeIntent}
      {...props}
    />
  );
  const card = utils.container.querySelector('.card');
  return { ...utils, card, onSwipeAttempt, onFlyEnd, onOpen, onSuperlikeIntent };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('ProfileCard — тап по фото', () => {
  test('тап в правую половину листает вперёд', () => {
    const { card } = renderCard();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    drag(card, { downX: 300 });
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
  });

  test('тап в левую половину листает назад (после того как уже пролистали)', () => {
    const { card } = renderCard();
    drag(card, { downX: 300 }); // сначала на 2-е фото
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    drag(card, { downX: -10 });
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  test('тап не считается свайпом — onSwipeAttempt/onFlyEnd не вызываются', () => {
    const { card, onSwipeAttempt, onFlyEnd } = renderCard();
    drag(card, { downX: 300 });
    expect(onSwipeAttempt).not.toHaveBeenCalled();
    expect(onFlyEnd).not.toHaveBeenCalled();
  });
});

describe('ProfileCard — свайп вбок', () => {
  test('свайп вправо дальше порога запускает startFly и после FLY_MS зовёт onFlyEnd', () => {
    const { card, onSwipeAttempt, onFlyEnd } = renderCard();
    drag(card, { downX: 0, moveX: 150 }); // > SWIPE_THRESHOLD (120)
    expect(onSwipeAttempt).toHaveBeenCalledWith('right', {});
    expect(onFlyEnd).not.toHaveBeenCalled(); // ещё летит
    act(() => vi.advanceTimersByTime(300));
    expect(onFlyEnd).toHaveBeenCalledWith('right', {});
  });

  test('свайп влево дальше порога — симметрично, direction "left"', () => {
    const { card, onSwipeAttempt, onFlyEnd } = renderCard();
    drag(card, { downX: 0, moveX: -150 });
    expect(onSwipeAttempt).toHaveBeenCalledWith('left', {});
    act(() => vi.advanceTimersByTime(300));
    expect(onFlyEnd).toHaveBeenCalledWith('left', {});
  });

  test('если onSwipeAttempt отказал (лимит) — onFlyEnd не вызывается', () => {
    const { card, onFlyEnd } = renderCard({ onSwipeAttempt: vi.fn(() => false) });
    drag(card, { downX: 0, moveX: 150 });
    act(() => vi.advanceTimersByTime(300));
    expect(onFlyEnd).not.toHaveBeenCalled();
  });

  test('свайп короче порога — карточка пружинит назад, никакие колбэки не зовутся', () => {
    const { card, onSwipeAttempt, onFlyEnd, onSuperlikeIntent } = renderCard();
    drag(card, { downX: 0, moveX: 50 }); // меньше SWIPE_THRESHOLD, больше TAP_MAX_MOVE
    expect(onSwipeAttempt).not.toHaveBeenCalled();
    expect(onFlyEnd).not.toHaveBeenCalled();
    expect(onSuperlikeIntent).not.toHaveBeenCalled();
  });

  test('неактивная карточка (active=false) игнорирует перетаскивание', () => {
    const { card, onSwipeAttempt } = renderCard({ active: false });
    drag(card, { downX: 0, moveX: 150 });
    expect(onSwipeAttempt).not.toHaveBeenCalled();
  });
});

describe('ProfileCard — свайп вверх (намерение на суперлайк)', () => {
  test('преимущественно вертикальный свайп вверх зовёт onSuperlikeIntent и НЕ улетает', () => {
    const { card, onSuperlikeIntent, onSwipeAttempt, onFlyEnd } = renderCard();
    drag(card, { downX: 0, downY: 0, moveX: 0, moveY: -100 }); // > SWIPE_UP_THRESHOLD (90)
    expect(onSuperlikeIntent).toHaveBeenCalledOnce();
    expect(onSwipeAttempt).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(300));
    expect(onFlyEnd).not.toHaveBeenCalled();
  });

  test('диагональный жест, где горизонталь больше вертикали, — обычный свайп вбок, не суперлайк', () => {
    const { card, onSuperlikeIntent, onSwipeAttempt } = renderCard();
    drag(card, { downX: 0, downY: 0, moveX: 150, moveY: -100 });
    expect(onSuperlikeIntent).not.toHaveBeenCalled();
    expect(onSwipeAttempt).toHaveBeenCalledWith('right', {});
  });
});

describe('ProfileCard — императивный swipe() (кнопки под колодой)', () => {
  test('ref.swipe("right", meta) идёт тем же путём, что и жест пальцем', () => {
    const ref = createRef();
    const onSwipeAttempt = vi.fn(() => true);
    const onFlyEnd = vi.fn();
    render(
      <ProfileCard
        ref={ref}
        profile={profile}
        active
        onSwipeAttempt={onSwipeAttempt}
        onFlyEnd={onFlyEnd}
        onOpen={vi.fn()}
      />
    );
    act(() => ref.current.swipe('right', { isSuper: true }));
    expect(onSwipeAttempt).toHaveBeenCalledWith('right', { isSuper: true });
    act(() => vi.advanceTimersByTime(300));
    expect(onFlyEnd).toHaveBeenCalledWith('right', { isSuper: true });
  });
});
