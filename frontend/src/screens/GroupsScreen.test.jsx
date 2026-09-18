import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import GroupsScreen from './GroupsScreen';

// GroupCreateSheet делает реальные вызовы api (счёт на оплату) — не имеет
// отношения к тому, что тут проверяется (список/фильтры/вступление).
vi.mock('../components/GroupCreateSheet', () => ({
  default: ({ onClose, onCreated }) => (
    <div data-testid="create-sheet">
      <button onClick={() => onCreated(999)}>заглушка-создать</button>
      <button onClick={onClose}>заглушка-закрыть</button>
    </div>
  ),
}));

const myGroup = {
  id: 1,
  name: 'Утренние пробежки',
  photo: null,
  unread: 2,
  lastMessage: { type: 'text', text: 'Привет!', fromMe: false },
};

const browseGroupNotJoined = {
  id: 2,
  name: 'Книжный клуб',
  description: 'Раз в месяц',
  city: 'Москва',
  interest: 'Книги',
  photo: null,
  memberCount: 5,
  isMember: false,
};

const browseGroupJoined = {
  id: 3,
  name: 'Йога в парке',
  description: '',
  city: 'Москва',
  interest: 'Йога',
  photo: null,
  memberCount: 3,
  isMember: true,
};

function baseProps(overrides = {}) {
  return {
    browseGroups: [],
    myGroups: [],
    browseCity: 'Москва',
    onChangeBrowseCity: vi.fn(),
    browseInterest: '',
    onChangeBrowseInterest: vi.fn(),
    defaultCity: 'Москва',
    busyGroupId: null,
    onJoin: vi.fn(),
    onOpenGroup: vi.fn(),
    onCreated: vi.fn(),
    ...overrides,
  };
}

describe('GroupsScreen — вкладка "Мои"', () => {
  test('пустой список показывает EmptyState с переходом в "Обзор"', () => {
    render(<GroupsScreen {...baseProps()} />);
    expect(screen.getByText('Пока нет групп')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Смотреть группы'));
    expect(screen.getByText('Обзор').className).toMatch(/is-on/);
  });

  test('список групп с непрочитанным показывает бейдж и превью последнего сообщения', () => {
    render(<GroupsScreen {...baseProps({ myGroups: [myGroup] })} />);
    expect(screen.getByText('Утренние пробежки')).toBeInTheDocument();
    expect(screen.getByText('Привет!')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  test('клик по группе в "Моих" зовёт onOpenGroup с её id', () => {
    const onOpenGroup = vi.fn();
    render(<GroupsScreen {...baseProps({ myGroups: [myGroup], onOpenGroup })} />);
    fireEvent.click(screen.getByText('Утренние пробежки'));
    expect(onOpenGroup).toHaveBeenCalledWith(1);
  });
});

describe('GroupsScreen — вкладка "Обзор"', () => {
  test('показывает фильтры по городу и интересу, кнопку создания', () => {
    render(<GroupsScreen {...baseProps()} />);
    fireEvent.click(screen.getByText('Обзор'));
    expect(screen.getByDisplayValue('Москва')).toBeInTheDocument();
    expect(screen.getByText('+ Создать группу')).toBeInTheDocument();
  });

  test('пустой список без города просит выбрать город', () => {
    render(<GroupsScreen {...baseProps({ browseCity: '' })} />);
    fireEvent.click(screen.getByText('Обзор'));
    expect(screen.getByText('Выберите город')).toBeInTheDocument();
  });

  test('карточка не вступленной группы показывает "Вступить", клик зовёт onJoin', () => {
    const onJoin = vi.fn();
    render(<GroupsScreen {...baseProps({ browseGroups: [browseGroupNotJoined], onJoin })} />);
    fireEvent.click(screen.getByText('Обзор'));
    expect(screen.getByText('Книжный клуб')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Вступить'));
    expect(onJoin).toHaveBeenCalledWith(browseGroupNotJoined);
  });

  test('карточка уже вступленной группы показывает "Открыть", клик зовёт onOpenGroup', () => {
    const onOpenGroup = vi.fn();
    render(<GroupsScreen {...baseProps({ browseGroups: [browseGroupJoined], onOpenGroup })} />);
    fireEvent.click(screen.getByText('Обзор'));
    fireEvent.click(screen.getByText('Открыть'));
    expect(onOpenGroup).toHaveBeenCalledWith(3);
  });

  test('busyGroupId блокирует кнопку "Вступить" только у своей карточки', () => {
    render(
      <GroupsScreen
        {...baseProps({ browseGroups: [browseGroupNotJoined], busyGroupId: browseGroupNotJoined.id })}
      />
    );
    fireEvent.click(screen.getByText('Обзор'));
    expect(screen.getByText('Вступаем…')).toBeDisabled();
  });

  test('кнопка "+ Создать группу" открывает GroupCreateSheet, onCreated пробрасывается наверх', () => {
    const onCreated = vi.fn();
    render(<GroupsScreen {...baseProps({ onCreated })} />);
    fireEvent.click(screen.getByText('Обзор'));
    fireEvent.click(screen.getByText('+ Создать группу'));
    expect(screen.getByTestId('create-sheet')).toBeInTheDocument();

    fireEvent.click(screen.getByText('заглушка-создать'));
    expect(onCreated).toHaveBeenCalledWith(999);
    expect(screen.queryByTestId('create-sheet')).toBeNull(); // шторка закрылась
  });
});
