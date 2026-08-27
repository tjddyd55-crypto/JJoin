const FEATURES = [
  '주변 스포츠 장소 탐색',
  '함께할 사람 모집/참여',
  '참가 보상 Coin',
  '안전한 본인확인 기반 조인',
] as const;

export function LandingPage() {
  return (
    <div className="page">
      <main className="card">
        <header className="hero">
          <p className="brand">JJOIN</p>
          <h1 className="headline">
            내 주변에서 함께 운동할 사람을 찾는
            <br />
            지역 기반 스포츠 조인 플랫폼
          </h1>
          <p className="lead">스크린골프부터 시작합니다.</p>
        </header>

        <ul className="features">
          {FEATURES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>

        <div className="status">
          <span className="badge">Android 앱 준비 중</span>
          <p className="beta">현재 베타 개발 중입니다.</p>
        </div>
      </main>

      <footer className="footer">© JJOIN</footer>
    </div>
  );
}
