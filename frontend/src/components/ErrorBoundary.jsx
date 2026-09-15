import { Component } from 'react';

// Ловит необработанные ошибки рендера у потомков. Без неё любая такая
// ошибка (а с ростом кода это рано или поздно случится) валит всё дерево
// React в пустой белый экран — ни сообщения, ни возможности продолжить.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint/oxlint: намеренный console.error — это единственный способ
    // узнать о падении, отдельного сервиса логов ошибок в проекте нет.
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="crash">
          <h1 className="crash__title">Что-то пошло не так</h1>
          <p className="crash__text">
            Приложение столкнулось с неожиданной ошибкой. Попробуйте
            перезапустить — обычно это помогает.
          </p>
          <button
            type="button"
            className="btn-wide"
            onClick={() => window.location.reload()}
          >
            Перезагрузить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
