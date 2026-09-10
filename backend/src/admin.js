// Кто может модерировать: список id из переменной окружения ADMIN_IDS.
// Пример: ADMIN_IDS=1,777000,12345678

const ADMIN_IDS = new Set(
  String(process.env.ADMIN_IDS || '')
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
);

export function isAdmin(userId) {
  return ADMIN_IDS.has(Number(userId));
}

// Express-миддлвар: пускает дальше только админов.
export function requireAdmin(req, res, next) {
  if (!isAdmin(req.user?.id)) {
    return res.status(403).json({ error: 'только для администраторов' });
  }
  next();
}
