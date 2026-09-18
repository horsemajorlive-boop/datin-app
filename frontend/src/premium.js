// Цена Premium в Telegram Stars — только для отображения на кнопке покупки.
// Источник истины — PREMIUM_PRICE_STARS в backend/src/models.js: именно
// эта сумма реально уходит в счёт (createInvoiceLink), это значение — лишь
// то, что показываем пользователю до открытия оплаты.
export const PREMIUM_PRICE_STARS = 199;

// Цена создания группы — источник истины GROUP_CREATE_PRICE_STARS в
// backend/src/models.js, тут только для отображения на кнопке.
export const GROUP_CREATE_PRICE_STARS = 50;
