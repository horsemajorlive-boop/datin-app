import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FilterSheet from './FilterSheet';
import { DEFAULT_FILTERS } from '../lib/filters';

function renderSheet(props = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const onUpgrade = vi.fn();
  const utils = render(
    <FilterSheet
      value={{ ...DEFAULT_FILTERS }}
      onApply={onApply}
      onClose={onClose}
      hasLocation={false}
      onShareLocation={vi.fn()}
      onClearLocation={vi.fn()}
      isPremium={false}
      onUpgrade={onUpgrade}
      {...props}
    />
  );
  return { ...utils, onApply, onClose, onUpgrade };
}

describe('FilterSheet — сортировка', () => {
  test('по умолчанию активен "Простой свайпинг" (значение из DEFAULT_FILTERS)', () => {
    renderSheet();
    expect(screen.getByText('Простой свайпинг').className).toMatch(/is-on/);
  });

  test('клик по незалоченной сортировке применяется сразу, без пейволла', () => {
    const { onApply } = renderSheet();
    fireEvent.click(screen.getByText('Сейчас активны'));
    expect(screen.queryByText('Доступно с Premium')).toBeNull();
    fireEvent.click(screen.getByText('Показать'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ sort: '' }));
  });

  test('клик по "Новенькие" без Premium открывает пейволл и НЕ меняет сортировку', () => {
    const { onApply } = renderSheet();
    fireEvent.click(screen.getByText('Новенькие'));
    expect(screen.getByText('Доступно с Premium')).toBeInTheDocument();
    expect(screen.getByText(/«Новенькие»/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Показать'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ sort: 'simple' }));
  });

  test('клик по "Рандомайзер" без Premium открывает пейволл с упоминанием буста', () => {
    renderSheet();
    fireEvent.click(screen.getByText('Рандомайзер'));
    expect(screen.getByText(/«Рандомайзер»/)).toBeInTheDocument();
  });

  test('с Premium "Рандомайзер" применяется без пейволла', () => {
    const { onApply } = renderSheet({ isPremium: true });
    fireEvent.click(screen.getByText('Рандомайзер'));
    expect(screen.queryByText('Доступно с Premium')).toBeNull();
    fireEvent.click(screen.getByText('Показать'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ sort: 'random' }));
  });

  test('"Оформить Premium" в пейволле закрывает и пейволл, и саму шторку фильтров, зовёт onUpgrade', () => {
    const { onClose, onUpgrade } = renderSheet();
    fireEvent.click(screen.getByText('Новенькие'));
    fireEvent.click(screen.getByText('Оформить Premium'));
    expect(onUpgrade).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  test('"Не сейчас" в пейволле закрывает только пейволл, шторка фильтров остаётся открытой', () => {
    const { onClose } = renderSheet();
    fireEvent.click(screen.getByText('Новенькие'));
    fireEvent.click(screen.getByText('Не сейчас'));
    expect(screen.queryByText('Доступно с Premium')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('FilterSheet — фильтр "Быт"', () => {
  test('клик по опции без Premium открывает пейволл, а не переключает чип', () => {
    const { onApply } = renderSheet();
    fireEvent.click(screen.getByText('Своя квартира'));
    expect(screen.getByText('Доступно с Premium')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Не сейчас'));
    fireEvent.click(screen.getByText('Показать'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ housing: [] }));
  });

  test('с Premium клик переключает чип как обычно, без пейволла', () => {
    const { onApply } = renderSheet({ isPremium: true });
    fireEvent.click(screen.getByText('Своя квартира'));
    expect(screen.queryByText('Доступно с Premium')).toBeNull();
    fireEvent.click(screen.getByText('Показать'));
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ housing: ['own'] }));
  });
});
