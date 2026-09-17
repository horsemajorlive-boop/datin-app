import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MissedLikeNudge from './MissedLikeNudge';

describe('MissedLikeNudge', () => {
  test('show=false ничего не рисует', () => {
    const { container } = render(
      <MissedLikeNudge show={false} onDismiss={vi.fn()} onUpgrade={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  test('show=true рисует текст напоминания', () => {
    render(<MissedLikeNudge show onDismiss={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText(/пропустили симпатию/)).toBeInTheDocument();
  });

  test('клик по слову "Premium" вызывает onUpgrade, не onDismiss', () => {
    const onDismiss = vi.fn();
    const onUpgrade = vi.fn();
    render(<MissedLikeNudge show onDismiss={onDismiss} onUpgrade={onUpgrade} />);
    fireEvent.click(screen.getByText('Premium'));
    expect(onUpgrade).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
  });

  test('клик по стрелочке-закрытию вызывает onDismiss, не onUpgrade', () => {
    const onDismiss = vi.fn();
    const onUpgrade = vi.fn();
    render(<MissedLikeNudge show onDismiss={onDismiss} onUpgrade={onUpgrade} />);
    fireEvent.click(screen.getByLabelText('Скрыть'));
    expect(onDismiss).toHaveBeenCalledOnce();
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  test('клик по фону (вне карточки) тоже вызывает onDismiss', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <MissedLikeNudge show onDismiss={onDismiss} onUpgrade={vi.fn()} />
    );
    fireEvent.click(container.querySelector('.missed-nudge'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
