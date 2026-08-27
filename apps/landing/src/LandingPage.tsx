import { formatCoin, formatSignedCoin } from '@jjoin/domain';

const ANDROID_DOWNLOAD_URL = (import.meta.env.VITE_ANDROID_DOWNLOAD_URL ?? '').trim();
const ANDROID_DOWNLOAD_VERSION = (import.meta.env.VITE_ANDROID_DOWNLOAD_VERSION ?? '').trim();

const FEATURES = [
  {
    title: '근처 스크린골프장 찾기',
    body: '전국 스크린골프장을 지도에서 찾고 원하는 매장을 바로 선택하세요.',
  },
  {
    title: '나에게 맞는 조인 찾기',
    body: '원하는 시간과 지역의 조인을 찾고 남은 자리를 확인한 뒤 참가할 수 있습니다.',
  },
  {
    title: '직접 조인 만들기',
    body: '함께 치고 싶은 장소와 시간을 정해 직접 조인을 만들 수 있습니다.',
  },
  {
    title: '매장 모집 조인',
    body: '일부 매장에서는 참가 혜택이 있는 모집 조인도 만나볼 수 있습니다.',
  },
] as const;

const STEPS = [
  { n: '1', title: '찾기', body: '스크린골프장 또는 조인을 찾습니다.' },
  { n: '2', title: '참가하기', body: '원하는 조인에 참가합니다.' },
  { n: '3', title: '함께 플레이', body: '같은 자리에서 함께 플레이합니다.' },
] as const;

function AndroidDownloadButton({ className, label }: { className?: string; label: string }) {
  if (!ANDROID_DOWNLOAD_URL) {
    return (
      <button type="button" className={`${className ?? ''} is-disabled`} disabled>
        Android 테스트 버전 준비 중
      </button>
    );
  }

  return (
    <a
      className={className}
      href={ANDROID_DOWNLOAD_URL}
      download
      rel="noopener noreferrer"
    >
      {label}
    </a>
  );
}

export function LandingPage() {
  const versionNote = ANDROID_DOWNLOAD_VERSION
    ? `Android 테스트 버전 v${ANDROID_DOWNLOAD_VERSION}`
    : null;

  return (
    <div className="page">
      <header className="topbar">
        <p className="brand">JJOIN</p>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <p className="eyebrow">스크린골프를 더 즐겁게</p>
          <h1 id="hero-title" className="headline">
            가까운 스크린골프장에서
            <br />
            함께 칠 사람을 찾아보세요
          </h1>
          <p className="lead">
            주변 스크린골프장을 찾고, 원하는 시간과 조건의 조인에 참가하거나 직접 조인을
            만들어보세요.
          </p>
          <div className="cta-row">
            <AndroidDownloadButton className="btn btn-primary" label="Android 테스트 앱 다운로드" />
            <a className="btn btn-secondary" href="#features">
              서비스 둘러보기
            </a>
          </div>
          <p className="cta-note">Android용 테스트 버전입니다.</p>
          {versionNote ? <p className="cta-version">{versionNote}</p> : null}
          <p className="ios-note">iPhone 버전 준비 중</p>
        </section>

        <section id="features" className="section" aria-labelledby="features-title">
          <h2 id="features-title" className="section-title">
            JJOIN으로 할 수 있는 것
          </h2>
          <p className="section-lead">
            근처 스크린골프장을 찾고, 함께 플레이할 사람을 모집하고, 원하는 조인에 참가할 수
            있는 스크린골프 조인 플랫폼입니다.
          </p>
          <div className="feature-grid">
            {FEATURES.map((f) => (
              <article key={f.title} className="feature-card">
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-soft" aria-labelledby="coin-title">
          <h2 id="coin-title" className="section-title">
            참가 혜택도 한눈에
          </h2>
          <p className="section-lead">
            매장에서 제공하는 참가 혜택이 있는 경우 조인 화면에서 바로 확인할 수 있습니다.
          </p>
          <div className="chip-row" aria-label="참가 혜택 예시">
            <span className="chip">여성 참가 혜택 {formatSignedCoin(5000)}</span>
            <span className="chip">보유 {formatCoin(20000)}</span>
            <span className="chip">홀드 {formatCoin(10000)}</span>
          </div>
        </section>

        <section className="section" aria-labelledby="flow-title">
          <h2 id="flow-title" className="section-title">
            찾고 → 참가하고 → 함께 플레이
          </h2>
          <ol className="steps">
            {STEPS.map((s) => (
              <li key={s.n}>
                <span className="step-n" aria-hidden="true">
                  {s.n}
                </span>
                <div>
                  <strong>{s.title}</strong>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="section section-soft" aria-labelledby="store-title">
          <h2 id="store-title" className="section-title">
            스크린골프 매장도 JJOIN과 함께
          </h2>
          <p className="section-lead">
            매장 인증 후 직접 모집 조인을 만들고 참가 현황과 혜택을 관리할 수 있습니다. 앱에서
            매장 인증을 진행해 주세요.
          </p>
        </section>

        <section className="download-band" aria-labelledby="download-title">
          <h2 id="download-title" className="section-title">
            지금 JJOIN을 테스트해보세요
          </h2>
          <p className="section-lead">
            가까운 스크린골프장을 찾고 새로운 골프 친구를 만나보세요.
          </p>
          <AndroidDownloadButton className="btn btn-primary" label="Android 앱 다운로드" />
          {versionNote ? <p className="cta-version">{versionNote}</p> : null}
          <p className="install-hint">
            다운로드 후 Android 보안 설정에 따라 &lsquo;알 수 없는 앱 설치&rsquo; 허용이 필요할 수
            있습니다.
          </p>
        </section>
      </main>

      <footer className="footer">
        <p className="brand footer-brand">JJOIN</p>
        <p className="footer-copy">© JJOIN</p>
      </footer>
    </div>
  );
}
