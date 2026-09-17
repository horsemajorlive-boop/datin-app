import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatTab from './ChatTab';

// ChatPane сама по себе — большой компонент с собственной логикой (реакции,
// правка сообщений, соцсети и т.д.), не имеющая отношения к тому, что тут
// проверяется (переключатель "Сообщения / Суперлайки"). Подменяем её заглушкой,
// чтобы тест ChatTab не зависел от внутренностей ChatPane.
vi.mock('../components/ChatPane', () => ({
  default: ({ match, onBack }) => (
    <div data-testid="chat-pane">
      <button onClick={onBack}>назад-заглушка</button>
      {match.name}
    </div>
  ),
}));

const matchRow = {
  matchId: 10,
  profile: { id: 5, name: 'Аня', age: 23, photos: ['/uploads/anya.jpg'], online: true },
  lastMessage: null,
  unread: 0,
};

const superlikeProfile = {
  id: 7,
  name: 'Соня',
  age: 24,
  photos: ['/uploads/sonya.jpg'],
  superlikeMessage: 'Привет!',
};

function baseProps(overrides = {}) {
  return {
    matches: [],
    superlikes: [],
    superlikeBusyId: null,
    messages: {},
    activities: {},
    myProfile: {},
    activeChat: null,
    activeChatId: null,
    partnerReadAt: null,
    onSelectChat: vi.fn(),
    onBrowse: vi.fn(),
    onReciprocateSuperlike: vi.fn(),
    onPassSuperlike: vi.fn(),
    onSend: vi.fn(),
    onReact: vi.fn(),
    onEditMessage: vi.fn(),
    onDeleteMessage: vi.fn(),
    onTyping: vi.fn(),
    onLeftChat: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe('ChatTab', () => {
  test('по умолчанию открыта вкладка "Сообщения" со списком мэтчей', () => {
    render(<ChatTab {...baseProps({ matches: [matchRow] })} />);
    expect(screen.getByText('Сообщения').className).toMatch(/is-on/);
    expect(screen.getByText('Аня, 23')).toBeInTheDocument();
  });

  test('бейдж с числом суперлайков виден, только если они есть', () => {
    const { rerender } = render(<ChatTab {...baseProps({ superlikes: [] })} />);
    expect(document.querySelector('.chattabs__badge')).toBeNull();

    rerender(<ChatTab {...baseProps({ superlikes: [superlikeProfile] })} />);
    expect(document.querySelector('.chattabs__badge')).toHaveTextContent('1');
  });

  test('клик по "Суперлайки" переключает контент на SuperlikesScreen', () => {
    render(<ChatTab {...baseProps({ superlikes: [superlikeProfile], matches: [matchRow] })} />);
    fireEvent.click(screen.getByText('Суперлайки'));
    expect(screen.getByText('Соня, 24')).toBeInTheDocument();
    expect(screen.queryByText('Аня, 23')).toBeNull();
  });

  test('клик обратно на "Сообщения" возвращает список мэтчей', () => {
    render(<ChatTab {...baseProps({ superlikes: [superlikeProfile], matches: [matchRow] })} />);
    fireEvent.click(screen.getByText('Суперлайки'));
    fireEvent.click(screen.getByText('Сообщения'));
    expect(screen.getByText('Аня, 23')).toBeInTheDocument();
    expect(screen.queryByText('Соня, 24')).toBeNull();
  });

  test('на вкладке "Суперлайки" клик "Взаимно" зовёт onReciprocateSuperlike с нужной анкетой', () => {
    const onReciprocateSuperlike = vi.fn();
    render(
      <ChatTab
        {...baseProps({ superlikes: [superlikeProfile], onReciprocateSuperlike })}
      />
    );
    fireEvent.click(screen.getByText('Суперлайки'));
    fireEvent.click(screen.getByText('Взаимно — ответить симпатией'));
    expect(onReciprocateSuperlike).toHaveBeenCalledWith(superlikeProfile);
  });

  test('activeChat рисует ChatPane вместо списка', () => {
    render(
      <ChatTab
        {...baseProps({
          activeChat: { name: 'Марго' },
          activeChatId: 10,
        })}
      />
    );
    expect(screen.getByTestId('chat-pane')).toBeInTheDocument();
    expect(screen.getByText('Марго')).toBeInTheDocument();
  });

  test('кнопка "назад" из ChatPane зовёт onSelectChat(null)', () => {
    const onSelectChat = vi.fn();
    render(
      <ChatTab
        {...baseProps({ activeChat: { name: 'Марго' }, activeChatId: 10, onSelectChat })}
      />
    );
    fireEvent.click(screen.getByText('назад-заглушка'));
    expect(onSelectChat).toHaveBeenCalledWith(null);
  });
});
