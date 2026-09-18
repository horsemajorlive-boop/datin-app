// Тесты групп по интересам (models.js): платное создание (черновик -> оплата
// -> видимость), бесплатное вступление, роли (владелец/участник), чат группы.
// Изолированная временная БД — тот же приём, что и в остальных test-файлах.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

process.env.DB_PATH = path.join(os.tmpdir(), `tiamo-test-groups-${process.pid}.db`);

const model = await import('../src/models.js');
const { db } = await import('../src/db.js');

let nextId = 800000;
function makeUser(overrides = {}) {
  const id = nextId++;
  model.upsertUser({ id, first_name: `User${id}`, username: null });
  model.saveProfile(id, {
    name: `User${id}`,
    age: 25,
    city: 'Москва',
    gender: 'f',
    bio: '',
    interests: ['A', 'B', 'C', 'D', 'E'],
    housing: 'rent',
    car: 'no',
    employment: 'working',
    goal: 'relationship',
    kids: 'maybe',
    ...overrides,
  });
  return id;
}

// Создать и сразу "оплатить" группу — короткий путь для тестов, которым
// сама механика оплаты не важна.
function makePaidGroup(ownerId, overrides = {}) {
  const { groupId } = model.createGroupDraft(ownerId, {
    name: 'Бегуны по утрам',
    description: 'Встречаемся по субботам',
    city: 'Москва',
    interest: 'Бег',
    ...overrides,
  });
  model.finalizeGroupPayment(groupId, ownerId);
  return groupId;
}

test.after(() => {
  db.close();
  fs.rmSync(process.env.DB_PATH, { force: true });
});

// ---------- создание и оплата ----------

test('createGroupDraft требует название и город', () => {
  const owner = makeUser();
  assert.equal(model.createGroupDraft(owner, { city: 'Москва' }).error, 'bad_input');
  assert.equal(model.createGroupDraft(owner, { name: 'Клуб' }).error, 'bad_input');
});

test('черновик группы не виден в listGroups, пока не оплачен', () => {
  const owner = makeUser();
  const { groupId } = model.createGroupDraft(owner, { name: 'Черновик', city: 'Казань' });
  const ids = model.listGroups(owner, { city: 'Казань' }).map((g) => g.id);
  assert.ok(!ids.includes(groupId));
});

test('создатель — сразу владелец черновика (виден в getMyGroups) даже до оплаты нет', () => {
  const owner = makeUser();
  const { groupId } = model.createGroupDraft(owner, { name: 'Черновик', city: 'Казань' });
  // getMyGroups фильтрует по paid_at IS NOT NULL — неоплаченного черновика там тоже быть не должно
  assert.ok(!model.getMyGroups(owner).some((g) => g.id === groupId));
});

test('finalizeGroupPayment: платить может только владелец черновика', () => {
  const owner = makeUser();
  const stranger = makeUser();
  const { groupId } = model.createGroupDraft(owner, { name: 'Клуб', city: 'Казань' });
  assert.equal(model.finalizeGroupPayment(groupId, stranger).error, 'not_found');
  assert.equal(model.finalizeGroupPayment(groupId, owner).ok, true);
});

test('finalizeGroupPayment повторно — ошибка (уже оплачена)', () => {
  const owner = makeUser();
  const { groupId } = model.createGroupDraft(owner, { name: 'Клуб', city: 'Казань' });
  model.finalizeGroupPayment(groupId, owner);
  assert.equal(model.finalizeGroupPayment(groupId, owner).error, 'not_found');
});

test('после оплаты группа появляется в listGroups с корректными полями', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner, { city: 'Сочи', interest: 'Йога' });
  const found = model.listGroups(owner, { city: 'Сочи' }).find((g) => g.id === groupId);
  assert.ok(found);
  assert.equal(found.interest, 'Йога');
  assert.equal(found.memberCount, 1); // владелец уже участник
  assert.equal(found.isOwner, true);
  assert.equal(found.isMember, true);
});

// ---------- видимость по городу/интересу ----------

test('listGroups фильтрует по городу и по интересу независимо', () => {
  const owner = makeUser();
  const msk = makePaidGroup(owner, { name: 'МСК Бег', city: 'Москва', interest: 'Бег' });
  const spb = makePaidGroup(owner, { name: 'СПБ Бег', city: 'Санкт-Петербург', interest: 'Бег' });
  const mskYoga = makePaidGroup(owner, { name: 'МСК Йога', city: 'Москва', interest: 'Йога' });

  const mskAll = model.listGroups(owner, { city: 'Москва' }).map((g) => g.id);
  assert.ok(mskAll.includes(msk) && mskAll.includes(mskYoga) && !mskAll.includes(spb));

  const mskRunning = model.listGroups(owner, { city: 'Москва', interest: 'Бег' }).map((g) => g.id);
  assert.ok(mskRunning.includes(msk) && !mskRunning.includes(mskYoga));
});

// ---------- вступление и выход ----------

test('вступление в группу бесплатно и мгновенно', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const joiner = makeUser();
  assert.equal(model.joinGroup(joiner, groupId).ok, true);
  assert.equal(model.listGroups(joiner, { city: 'Москва' }).find((g) => g.id === groupId).isMember, true);
});

test('нельзя вступить дважды', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const joiner = makeUser();
  model.joinGroup(joiner, groupId);
  assert.equal(model.joinGroup(joiner, groupId).error, 'already_member');
});

test('нельзя вступить в неоплаченный черновик', () => {
  const owner = makeUser();
  const { groupId } = model.createGroupDraft(owner, { name: 'Черновик', city: 'Москва' });
  const joiner = makeUser();
  assert.equal(model.joinGroup(joiner, groupId).error, 'not_found');
});

test('обычный участник может выйти, владелец — нет', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const member = makeUser();
  model.joinGroup(member, groupId);

  assert.equal(model.leaveGroup(member, groupId).ok, true);
  assert.equal(model.leaveGroup(owner, groupId).error, 'owner_cannot_leave');
});

test('leaveGroup для не-участника — ошибка not_member', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const stranger = makeUser();
  assert.equal(model.leaveGroup(stranger, groupId).error, 'not_member');
});

// ---------- удаление группы и исключение ----------

test('удалить группу может только владелец', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const stranger = makeUser();
  assert.equal(model.deleteGroup(stranger, groupId).error, 'not_found');
  assert.equal(model.deleteGroup(owner, groupId).ok, true);
  assert.equal(model.getGroup(owner, groupId), null);
});

test('удаление группы каскадом убирает участников и сообщения', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const member = makeUser();
  model.joinGroup(member, groupId);
  model.addGroupMessage(groupId, member, { text: 'привет' });

  model.deleteGroup(owner, groupId);
  const row = db.prepare('SELECT COUNT(*) AS n FROM group_members WHERE group_id = ?').get(groupId);
  const msgRow = db.prepare('SELECT COUNT(*) AS n FROM group_messages WHERE group_id = ?').get(groupId);
  assert.equal(row.n, 0);
  assert.equal(msgRow.n, 0);
});

test('исключить участника может только владелец, себя исключить нельзя', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const member = makeUser();
  const stranger = makeUser();
  model.joinGroup(member, groupId);

  assert.equal(model.kickMember(stranger, groupId, member).error, 'not_found');
  assert.equal(model.kickMember(owner, groupId, owner).error, 'cannot_kick_self');
  assert.equal(model.kickMember(owner, groupId, member).ok, true);
  assert.equal(model.isGroupMember(groupId, member), false);
});

// ---------- getGroup ----------

test('getGroup возвращает список участников с ролями', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const member = makeUser();
  model.joinGroup(member, groupId);

  const g = model.getGroup(owner, groupId);
  const roles = Object.fromEntries(g.members.map((m) => [m.id, m.role]));
  assert.equal(roles[owner], 'owner');
  assert.equal(roles[member], 'member');
});

// ---------- чат группы ----------

test('писать в чат может только участник', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const stranger = makeUser();
  assert.equal(model.addGroupMessage(groupId, stranger, { text: 'привет' }), null);
  const msg = model.addGroupMessage(groupId, owner, { text: 'привет всем' });
  assert.equal(msg.text, 'привет всем');
  assert.equal(msg.from, 'me');
});

test('читать сообщения может только участник', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const stranger = makeUser();
  model.addGroupMessage(groupId, owner, { text: 'привет' });
  assert.equal(model.getGroupMessages(groupId, stranger), null);
  assert.equal(model.getGroupMessages(groupId, owner).length, 1);
});

test('редактировать и удалять можно только своё сообщение', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const member = makeUser();
  model.joinGroup(member, groupId);
  const msg = model.addGroupMessage(groupId, member, { text: 'ку' });

  assert.equal(model.editGroupMessage(msg.id, owner, 'подмена'), null); // не автор
  const edited = model.editGroupMessage(msg.id, member, '  привет!  ');
  assert.equal(edited.text, 'привет!');

  assert.equal(model.deleteGroupMessage(msg.id, owner), null); // не автор
  const deleted = model.deleteGroupMessage(msg.id, member);
  assert.equal(deleted.id, msg.id);
  const messages = model.getGroupMessages(groupId, member);
  assert.equal(messages.find((m) => m.id === msg.id).deleted, true);
});

test('getMyGroups считает непрочитанные и сбрасывает счётчик после markGroupRead', () => {
  const owner = makeUser();
  const groupId = makePaidGroup(owner);
  const member = makeUser();
  model.joinGroup(member, groupId);
  model.addGroupMessage(groupId, owner, { text: 'первое' });
  model.addGroupMessage(groupId, owner, { text: 'второе' });

  const before = model.getMyGroups(member).find((g) => g.id === groupId);
  assert.equal(before.unread, 2);
  assert.equal(before.lastMessage.text, 'второе');

  model.markGroupRead(groupId, member);
  const after = model.getMyGroups(member).find((g) => g.id === groupId);
  assert.equal(after.unread, 0);
});
