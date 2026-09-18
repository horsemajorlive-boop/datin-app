import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupMembersSheet from './GroupMembersSheet';

const ownerMember = { id: 1, name: 'Марина', role: 'owner', photos: ['/uploads/a.jpg'] };
const otherMember = { id: 2, name: 'Олег', role: 'member', photos: ['/uploads/b.jpg'] };

function baseGroup(overrides = {}) {
  return {
    id: 10,
    name: 'Утренние пробежки',
    description: 'По субботам',
    city: 'Москва',
    interest: 'Бег',
    memberCount: 2,
    isOwner: false,
    members: [ownerMember, otherMember],
    ...overrides,
  };
}

describe('GroupMembersSheet — участник (не владелец)', () => {
  test('показывает всех участников и метку "создатель" у владельца', () => {
    render(<GroupMembersSheet group={baseGroup()} onClose={vi.fn()} onKick={vi.fn()} onLeave={vi.fn()} onDeleteGroup={vi.fn()} />);
    expect(screen.getByText('Марина')).toBeInTheDocument();
    expect(screen.getByText('Олег')).toBeInTheDocument();
    expect(screen.getByText('создатель')).toBeInTheDocument();
  });

  test('показывает "Покинуть группу", без кнопок исключения', () => {
    render(<GroupMembersSheet group={baseGroup()} onClose={vi.fn()} onKick={vi.fn()} onLeave={vi.fn()} onDeleteGroup={vi.fn()} />);
    expect(screen.getByText('Покинуть группу')).toBeInTheDocument();
    expect(screen.queryByText('Исключить')).toBeNull();
    expect(screen.queryByText('Удалить группу')).toBeNull();
  });

  test('клик "Покинуть группу" зовёт onLeave', () => {
    const onLeave = vi.fn();
    render(<GroupMembersSheet group={baseGroup()} onClose={vi.fn()} onKick={vi.fn()} onLeave={onLeave} onDeleteGroup={vi.fn()} />);
    fireEvent.click(screen.getByText('Покинуть группу'));
    expect(onLeave).toHaveBeenCalledOnce();
  });
});

describe('GroupMembersSheet — владелец', () => {
  test('показывает "Исключить" у каждого, кроме себя', () => {
    render(
      <GroupMembersSheet
        group={baseGroup({ isOwner: true })}
        onClose={vi.fn()}
        onKick={vi.fn()}
        onLeave={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );
    expect(screen.getAllByText('Исключить')).toHaveLength(1); // только у Олега, не у владельца
  });

  test('клик "Исключить" зовёт onKick с id этого участника', () => {
    const onKick = vi.fn();
    render(
      <GroupMembersSheet
        group={baseGroup({ isOwner: true })}
        onClose={vi.fn()}
        onKick={onKick}
        onLeave={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Исключить'));
    expect(onKick).toHaveBeenCalledWith(2);
  });

  test('"Удалить группу" требует подтверждения перед вызовом onDeleteGroup', () => {
    const onDeleteGroup = vi.fn();
    render(
      <GroupMembersSheet
        group={baseGroup({ isOwner: true })}
        onClose={vi.fn()}
        onKick={vi.fn()}
        onLeave={vi.fn()}
        onDeleteGroup={onDeleteGroup}
      />
    );
    fireEvent.click(screen.getByText('Удалить группу'));
    expect(onDeleteGroup).not.toHaveBeenCalled();
    expect(screen.getByText('Да, удалить группу')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Да, удалить группу'));
    expect(onDeleteGroup).toHaveBeenCalledOnce();
  });

  test('"Отмена" после запроса на удаление возвращает обычный вид', () => {
    render(
      <GroupMembersSheet
        group={baseGroup({ isOwner: true })}
        onClose={vi.fn()}
        onKick={vi.fn()}
        onLeave={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );
    fireEvent.click(screen.getByText('Удалить группу'));
    fireEvent.click(screen.getByText('Отмена'));
    expect(screen.getByText('Удалить группу')).toBeInTheDocument();
  });
});

describe('GroupMembersSheet — ошибки и busy', () => {
  test('показывает переданную ошибку', () => {
    render(
      <GroupMembersSheet
        group={baseGroup()}
        error="Не удалось выйти из группы"
        onClose={vi.fn()}
        onKick={vi.fn()}
        onLeave={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );
    expect(screen.getByText('Не удалось выйти из группы')).toBeInTheDocument();
  });

  test('busy блокирует кнопку выхода и меняет текст', () => {
    render(
      <GroupMembersSheet
        group={baseGroup()}
        busy
        onClose={vi.fn()}
        onKick={vi.fn()}
        onLeave={vi.fn()}
        onDeleteGroup={vi.fn()}
      />
    );
    expect(screen.getByText('Выходим…')).toBeDisabled();
  });
});
