// Насколько заполнена анкета сверх обязательного минимума (имя/возраст/пол/
// фото/цель/имущество/5 интересов — это и так нужно для входа). Здесь —
// необязательные поля, которые делают анкету заметнее и понятнее.
//
// computeProfileStrength(profile) -> { percent, missing }
//   percent — 0..100
//   missing — незаполненные пункты, отсортированные по важности (вес по убыванию)

const CHECKS = [
  {
    key: 'photos',
    weight: 20,
    label: 'Добавьте ещё фото',
    done: (p) => (p.photos?.length || 0) >= 2,
  },
  {
    key: 'interests',
    weight: 20,
    label: 'Добавьте больше интересов',
    done: (p) => (p.interests?.length || 0) > 5,
  },
  {
    key: 'bio',
    weight: 15,
    label: 'Расскажите о себе',
    done: (p) => !!p.bio?.trim(),
  },
  {
    key: 'habits',
    weight: 15,
    label: 'Укажите курение и алкоголь',
    done: (p) => !!p.smoking && !!p.drinking,
  },
  {
    key: 'city',
    weight: 10,
    label: 'Укажите город',
    done: (p) => !!p.city?.trim(),
  },
  {
    key: 'height',
    weight: 10,
    label: 'Укажите рост',
    done: (p) => Number.isFinite(p.height),
  },
  {
    key: 'kids',
    weight: 10,
    label: 'Укажите отношение к детям',
    done: (p) => !!p.kids,
  },
];

const TOTAL_WEIGHT = CHECKS.reduce((sum, c) => sum + c.weight, 0); // 100

export function computeProfileStrength(profile) {
  const missing = [];
  let doneWeight = 0;

  for (const check of CHECKS) {
    if (check.done(profile)) doneWeight += check.weight;
    else missing.push({ key: check.key, label: check.label, weight: check.weight });
  }

  missing.sort((a, b) => b.weight - a.weight);

  return {
    percent: Math.round((doneWeight / TOTAL_WEIGHT) * 100),
    missing,
  };
}
