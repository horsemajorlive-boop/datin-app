import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuperlikeComposer from './SuperlikeComposer';

const profile = { id: 1, name: 'Соня' };

describe('SuperlikeComposer', () => {
  test('показывает имя анкеты в заголовке', () => {
    render(<SuperlikeComposer profile={profile} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText('Суперлайк для Соня')).toBeInTheDocument();
  });

  test('можно отправить пустым — onConfirm вызывается с пустой строкой', () => {
    const onConfirm = vi.fn();
    render(<SuperlikeComposer profile={profile} onCancel={vi.fn()} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Отправить суперлайк'));
    expect(onConfirm).toHaveBeenCalledWith('');
  });

  test('обрезает пробелы по краям перед отправкой', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<SuperlikeComposer profile={profile} onCancel={vi.fn()} onConfirm={onConfirm} />);
    await user.type(screen.getByPlaceholderText(/необязательно/), '  привет  ');
    fireEvent.click(screen.getByText('Отправить суперлайк'));
    expect(onConfirm).toHaveBeenCalledWith('привет');
  });

  test('кнопка "Отмена" вызывает onCancel, не onConfirm', () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(<SuperlikeComposer profile={profile} onCancel={onCancel} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Отмена'));
    expect(onCancel).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  test('клик по затемнению вне карточки тоже вызывает onCancel', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <SuperlikeComposer profile={profile} onCancel={onCancel} onConfirm={vi.fn()} />
    );
    fireEvent.click(container.querySelector('.sheet'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  test('клик внутри самой карточки НЕ закрывает (stopPropagation)', () => {
    const onCancel = vi.fn();
    const { container } = render(
      <SuperlikeComposer profile={profile} onCancel={onCancel} onConfirm={vi.fn()} />
    );
    fireEvent.click(container.querySelector('.sheet__card'));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
