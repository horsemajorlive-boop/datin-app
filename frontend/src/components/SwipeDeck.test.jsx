import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import SwipeDeck from './SwipeDeck';

const profiles = [
  { id: 1, name: 'Аня', age: 24, city: '', interests: [], photos: ['/uploads/1.jpg'] },
  { id: 2, name: 'Боря', age: 26, city: '', interests: [], photos: ['/uploads/2.jpg'] },
];

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => vi.useRealTimers());

describe('SwipeDeck — пустая лента', () => {
  test('показывает заглушку "Анкеты закончились", кнопки задизейблены', () => {
    render(<SwipeDeck profiles={[]} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={vi.fn()} />);
    expect(screen.getByText('Анкеты закончились')).toBeInTheDocument();
    expect(screen.getByLabelText('Пропустить')).toBeDisabled();
    expect(screen.getByLabelText('Суперлайк')).toBeDisabled();
    expect(screen.getByLabelText('Лайк')).toBeDisabled();
  });
});

describe('SwipeDeck — кнопки под колодой', () => {
  test('кнопка "Пропустить" в итоге зовёт onSwipe(profile, "pass", ...)', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck profiles={profiles} onSwipe={onSwipe} onOpen={vi.fn()} onHint={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Пропустить'));
    act(() => vi.advanceTimersByTime(300)); // FLY_MS в ProfileCard
    expect(onSwipe).toHaveBeenCalledWith(profiles[0], 'pass', { isSuper: false, message: undefined });
  });

  test('кнопка "Лайк" зовёт onSwipe(profile, "like", { isSuper: false })', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck profiles={profiles} onSwipe={onSwipe} onOpen={vi.fn()} onHint={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Лайк'));
    act(() => vi.advanceTimersByTime(300));
    expect(onSwipe).toHaveBeenCalledWith(profiles[0], 'like', { isSuper: false, message: undefined });
  });

  test('кнопка "Лайк" задизейблена, когда лимит исчерпан', () => {
    render(<SwipeDeck profiles={profiles} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={vi.fn()} likesLeft={0} />);
    expect(screen.getByLabelText('Лайк')).toBeDisabled();
  });

  test('свайп фиксируется по ТЕКУЩЕЙ верхней карточке — после хода индекс сдвигается', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck profiles={profiles} onSwipe={onSwipe} onOpen={vi.fn()} onHint={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Пропустить'));
    act(() => vi.advanceTimersByTime(300));
    fireEvent.click(screen.getByLabelText('Лайк'));
    act(() => vi.advanceTimersByTime(300));
    expect(onSwipe).toHaveBeenNthCalledWith(1, profiles[0], 'pass', { isSuper: false, message: undefined });
    expect(onSwipe).toHaveBeenNthCalledWith(2, profiles[1], 'like', { isSuper: false, message: undefined });
  });
});

describe('SwipeDeck — суперлайк с сообщением', () => {
  test('кнопка "Суперлайк" открывает составление сообщения, не свайпает карточку сразу', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck profiles={profiles} onSwipe={onSwipe} onOpen={vi.fn()} onHint={vi.fn()} superlikesLeft={1} />);
    fireEvent.click(screen.getByLabelText('Суперлайк'));
    expect(screen.getByText('Суперлайк для Аня')).toBeInTheDocument();
    expect(onSwipe).not.toHaveBeenCalled();
  });

  test('подтверждение композера отправляет суперлайк с текстом сообщения', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck profiles={profiles} onSwipe={onSwipe} onOpen={vi.fn()} onHint={vi.fn()} superlikesLeft={1} />);
    fireEvent.click(screen.getByLabelText('Суперлайк'));
    fireEvent.change(screen.getByPlaceholderText(/необязательно/), { target: { value: 'Привет!' } });
    fireEvent.click(screen.getByText('Отправить суперлайк'));
    act(() => vi.advanceTimersByTime(300));
    expect(onSwipe).toHaveBeenCalledWith(profiles[0], 'like', { isSuper: true, message: 'Привет!' });
  });

  test('отмена композера не свайпает карточку и не зовёт onSwipe', () => {
    const onSwipe = vi.fn();
    render(<SwipeDeck profiles={profiles} onSwipe={onSwipe} onOpen={vi.fn()} onHint={vi.fn()} superlikesLeft={1} />);
    fireEvent.click(screen.getByLabelText('Суперлайк'));
    fireEvent.click(screen.getByText('Отмена'));
    expect(screen.queryByText('Суперлайк для Аня')).toBeNull();
    act(() => vi.advanceTimersByTime(300));
    expect(onSwipe).not.toHaveBeenCalled();
  });

  test('исчерпанный лимит суперлайков не открывает композер, а зовёт onHint', () => {
    const onHint = vi.fn();
    render(
      <SwipeDeck profiles={profiles} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={onHint} superlikesLeft={0} isPremium={false} />
    );
    fireEvent.click(screen.getByLabelText('Суперлайк'));
    expect(screen.queryByText('Суперлайк для Аня')).toBeNull();
    expect(onHint).toHaveBeenCalledWith({
      text: 'Суперлайки на сегодня закончились',
      cta: 'Оформить Premium — 5 в день',
    });
  });

  test('исчерпанный лимит у Premium показывает другой текст подсказки (без CTA)', () => {
    const onHint = vi.fn();
    render(
      <SwipeDeck profiles={profiles} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={onHint} superlikesLeft={0} isPremium />
    );
    fireEvent.click(screen.getByLabelText('Суперлайк'));
    expect(onHint).toHaveBeenCalledWith('Суперлайк на сегодня уже использован');
  });
});

describe('SwipeDeck — свайп вверх открывает тот же композер', () => {
  test('смахивание верхней карточки вверх открывает составление суперлайка', () => {
    const onSwipe = vi.fn();
    const { container } = render(
      <SwipeDeck profiles={profiles} onSwipe={onSwipe} onOpen={vi.fn()} onHint={vi.fn()} superlikesLeft={1} />
    );
    const card = container.querySelector('.card');
    fireEvent.pointerDown(card, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(card, { pointerId: 1, clientX: 0, clientY: -100 });
    fireEvent.pointerUp(card, { pointerId: 1, clientX: 0, clientY: -100 });
    expect(screen.getByText('Суперлайк для Аня')).toBeInTheDocument();
  });
});

describe('SwipeDeck — разовая подсказка про кнопку суперлайка', () => {
  test('показывается один раз и помечает localStorage', () => {
    render(<SwipeDeck profiles={profiles} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={vi.fn()} />);
    expect(screen.getByText(/Суперлайк — заметная симпатия/)).toBeInTheDocument();
    expect(localStorage.getItem('superlike-hint-seen')).toBe('1');
  });

  test('пропадает сама через 5 секунд', () => {
    render(<SwipeDeck profiles={profiles} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={vi.fn()} />);
    expect(screen.getByText(/Суперлайк — заметная симпатия/)).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByText(/Суперлайк — заметная симпатия/)).toBeNull();
  });

  test('не показывается повторно, если localStorage уже отмечен', () => {
    localStorage.setItem('superlike-hint-seen', '1');
    render(<SwipeDeck profiles={profiles} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={vi.fn()} />);
    expect(screen.queryByText(/Суперлайк — заметная симпатия/)).toBeNull();
  });

  test('клик по кнопке суперлайка сразу скрывает подсказку', () => {
    render(<SwipeDeck profiles={profiles} onSwipe={vi.fn()} onOpen={vi.fn()} onHint={vi.fn()} superlikesLeft={1} />);
    expect(screen.getByText(/Суперлайк — заметная симпатия/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Суперлайк'));
    expect(screen.queryByText(/Суперлайк — заметная симпатия/)).toBeNull();
  });
});
