import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Paywall from './Paywall';

describe('Paywall', () => {
  test('show=false ничего не рисует', () => {
    const { container } = render(<Paywall show={false} onClose={vi.fn()} onUpgrade={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  test('show=true рисует заголовок и переданный текст', () => {
    render(<Paywall show text="«Рандомайзер» — с Premium" onClose={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText('Доступно с Premium')).toBeInTheDocument();
    expect(screen.getByText('«Рандомайзер» — с Premium')).toBeInTheDocument();
  });

  test('без text показывает дефолтное пояснение', () => {
    render(<Paywall show onClose={vi.fn()} onUpgrade={vi.fn()} />);
    expect(screen.getByText(/открывается вместе с TiAmo Premium/)).toBeInTheDocument();
  });

  test('клик "Оформить Premium" зовёт onUpgrade, не onClose', () => {
    const onClose = vi.fn();
    const onUpgrade = vi.fn();
    render(<Paywall show onClose={onClose} onUpgrade={onUpgrade} />);
    fireEvent.click(screen.getByText('Оформить Premium'));
    expect(onUpgrade).toHaveBeenCalledOnce();
    expect(onClose).not.toHaveBeenCalled();
  });

  test('клик "Не сейчас" зовёт onClose, не onUpgrade', () => {
    const onClose = vi.fn();
    const onUpgrade = vi.fn();
    render(<Paywall show onClose={onClose} onUpgrade={onUpgrade} />);
    fireEvent.click(screen.getByText('Не сейчас'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onUpgrade).not.toHaveBeenCalled();
  });

  test('клик по фону тоже вызывает onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<Paywall show onClose={onClose} onUpgrade={vi.fn()} />);
    fireEvent.click(container.querySelector('.paywall-modal'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('клик внутри карточки не закрывает (stopPropagation)', () => {
    const onClose = vi.fn();
    const { container } = render(<Paywall show onClose={onClose} onUpgrade={vi.fn()} />);
    fireEvent.click(container.querySelector('.paywall-modal__card'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
