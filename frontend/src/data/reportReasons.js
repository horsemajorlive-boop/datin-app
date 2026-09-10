// Причины жалобы на пользователя. Код уходит на сервер, подпись — на клиенте.

export const REPORT_REASONS = [
  { code: 'spam', label: 'Спам или реклама' },
  { code: 'scam', label: 'Мошенник или фейк' },
  { code: 'offensive', label: 'Оскорбления, угрозы' },
  { code: 'photos', label: 'Неприемлемые фото' },
  { code: 'underage', label: 'Несовершеннолетний' },
  { code: 'other', label: 'Другое' },
];

export const reasonLabel = (code) =>
  REPORT_REASONS.find((r) => r.code === code)?.label || code;
