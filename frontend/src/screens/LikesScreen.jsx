// Экран "Симпатии": сетка анкет, которые пользователь лайкнул.
// Пока это просто список на нашей стороне. Позже здесь будут ВЗАИМНЫЕ симпатии
// (мэтчи) — когда backend подтвердит, что вы понравились друг другу.
//
// Props:
//   liked — массив лайкнутых анкет

export default function LikesScreen({ liked }) {
  if (liked.length === 0) {
    return (
      <div className="screen">
        <h1 className="screen__title">Симпатии</h1>
        <p className="muted">Вы ещё никого не лайкнули. Полистайте анкеты во вкладке «Поиск».</p>
      </div>
    );
  }

  return (
    <div className="screen">
      <h1 className="screen__title">Симпатии ({liked.length})</h1>
      <div className="grid">
        {liked.map((profile) => (
          <div className="grid__cell" key={profile.id}>
            <img src={profile.photos[0]} alt={profile.name} />
            <span>
              {profile.name}, {profile.age}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
