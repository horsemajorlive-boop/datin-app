import { useState } from 'react';
import ScreenHeader from '../components/ScreenHeader';
import EmptyState from '../components/EmptyState';
import CityInput from '../components/CityInput';
import InterestSearchPicker from '../components/InterestSearchPicker';
import GroupCreateSheet from '../components/GroupCreateSheet';
import { IconUsers } from '../components/icons';

// Вкладка "Группы" — список диалогов ("Мои") + вкладка "Обзор" для поиска
// и вступления в новые (по умолчанию — свой город, см. browseCity).
//
// Props:
//   browseGroups   — [{ id, name, description, city, interest, photo, memberCount, isMember }]
//   myGroups       — [{ ...то же самое, unread, lastMessage }]
//   browseCity     — текущий город обзора
//   onChangeBrowseCity
//   browseInterest
//   onChangeBrowseInterest
//   defaultCity    — свой город (подставляется в форму создания)
//   busyGroupId    — id группы, для которой сейчас идёт запрос вступления
//   onJoin         — onJoin(group)
//   onOpenGroup    — открыть чат группы: onOpenGroup(groupId)
//   onCreated      — onCreated(groupId) — новая группа оплачена, пора открыть её чат

function previewText(last) {
  if (!last) return 'Пока никто не писал — начните первым';
  const body = last.type === 'photo' ? 'Фотография' : last.text;
  return (last.fromMe ? 'Вы: ' : '') + body;
}

export default function GroupsScreen({
  browseGroups,
  myGroups,
  browseCity,
  onChangeBrowseCity,
  browseInterest,
  onChangeBrowseInterest,
  defaultCity,
  busyGroupId,
  onJoin,
  onOpenGroup,
  onCreated,
}) {
  const [subTab, setSubTab] = useState('mine'); // 'mine' | 'browse'
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="screen">
      <ScreenHeader title="Группы" />

      <div className="chattabs">
        <button
          type="button"
          className={`chattabs__btn ${subTab === 'mine' ? 'is-on' : ''}`}
          onClick={() => setSubTab('mine')}
        >
          Мои
        </button>
        <button
          type="button"
          className={`chattabs__btn ${subTab === 'browse' ? 'is-on' : ''}`}
          onClick={() => setSubTab('browse')}
        >
          Обзор
        </button>
      </div>

      {subTab === 'mine' ? (
        myGroups.length === 0 ? (
          <EmptyState
            icon={<IconUsers />}
            title="Пока нет групп"
            text="Вступите в группу по интересам в своём городе — или создайте свою."
            actionLabel="Смотреть группы"
            onAction={() => setSubTab('browse')}
          />
        ) : (
          <div className="matchlist">
            {myGroups.map((g) => (
              <button className="matchlist__item" key={g.id} onClick={() => onOpenGroup(g.id)}>
                <span className="matchlist__ava">
                  {g.photo ? (
                    <img src={g.photo} alt={g.name} />
                  ) : (
                    <span className="group-avatar-fallback group-avatar-fallback--lg">
                      <IconUsers />
                    </span>
                  )}
                </span>
                <div className="matchlist__info">
                  <span className="matchlist__name">{g.name}</span>
                  <span className={`matchlist__hint ${!g.lastMessage ? 'is-new' : ''}`}>
                    {previewText(g.lastMessage)}
                  </span>
                </div>
                {g.unread > 0 && (
                  <span className="matchlist__badge matchlist__badge--count">
                    {g.unread > 9 ? '9+' : g.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        )
      ) : (
        <>
          <div className="groups-filters">
            <div className="field">
              <span>Город</span>
              <CityInput value={browseCity} onChange={onChangeBrowseCity} placeholder="Выберите город" />
            </div>
            <div className="field">
              <span>Интерес</span>
              <InterestSearchPicker value={browseInterest} onChange={onChangeBrowseInterest} />
            </div>
          </div>

          <button type="button" className="btn-wide groups-create-btn" onClick={() => setShowCreate(true)}>
            + Создать группу
          </button>

          {browseGroups.length === 0 ? (
            <EmptyState
              icon={<IconUsers />}
              title={browseCity ? 'В этом городе пока пусто' : 'Выберите город'}
              text={
                browseCity
                  ? 'Групп с такими фильтрами ещё нет — станьте первым, кто создаст.'
                  : 'Укажите город, чтобы увидеть группы рядом.'
              }
            />
          ) : (
            <div className="groups-list">
              {browseGroups.map((g) => (
                <article className="groupcard" key={g.id}>
                  <button
                    type="button"
                    className="groupcard__main"
                    onClick={() => (g.isMember ? onOpenGroup(g.id) : undefined)}
                  >
                    <span className="groupcard__photo">
                      {g.photo ? (
                        <img src={g.photo} alt={g.name} />
                      ) : (
                        <span className="group-avatar-fallback group-avatar-fallback--lg">
                          <IconUsers />
                        </span>
                      )}
                    </span>
                    <span className="groupcard__info">
                      <span className="groupcard__name">{g.name}</span>
                      {g.description && <span className="groupcard__desc">{g.description}</span>}
                      <span className="groupcard__meta">
                        {g.interest && `${g.interest} · `}
                        {g.memberCount} {g.memberCount === 1 ? 'участник' : 'участников'}
                      </span>
                    </span>
                  </button>
                  {g.isMember ? (
                    <button type="button" className="groupcard__joined" onClick={() => onOpenGroup(g.id)}>
                      Открыть
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="groupcard__join"
                      disabled={busyGroupId === g.id}
                      onClick={() => onJoin(g)}
                    >
                      {busyGroupId === g.id ? 'Вступаем…' : 'Вступить'}
                    </button>
                  )}
                </article>
              ))}
            </div>
          )}
        </>
      )}

      {showCreate && (
        <GroupCreateSheet
          defaultCity={browseCity || defaultCity}
          onClose={() => setShowCreate(false)}
          onCreated={(groupId) => {
            setShowCreate(false);
            onCreated(groupId);
          }}
        />
      )}
    </div>
  );
}
