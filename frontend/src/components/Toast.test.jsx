import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from './Toast';

describe('Toast', () => {
  test('без текста ничего не рисует', () => {
    const { container } = render(<Toast text="" onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('null тоже ничего не рисует', () => {
    const { container } = render(<Toast text={null} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('показывает переданный текст', () => {
    render(<Toast text="Не удалось выполнить действие" onDismiss={vi.fn()} />);
    expect(screen.getByText('Не удалось выполнить действие')).toBeInTheDocument();
  });

  test('клик вызывает onDismiss', () => {
    const onDismiss = vi.fn();
    render(<Toast text="Ошибка" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Ошибка'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
