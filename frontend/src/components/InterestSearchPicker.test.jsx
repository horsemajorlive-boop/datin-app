import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import InterestSearchPicker from './InterestSearchPicker';

describe('InterestSearchPicker', () => {
  test('без значения показывает поле поиска', () => {
    render(<InterestSearchPicker value="" onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText('Начните вводить')).toBeInTheDocument();
  });

  test('ввод фильтрует каталог и показывает совпадения', () => {
    render(<InterestSearchPicker value="" onChange={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('Начните вводить'), { target: { value: 'Бег' } });
    expect(screen.getByText('Бег')).toBeInTheDocument();
  });

  test('клик по варианту вызывает onChange с этим интересом', () => {
    const onChange = vi.fn();
    render(<InterestSearchPicker value="" onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('Начните вводить'), { target: { value: 'Бег' } });
    fireEvent.click(screen.getByText('Бег'));
    expect(onChange).toHaveBeenCalledWith('Бег');
  });

  test('с выбранным значением показывает чип вместо поиска', () => {
    render(<InterestSearchPicker value="Бег" onChange={vi.fn()} />);
    expect(screen.getByText('Бег ✕')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Начните вводить')).toBeNull();
  });

  test('клик по чипу сбрасывает значение', () => {
    const onChange = vi.fn();
    render(<InterestSearchPicker value="Бег" onChange={onChange} />);
    fireEvent.click(screen.getByText('Бег ✕'));
    expect(onChange).toHaveBeenCalledWith('');
  });
});
