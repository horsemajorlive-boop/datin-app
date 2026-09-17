import { useState } from 'react';
import { api, normalizeProfile } from '../api';
import {
  THEMES,
  ACCENTS,
  loadThemePrefs,
  saveThemePrefs,
  applyThemePrefs,
} from '../lib/theme';
import { RULES } from '../data/rules';
import { IconChevronLeft } from '../components/icons';
import { assetUrl } from '../api';
import { getTelegram } from '../telegram';
import { PREMIUM_PRICE_STARS } from '../premium';
import Switch from '../components/Switch';
import pkg from '../../package.json';

// Экран настроек в профиле.
//
// Props:
//   profile         — своя анкета (нужны isVisible, showOnline)
//   onBack          — вернуться в профиль
//   onChangedProfile(me) — после смены настроек анкеты
//   onBlockedChanged — после разблокировки (родитель обновит ленту)
//   onDeleted       — после удаления аккаунта

export default function SettingsScreen({
  profile,
  onBack,
  onChangedProfile,
  onBlockedChanged,
  onDeleted,
}) {
  const [prefs, setPrefs] = useState(loadThemePrefs);
  const [savingSetting, setSavingSetting] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showBlocked, setShowBlocked] = useState(false);
  const [blocked, setBlocked] = useState(null); // null = ещё не грузили
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState('');

  async function buyPremium() {
    setBuyError('');
    setBuying(true);
    try {
      const { url } = await api.post('/premium/invoice');
      const tg = getTelegram();
      if (tg?.openInvoice) {
        tg.openInvoice(url, async (status) => {
          // 'paid' | 'cancelled' | 'failed' | 'pending' — сам Premium выдаёт
          // сервер по вебхуку от Telegram, тут просто подтягиваем анкету заново.
          if (status === 'paid') {
            try {
              onChangedProfile(normalizeProfile(await api.get('/me')));
            } catch {
              /* анкета подтянется при следующем открытии — не критично */
            }
          }
          setBuying(false);
        });
      } else {
        // Вне Telegram (или старый клиент без openInvoice) — открываем ссылку как есть.
        window.open(url, '_blank');
        setBuying(false);
      }
    } catch (err) {
      setBuyError(err.message || 'Не получилось начать оплату');
      setBuying(false);
    }
  }

  async function toggleBlocked() {
    const next = !showBlocked;
    setShowBlocked(next);
    if (next && blocked == null) {
      try {
        setBlocked(await api.get('/blocked'));
      } catch {
        setBlocked([]);
      }
    }
  }

  async function unblock(id) {
    try {
      await api.post('/unblock', { userId: id });
      setBlocked((cur) => cur.filter((u) => u.id !== id));
      onBlockedChanged?.();
    } catch (err) {
      setError(err.message || 'Не удалось разблокировать');
    }
  }

  function setTheme(next) {
    const updated = { ...prefs, ...next };
    setPrefs(updated);
    saveThemePrefs(updated);
    applyThemePrefs(updated);
  }

  async function patchSetting(patch) {
    setError('');
    setSavingSetting(true);
    try {
      const me = await api.patch('/me/settings', patch);
      onChangedProfile(normalizeProfile(me));
    } catch (err) {
      setError(err.message || 'Не удалось сохранить настройку');
    } finally {
      setSavingSetting(false);
    }
  }

  async function deleteAccount() {
    setError('');
    setDeleting(true);
    try {
      await api.del('/me');
      onDeleted();
    } catch (err) {
      setError(err.message || 'Не удалось удалить аккаунт');
      setDeleting(false);
    }
  }

  return (
    <div className="screen">
      <button className="onb__back verify-back" onClick={onBack} aria-label="Назад">
        <IconChevronLeft />
      </button>
      <h1 className="screen__title">Настройки</h1>

      {/* PREMIUM */}
      <div className="set-group">
        <div className="set-group__head set-group__head--premium">Premium</div>

        {profile.isPremium ? (
          <div className="set-row">
            <span className="set-row__text">
              Premium активен
              <small>
                До {new Date(profile.premiumUntil).toLocaleDateString('ru-RU')}
              </small>
            </span>
          </div>
        ) : (
          <div className="premium-pitch">
            <ul className="premium-pitch__list">
              <li>Безлимитные лайки</li>
              <li>5 суперлайков в день вместо 1</li>
              <li>Видно, кто вас лайкнул</li>
              <li>Поднятие анкеты в топ поиска на час — 2 раза в день</li>
              <li>Пропущенные анкеты возвращаются в поиск быстрее — через час, а не 6</li>
              <li>Сортировка «Новенькие» и фильтр по быту</li>
            </ul>
            <button
              type="button"
              className="btn-wide"
              onClick={buyPremium}
              disabled={buying}
            >
              {buying ? 'Открываем оплату…' : `Оформить за ${PREMIUM_PRICE_STARS} ⭐`}
            </button>
            {buyError && <p className="form__error">{buyError}</p>}
          </div>
        )}
      </div>

      {/* ВНЕШНИЙ ВИД */}
      <div className="set-group">
        <div className="set-group__head">Внешний вид</div>

        <div className="set-row set-row--col">
          <span>Тема</span>
          <div className="choice">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`chipbtn ${prefs.mode === t.id ? 'is-on' : ''}`}
                onClick={() => setTheme({ mode: t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="set-row set-row--col">
          <span>Цвет акцента</span>
          <div className="swatches">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                className={`swatch ${prefs.accent === a.id ? 'is-on' : ''}`}
                style={{ '--sw': a.color }}
                onClick={() => setTheme({ accent: a.id })}
              />
            ))}
          </div>
        </div>
      </div>

      {/* АНКЕТА */}
      <div className="set-group">
        <div className="set-group__head">Анкета</div>

        <div className="set-row">
          <span className="set-row__text">
            Скрыть анкету из поиска
            <small>Другие не увидят вас в ленте, мэтчи и чаты останутся</small>
          </span>
          <Switch
            checked={!profile.isVisible}
            disabled={savingSetting}
            onChange={(hidden) => patchSetting({ isVisible: !hidden })}
          />
        </div>

        <div className="set-row">
          <span className="set-row__text">
            Показывать статус «в сети»
            <small>Собеседники видят, когда вы онлайн и когда были активны</small>
          </span>
          <Switch
            checked={profile.showOnline}
            disabled={savingSetting}
            onChange={(on) => patchSetting({ showOnline: on })}
          />
        </div>
      </div>

      {/* УВЕДОМЛЕНИЯ */}
      <div className="set-group">
        <div className="set-group__head">Уведомления в Telegram</div>

        <div className="set-row">
          <span className="set-row__text">Новые мэтчи</span>
          <Switch
            checked={profile.notifyMatches}
            disabled={savingSetting}
            onChange={(on) => patchSetting({ notifyMatches: on })}
          />
        </div>
        <div className="set-row">
          <span className="set-row__text">Сообщения</span>
          <Switch
            checked={profile.notifyMessages}
            disabled={savingSetting}
            onChange={(on) => patchSetting({ notifyMessages: on })}
          />
        </div>
        <div className="set-row">
          <span className="set-row__text">
            Симпатии
            <small>Когда кто-то добавил вас в симпатии</small>
          </span>
          <Switch
            checked={profile.notifyLikes}
            disabled={savingSetting}
            onChange={(on) => patchSetting({ notifyLikes: on })}
          />
        </div>
        <div className="set-row">
          <span className="set-row__text">
            Суперлайки
            <small>Когда кто-то отправил суперлайк — с сообщением, если есть</small>
          </span>
          <Switch
            checked={profile.notifySuperlikes}
            disabled={savingSetting}
            onChange={(on) => patchSetting({ notifySuperlikes: on })}
          />
        </div>
      </div>

      {/* ПРИВАТНОСТЬ */}
      <div className="set-group">
        <div className="set-group__head">Приватность</div>

        <button
          type="button"
          className="set-row set-row--btn"
          onClick={toggleBlocked}
        >
          <span>
            Заблокированные
            {blocked != null && blocked.length > 0 ? ` (${blocked.length})` : ''}
          </span>
          <span className="set-row__chev">{showBlocked ? '–' : '+'}</span>
        </button>
        {showBlocked && (
          <div className="blocklist">
            {blocked == null && <p className="muted">Загрузка…</p>}
            {blocked != null && blocked.length === 0 && (
              <p className="muted">Список пуст.</p>
            )}
            {blocked?.map((u) => (
              <div className="blocklist__item" key={u.id}>
                {u.photo ? (
                  <img src={assetUrl(u.photo)} alt={u.name} />
                ) : (
                  <span className="blocklist__ph" />
                )}
                <span className="blocklist__name">{u.name}</span>
                <button
                  type="button"
                  className="chipbtn"
                  onClick={() => unblock(u.id)}
                >
                  Разблокировать
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* О ПРИЛОЖЕНИИ */}
      <div className="set-group">
        <div className="set-group__head">О приложении</div>

        <button
          type="button"
          className="set-row set-row--btn"
          onClick={() => setShowRules((v) => !v)}
        >
          <span>Правила пользования</span>
          <span className="set-row__chev">{showRules ? '–' : '+'}</span>
        </button>
        {showRules && (
          <ul className="onb__rules set-rules">
            {RULES.map((r) => (
              <li key={r.title}>
                <b>{r.title}.</b> {r.text}
              </li>
            ))}
          </ul>
        )}

        <div className="set-row">
          <span>Версия</span>
          <span className="muted">{pkg.version}</span>
        </div>
      </div>

      {/* ОПАСНАЯ ЗОНА */}
      <div className="set-group">
        <div className="set-group__head set-group__head--danger">Опасная зона</div>

        {!confirmDelete ? (
          <button
            type="button"
            className="btn-wide btn-wide--ghost btn-wide--danger"
            onClick={() => setConfirmDelete(true)}
          >
            Удалить аккаунт
          </button>
        ) : (
          <div className="set-confirm">
            <p>
              Аккаунт, анкета, фото, мэтчи и вся переписка удалятся безвозвратно.
            </p>
            <div className="form__actions">
              <button
                type="button"
                className="btn-wide btn-wide--ghost"
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
              >
                Отмена
              </button>
              <button
                type="button"
                className="btn-wide btn-wide--danger-solid"
                onClick={deleteAccount}
                disabled={deleting}
              >
                {deleting ? 'Удаляем…' : 'Удалить навсегда'}
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="form__error">{error}</p>}
    </div>
  );
}
