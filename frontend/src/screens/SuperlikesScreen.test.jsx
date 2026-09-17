import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SuperlikesScreen from './SuperlikesScreen';

const sonya = {
  id: 1,
  name: 'Соня',
  age: 24,
  city: 'Казань',
  photos: ['/uploads/sonya.jpg'],
  superlikeMessage: 'Привет! Классная анкета',
};
const margo = {
  id: 2,
  name: 'Марго',
  age: 27,
  city: 'Сочи',
  photos: ['/uploads/margo.jpg'],
  superlikeMessage: null,
};

describe('SuperlikesScreen', () => {
  test('пустой список показывает EmptyState с кнопкой "Листать анкеты"', () => {
    const onBrowse = vi.fn();
    render(
      <SuperlikesScreen people={[]} busyId={null} onReciprocate={vi.fn()} onPass={vi.fn()} onBrowse={onBrowse} />
    );
    expect(screen.getByText('Пока никто не суперлайкнул')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Листать анкеты'));
    expect(onBrowse).toHaveBeenCalledOnce();
  });

  test('показывает сообщение суперлайка, если оно есть, и не рисует пустую цитату, если его нет', () => {
    render(
      <SuperlikesScreen people={[sonya, margo]} busyId={null} onReciprocate={vi.fn()} onPass={vi.fn()} onBrowse={vi.fn()} />
    );
    expect(screen.getByText('«Привет! Классная анкета»')).toBeInTheDocument();
    // у Марго сообщения нет — её карточка не должна рисовать пустые кавычки
    const margoCard = screen.getByText('Марго, 27').closest('.superlike-card');
    expect(margoCard.querySelector('.superlike-card__msg')).toBeNull();
  });

  test('клик "Взаимно" вызывает onReciprocate именно с этой анкетой', () => {
    const onReciprocate = vi.fn();
    render(
      <SuperlikesScreen people={[sonya, margo]} busyId={null} onReciprocate={onReciprocate} onPass={vi.fn()} onBrowse={vi.fn()} />
    );
    const margoCard = screen.getByText('Марго, 27').closest('.superlike-card');
    fireEvent.click(margoCard.querySelector('.superlike-card__mutual'));
    expect(onReciprocate).toHaveBeenCalledWith(margo);
  });

  test('клик "Пропустить" вызывает onPass именно с этой анкетой', () => {
    const onPass = vi.fn();
    render(
      <SuperlikesScreen people={[sonya, margo]} busyId={null} onReciprocate={vi.fn()} onPass={onPass} onBrowse={vi.fn()} />
    );
    const sonyaCard = screen.getByText('Соня, 24').closest('.superlike-card');
    fireEvent.click(sonyaCard.querySelector('.superlike-card__pass'));
    expect(onPass).toHaveBeenCalledWith(sonya);
  });

  test('busyId блокирует кнопки только у соответствующей карточки и меняет текст на "Отвечаем…"', () => {
    render(
      <SuperlikesScreen people={[sonya, margo]} busyId={sonya.id} onReciprocate={vi.fn()} onPass={vi.fn()} onBrowse={vi.fn()} />
    );
    const sonyaCard = screen.getByText('Соня, 24').closest('.superlike-card');
    const margoCard = screen.getByText('Марго, 27').closest('.superlike-card');

    expect(sonyaCard.querySelector('.superlike-card__mutual')).toBeDisabled();
    expect(sonyaCard.querySelector('.superlike-card__pass')).toBeDisabled();
    expect(sonyaCard.querySelector('.superlike-card__mutual')).toHaveTextContent('Отвечаем…');

    expect(margoCard.querySelector('.superlike-card__mutual')).not.toBeDisabled();
    expect(margoCard.querySelector('.superlike-card__mutual')).toHaveTextContent(
      'Взаимно — ответить симпатией'
    );
  });
});
