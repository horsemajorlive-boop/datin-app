import { useEffect, useMemo, useRef, useState } from 'react';
import { fileToCompressedDataUrl } from '../lib/image';
import { api } from '../api';
import {
  IconChevronLeft,
  IconUsers,
  IconMore,
  IconSmile,
  IconImage,
  IconSend,
  IconCheck,
  IconEdit,
  IconTrash,
  IconX,
} from './icons';

// Общий чат группы — упрощённая версия ChatPane (без реакций, подсказок и
// планировщика встречи: там это уместно для романтической переписки один
// на один, здесь — обычный групповой чат). Меню действий с сообщением —
// тот же приём, что и в ChatPane: наведение/долгое нажатие/правый клик
// подвешивают меню прямо у сообщения через getBoundingClientRect.
//
// Props:
//   group      — { id, name, photo, memberCount, isOwner, members: [{ id, name, ... }] }
//   messages   — [{ id, from, senderId, type, text?, photo?, editedAt?, deleted? }]
//   onBack     — вернуться к списку групп
//   onSend     — onSend({ type, text?, photo? })
//   onEditMessage   — onEditMessage(messageId, text)
//   onDeleteMessage — onDeleteMessage(messageId)
//   onShowMembers   — открыть список участников
//   onError    — показать пользователю текст ошибки (напр. не отправилось фото)

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export default function GroupChatPane({
  group,
  messages,
  onBack,
  onSend,
  onEditMessage,
  onDeleteMessage,
  onShowMembers,
  onError,
}) {
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [pickerFor, setPickerFor] = useState(null);
  const [pickerPos, setPickerPos] = useState(null);
  const bodyRef = useRef(null);
  const fileRef = useRef(null);
  const msgRefs = useRef({});
  const pressTimer = useRef(null);

  const nameById = useMemo(
    () => Object.fromEntries((group.members || []).map((m) => [m.id, m.name])),
    [group.members]
  );

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function openMenu(m) {
    if (m.deleted) return;
    clearTimeout(pressTimer.current);
    const el = msgRefs.current[m.id];
    if (el) {
      const r = el.getBoundingClientRect();
      const openUp = r.top > 180;
      setPickerPos({
        left: Math.min(Math.max(r.left, 8), window.innerWidth - 8),
        top: openUp ? r.top : r.bottom,
        openUp,
      });
    } else {
      setPickerPos(null);
    }
    setPickerFor(m.id);
  }

  function closeMenu() {
    setPickerFor(null);
    setPickerPos(null);
  }

  function handlePressStart(m) {
    if (m.deleted) return;
    clearTimeout(pressTimer.current);
    pressTimer.current = setTimeout(() => openMenu(m), 480);
  }
  function handlePressEnd() {
    clearTimeout(pressTimer.current);
  }

  function startEdit(m) {
    setEditingId(m.id);
    setText(m.text || '');
    closeMenu();
  }

  function cancelEdit() {
    setEditingId(null);
    setText('');
  }

  function handleDelete(m) {
    closeMenu();
    if (editingId === m.id) cancelEdit();
    onDeleteMessage(m.id);
  }

  function handleSubmit(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (editingId != null) {
      onEditMessage(editingId, value);
      setEditingId(null);
      setText('');
      return;
    }
    onSend({ type: 'text', text: value });
    setText('');
  }

  async function handlePhoto(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const { url } = await api.post('/upload', { dataUrl });
      onSend({ type: 'photo', photo: url });
    } catch (err) {
      console.error('не удалось отправить фото', err);
      onError?.(err.message || 'Не удалось отправить фото — попробуйте ещё раз');
    }
  }

  return (
    <div className="chatpane">
      <header className="chat__header">
        <button type="button" className="chat__back" onClick={onBack} aria-label="К списку">
          <IconChevronLeft />
        </button>
        <button type="button" className="chat__peer" onClick={onShowMembers}>
          <span className="chat__avatar-wrap">
            {group.photo ? (
              <img src={group.photo} alt={group.name} />
            ) : (
              <span className="group-avatar-fallback">
                <IconUsers />
              </span>
            )}
          </span>
          <span className="chat__peer-text">
            <span className="chat__name">{group.name}</span>
            <span className="chat__status">{group.memberCount} участников</span>
          </span>
        </button>

        <div className="chat__tools">
          <button type="button" className="chat__tool" onClick={onShowMembers} aria-label="Участники">
            <IconMore />
          </button>
        </div>
      </header>

      <div className="chat__body" ref={bodyRef} onScroll={() => pickerFor && closeMenu()}>
        {messages.length === 0 ? (
          <div className="chat__empty">
            <p className="chat__empty-title">Пока тихо</p>
            <p className="chat__empty-sub">Напишите первым — так и начинаются тусовки</p>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              ref={(el) => {
                if (el) msgRefs.current[m.id] = el;
                else delete msgRefs.current[m.id];
              }}
              className={
                'chat__msg ' +
                (m.from === 'me' ? 'chat__msg--me' : 'chat__msg--them') +
                (m.type === 'photo' && !m.deleted ? ' chat__msg--bare' : '') +
                (pickerFor === m.id ? ' is-picking' : '') +
                (m.deleted ? ' chat__msg--deleted' : '')
              }
              onContextMenu={(e) => {
                if (m.deleted || m.from !== 'me') return;
                e.preventDefault();
                openMenu(m);
              }}
              onTouchStart={() => m.from === 'me' && handlePressStart(m)}
              onTouchEnd={handlePressEnd}
              onTouchMove={handlePressEnd}
              onTouchCancel={handlePressEnd}
            >
              {m.from !== 'me' && (
                <span className="group-msg__author">{nameById[m.senderId] || 'Участник'}</span>
              )}
              {m.deleted ? (
                <span className="chat__text chat__text--deleted">Сообщение удалено</span>
              ) : m.type === 'photo' ? (
                <img className="chat__photo" src={m.photo} alt="фото" />
              ) : (
                <span className="chat__text">{m.text}</span>
              )}
              <span className="chat__time">
                {formatTime(m.ts)}
                {m.editedAt && !m.deleted && ' · изменено'}
              </span>
              {!m.deleted && m.from === 'me' && (
                <button
                  type="button"
                  className="chat__msgmenu-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    openMenu(m);
                  }}
                  aria-label="Действия с сообщением"
                >
                  <IconMore />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {editingId != null && (
        <div className="chat__editbar">
          <IconEdit />
          <span>Редактирование сообщения</span>
          <button type="button" className="chat__editbar-cancel" onClick={cancelEdit} aria-label="Отменить редактирование">
            <IconX />
          </button>
        </div>
      )}

      <form className="chat__inputbar" onSubmit={handleSubmit}>
        <div className="chat__field">
          <button type="button" className="chat__inbtn" disabled aria-hidden="true">
            <IconSmile />
          </button>
          <input
            className="chat__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Сообщение группе"
            maxLength={1000}
          />
          <button
            type="button"
            className="chat__inbtn"
            onClick={() => fileRef.current?.click()}
            aria-label="Отправить фото"
          >
            <IconImage />
          </button>
        </div>
        <button
          className="chat__send"
          type="submit"
          disabled={!text.trim()}
          aria-label={editingId != null ? 'Сохранить' : 'Отправить'}
        >
          {editingId != null ? <IconCheck /> : <IconSend />}
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={handlePhoto} />
      </form>

      {pickerFor &&
        pickerPos &&
        (() => {
          const pickedMsg = messages.find((m) => m.id === pickerFor);
          if (!pickedMsg) return null;
          const style = {
            left: pickerPos.left,
            ...(pickerPos.openUp
              ? { bottom: window.innerHeight - pickerPos.top + 8 }
              : { top: pickerPos.top + 8 }),
          };
          return (
            <>
              <div className="chat__pickerbg" onClick={closeMenu} />
              <div className="chat__ctxmenu" style={style}>
                <div className="chat__ctxmenu-actions">
                  {pickedMsg.type === 'text' && (
                    <button type="button" className="chat__ctxmenu-item" onClick={() => startEdit(pickedMsg)}>
                      <IconEdit /> Изменить
                    </button>
                  )}
                  <button
                    type="button"
                    className="chat__ctxmenu-item chat__ctxmenu-item--danger"
                    onClick={() => handleDelete(pickedMsg)}
                  >
                    <IconTrash /> Удалить
                  </button>
                </div>
              </div>
            </>
          );
        })()}
    </div>
  );
}
