import { COMPOSE_EMOJI } from '../data/emojiPalette';

// Панель выбора эмодзи для набора сообщения.
// Тап по эмодзи добавляет его в поле ввода (не отправляет сразу).
//
// Props:
//   onPick — onPick(emoji)

export default function EmojiPicker({ onPick }) {
  return (
    <div className="emojipick">
      {COMPOSE_EMOJI.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="emojipick__btn"
          onClick={() => onPick(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
