// ─── i18n: EN ↔ KO toggle ──────────────────────────────────────────────
// KO 사전은 Google Docs("Jiwon Yang Portfolio — Website Copy")와 동기화됩니다.
// 내용 수정은 Google Docs에서 → Claude가 이 파일과 EN HTML에 반영.
(function () {
  const KO = {
 "g.nav": "<< 포트폴리오",
 "g.next": "다음 프로젝트",
 "g.backto": "돌아가기",
 "g.work": "작업",
 "g.meta.year": "연도",
 "g.meta.role": "역할",
 "g.meta.medium": "매체",
 "g.meta.tools": "도구",
 "main.nametag": "포트폴리오",
 "main.hint": "아래로 스크롤  ↓",
 "main.pool.sub": "— 이 포트폴리오 사용법",
 "main.pool.p1": "이 사이트는 수영장입니다. 물 위에 떠 있는 오브젝트 하나하나가 <b>하나의 프로젝트</b> — 떠다니고, 일렁이며, 건져지기를 기다리고 있어요.",
 "main.pool.p2": "<b>스크롤</b> — 풀 아래쪽으로 내려가면 더 많은 작업을 만날 수 있어요.",
 "main.pool.p3": "<b>호버 / 탭</b> — 오브젝트에 이름이 표시됩니다. 한 번 더 탭하면 입장!",
 "main.pool.p4": "<b>마이크</b> — 물이 소리를 듣게 해보세요. 말을 걸면 물결이 대답합니다.",
 "main.pool.p5": "디자인 &amp; 제작: <b>양지원</b> — 풀 가운데 이름을 탭하면 저를 더 알아볼 수 있어요.",
 "playground.tag": "피지컬 컴퓨팅 · 2026",
 "playground.intro": "화면이 바라보는 표면이 아니라, 만지고 누르고 흐트러뜨리는 표면이라면? 모래가 인터페이스가 되고, 데이터가 풍경이 됩니다.",
 "playground.h2.1": "터치 × 모래: 물리적 인터페이스",
 "playground.h2.2": "재료에서 인터랙션으로",
 "playground.h2.3": "손이 아는 것들",
 "playground.p.1": "플레이그라운드는 <span class=\"hl-blue\">물리적 재료</span>와 <span class=\"hl-pink\">디지털 피드백</span> 사이의 경계를 탐구합니다. 모래 기반 표면에 정전용량 센서를 심어 압력과 제스처를 실시간 시각 반응으로 번역하고 — 촉각적이면서 직관적이고, <span class=\"hl-teal\">예상을 벗어나는 놀이</span>를 초대합니다.",
 "playground.p.2": "프로젝트는 <span class=\"hl-yellow\">재료 연구</span>에서 시작했습니다 — 모래·소금·쌀 같은 입자 재료가 촉감과 센서 전도성 면에서 터치에 어떻게 반응하는지 실험했고, 해상도와 지연시간의 균형을 위해 <span class=\"hl-mark\">16×16 정전용량 센서 어레이</span>를 선택했습니다.",
 "playground.p.3": "압력 데이터는 시리얼로 <span class=\"hl-blue\">TouchDesigner</span>에 전달되어 파티클 시스템이 실시간으로 반응합니다: 세게 누르면 더 밝고 촘촘한 파티클이 모이고, 살짝 그으면 잔상이 남으며 사라집니다.",
 "playground.p.4": "가장 놀라웠던 것은 방문객들이 — 아무런 안내 없이 — 글자를 그렸다가 지우고, 그저 천천히 원을 그리기 시작했다는 점입니다. 이 인터페이스는 터치스크린이 좀처럼 허락하지 않는 <span class=\"hl-pink\">명상적인 몰입</span>을 이끌어냈습니다.",
 "playground.meta.role": "디자이너 / 개발",
 "playground.meta.medium": "터치 인터페이스",
 "chorus.tag": "인터랙티브 설치 · 2025",
 "chorus.intro": "코러스는 소리와 빛을 하나의 재료로 다루는 인터랙티브 설치입니다 — 목소리가 겹치면, 빛도 겹칩니다.",
 "chorus.h2.1": "빛 × 소리: 반응하는 건축",
 "chorus.h2.2": "주파수가 형태가 되다",
 "chorus.h2.3": "사회적 공간을 위한 디자인",
 "chorus.p.1": "수직 파이프 기둥들이 <span class=\"hl-blue\">공간의 소리</span>에 반응합니다 — 각 파이프가 독립적으로 빛나며, 방 안의 소리 풍경이 변할 때마다 밝기와 색이 함께 움직입니다. 이 설치는 수동적인 듣기를 <span class=\"hl-pink\">눈에 보이는 공간적 현상</span>으로 바꿉니다.",
 "chorus.p.2": "목소리가 겹치면 빛이 겹칩니다. 침묵이 내려앉으면, <span class=\"hl-teal\">빛이 숨을 쉽니다</span>.",
 "chorus.p.3": "오디오는 <span class=\"hl-blue\">Max/MSP의 FFT</span>로 실시간 분석됩니다. 주파수 스펙트럼을 서브베이스·베이스·미드·하이 네 대역으로 나누어 네 개의 파이프 기둥에 각각 매핑했습니다. <span class=\"hl-yellow\">진폭은 밝기를 움직이고</span>, 지속되는 음은 공간의 에너지를 따라 차오르고 잦아드는 느린 색의 물결을 만듭니다.",
 "chorus.p.4": "각 튜브의 확산 소재는 <span class=\"hl-mark\">열두 가지 밀도</span>를 테스트한 끝에 색 재현력과 부드러움의 균형점으로 선택했습니다.",
 "chorus.p.5": "코러스는 갤러리 로비 — 전시장에 들어가기 전 사람들이 잠시 머무는 전이 공간 — 에서 전시되었습니다. 이 작업은 <span class=\"hl-pink\">주의를 요구하지 않으면서 주의에 보답하도록</span> 설계되었습니다: 배경적 환경으로 존재하다가, 알아차린 사람에게는 다르게 듣기를 권하는 초대가 됩니다.",
 "chorus.meta.role": "디자이너 / 엔지니어",
 "chorus.meta.medium": "빛 &amp; 소리",
 "sendlove.tag": "아크릴 조각 · 2025",
 "sendlove.intro": "센드러브는 보이지 않는 것 — 말해진 메시지 — 를 붙잡아 멈춰 세웁니다. 말하는 순간의 덧없음이 손에 쥘 수 있는 것으로 얼어붙습니다.",
 "sendlove.h2.1": "목소리 파형이 사물이 되다",
 "sendlove.h2.2": "소리에서 물질로",
 "sendlove.h2.3": "한마디의 무게",
 "sendlove.p.1": "관람자가 짧은 문장을 녹음하면 <span class=\"hl-blue\">목소리 파형</span>이 추출·단순화되어 <span class=\"hl-teal\">겹겹이 쌓인 아크릴판</span>에 새겨집니다. 조각 하나하나가 그것을 만든 목소리에 고유합니다. <span class=\"hl-pink\">같은 파형도, 같은 사물도 둘은 없습니다</span>.",
 "sendlove.p.2": "오디오는 <span class=\"hl-blue\">Web Audio API</span>로 브라우저에서 녹음됩니다. 커스텀 p5.js 스케치가 파형을 분석하고 <span class=\"hl-yellow\">RDP 경로 단순화</span>를 적용해, 음절과 숨의 본질적인 형태는 지키면서 노이즈를 걷어냅니다.",
 "sendlove.p.3": "단순화된 경로는 DXF로 내보내 <span class=\"hl-mark\">3mm 투명 아크릴</span> 다섯 장에 서로 다른 깊이로 레이저 커팅했습니다. 파형에 부피가 생기고, 지질학적 시간의 감각이 깃듭니다.",
 "sendlove.p.4": "제목은 참여자에게 건넨 한 문장에서 왔습니다: <span class=\"hl-blue\">\"누군가에게 보내고 싶은 말을 해주세요.\"</span> 모든 세션을 통틀어 가장 많았던 대답은 <span class=\"hl-pink\">\"사랑해\"</span>의 변주였습니다. 이 프로젝트는 뜻밖에도, 사람들이 무엇을 간직하고 싶어하는지에 대한 연구가 되었습니다.",
 "sendlove.meta.role": "디자이너 / 제작",
 "sendlove.meta.medium": "아크릴, 목소리",
 "cocoon.tag": "인터랙티브 조명 · 2026",
 "cocoon.intro": "숨쉬는 리빙 조명 — 셸이 천천히 부풀고 가라앉으며, 은은한 빛을 차분하고 몸에 와닿는 존재감으로 바꿉니다.",
 "cocoon.h2.1": "숨쉬는 빛",
 "cocoon.p.1": "코쿤은 <span class=\"hl-blue\">움직임</span>이 빛을 살아있게 만드는 방식을 탐구합니다. 부드러운 골지 셸이 느린 리듬으로 들숨과 날숨을 반복해서, 이 조명은 기기라기보다 방을 함께 쓰는 <span class=\"hl-pink\">조용한 동반자</span>처럼 읽힙니다.",
 "cocoon.meta.role": "디자이너",
 "cocoon.meta.medium": "인터랙티브 조명",
 "foldit.tag": "모바일 게임 컨셉 · 2025",
 "foldit.intro": "진짜 종이를 접는 콜렉팅 게임 — 원하는 아이템을 손으로 접고, AI 오브젝트 인식이 그것을 게임 속으로 데려옵니다.",
 "foldit.h2.1": "현실에서 접고, 게임에서 모으다",
 "foldit.p.1": "폴드잇은 <span class=\"hl-blue\">종이접기</span>를 게임 메커닉으로 바꿉니다: 플레이어가 종이 아이템을 직접 접어 카메라로 스캔하면, <span class=\"hl-pink\">AI 오브젝트 인식</span>이 접은 것을 알아보고 컬렉션에 추가합니다 — <span class=\"hl-teal\">손과 화면</span>을 오가는 순환이죠.",
 "foldit.meta.role": "컨셉 / 게임 디자인",
 "foldit.meta.medium": "모바일 게임 + AI",
 "tidepool.tag": "클리커 토이 + AR · 2026",
 "tidepool.intro": "데스크탑 디오라마 클리커 토이 — 버튼을 눌러 물고기에게 먹이를 주고 키우다가, AR로 들여다보면 조수웅덩이가 살아납니다.",
 "tidepool.h2.1": "책상 위의 작은 바다",
 "tidepool.p.1": "타이드풀은 <span class=\"hl-blue\">물리적 클리커 디오라마</span>와 <span class=\"hl-teal\">AR 뷰</span>를 짝지었습니다: 클릭할 때마다 물고기에게 먹이가 가고, AR 레이어에서 물고기가 자라고 헤엄치는 모습을 볼 수 있습니다. <span class=\"hl-pink\">절반은 책상 위에, 절반은 화면 속에</span> 사는 작은 생태계입니다.",
 "tidepool.meta.role": "디자이너",
 "tidepool.meta.medium": "프로덕트 + AR",
 "silhouette.tag": "피젯 퍼즐 토이 · 2인 팀 · 2025–2026",
 "silhouette.intro": "시각이 아닌 감각으로 길을 알려주는 두 개의 피젯 퍼즐 토이 — AUD는 소리로 힌트를 속삭이고, VIB는 진동으로 미로를 그려줍니다.",
 "silhouette.h2.1": "귀와 손으로 푸는 퍼즐",
 "silhouette.p.1": "실루엣 시리즈는 <span class=\"hl-blue\">시각이 한 걸음 물러났을 때</span> 퍼즐이 어떻게 느껴지는지 묻습니다. <span class=\"hl-pink\">AUD:실루엣</span>은 청각 힌트를 주어 들으며 나아가게 하고, <span class=\"hl-teal\">VIB:실루엣</span>은 진동으로 미로를 손바닥에 웅웅 새겨줍니다.",
 "silhouette.meta.role": "디자이너 — 2인 팀",
 "silhouette.meta.medium": "프로덕트 / 햅틱 &amp; 사운드",
 "bubblelink.tag": "NFC 키링 · 2025",
 "bubblelink.intro": "말풍선 모양 키링 속에 NFC 태그가 들어 있습니다 — 공유하고 싶은 링크를 저장해두고, 명함을 건네듯 폰을 톡 갖다 대세요.",
 "bubblelink.h2.1": "매달고 다니는 명함",
 "bubblelink.p.1": "버블링크는 <span class=\"hl-blue\">공유 가능한 링크</span>를 통통한 말풍선 참 안에 담습니다. 폰을 버블에 갖다 대면 저장된 페이지가 열립니다 — 열쇠고리에 사는 <span class=\"hl-pink\">새로운 방식의 명함</span>입니다.",
 "bubblelink.meta.role": "디자이너",
 "bubblelink.meta.medium": "프로덕트 / NFC",
 "iml.tag": "WebGL + 머신러닝 · 2026",
 "iml.intro": "라이브 오디오 — 음높이, 크기, 음색 — 를 3D 제너러티브 씬에 매핑하는 브라우저 기반 크리에이티브 툴. 인터랙티브 머신러닝으로 만듭니다.",
 "iml.h2.1": "소리 → 모션 그래픽, 머신러닝으로",
 "iml.h2.2": "체화된 조작을 위한 파이프라인",
 "iml.h2.3": "만들며 하는 디자인 리서치",
 "iml.p.1": "IML 워크스테이션은 <span class=\"hl-blue\">인터랙티브 머신러닝</span>으로 라이브 오디오 특징 — 음높이·크기·음색 — 을 Three.js로 만든 <span class=\"hl-teal\">3D 제너러티브 씬</span>의 파라미터에 매핑합니다. 사용자는 예시를 들려주는 방식으로 매핑을 <span class=\"hl-pink\">실시간</span>으로 직접 학습시킵니다.",
 "iml.p.2": "오디오는 <span class=\"hl-blue\">Web Audio API</span>로 수집되고 커스텀 FFT 파이프라인으로 스펙트럼 특징을 분석합니다. 특징값은 OSC로 <span class=\"hl-yellow\">Wekinator</span>에 전송되어 k-NN 회귀 모델이 실시간으로 돌아갑니다.",
 "iml.p.3": "Wekinator의 출력 — <span class=\"hl-mark\">0–1 파라미터</span> 집합 — 은 다시 브라우저로 돌아와 Three.js 셰이더 유니폼에 매핑됩니다: 파티클 수, 궤도 반경, 색온도, 회전 속도.",
 "iml.p.4": "<span class=\"hl-blue\">서울대 인터랙티브 미디어 랩(IML)</span>에서 제너러티브 시스템과의 체화된 인터랙션을 탐구하는 리서치 프로토타입으로 개발되었습니다. 사용자 테스트에서 비전문가 참여자들이 <span class=\"hl-pink\">90초 안에 학습 루프를 이해</span>했고, 고정 매핑 버전보다 훨씬 오래 시스템에 머물렀습니다.",
 "iml.meta.role": "디자인 / 개발",
 "iml.meta.medium": "WebGL, 머신러닝",
 "graphics.tag": "소규모 작업 선집",
 "graphics.intro": "작은 그래픽 작업들의 아카이브 — 포스터, 아이덴티티, 그리고 인쇄와 디지털을 오가는 실험들.",
 "graphics.h2.1": "작은 조각들, 함께 모아두기",
 "graphics.p.1": "모든 아이디어에 센서가 필요한 건 아니니까요. 큰 프로젝트들 사이사이 만든 <span class=\"hl-blue\">포스터</span>, <span class=\"hl-pink\">아이덴티티</span>, <span class=\"hl-teal\">타이포 실험</span>이 쌓여가는 선반입니다.",
 "graphics.meta.role": "디자이너",
 "graphics.meta.medium": "인쇄 &amp; 디지털",
 "about.tag": "인터랙션 디자이너 · 서울",
 "about.intro": "소리, 촉감, 빛을 놀이의 경험으로 바꿉니다 — 눈만이 아니라 온몸으로 느끼는 인터랙션을 디자인합니다.",
 "about.h2.1": "만지고, 듣고, 갖고 노는 디자인",
 "about.p.1": "안녕하세요! <span class=\"hl-blue\">피지컬 컴퓨팅</span>, <span class=\"hl-pink\">인터랙티브 설치</span>, <span class=\"hl-teal\">크리에이티브 코딩</span>을 가로지르며 작업하는 디자이너 양지원입니다. 반응하는 것들을 만듭니다 — 그림을 그리는 모래, 빛을 지휘하는 오르간, 목소리를 붙잡아둔 조각.",
 "about.p.2": "제 작업은 단순한 믿음에서 출발합니다: 인터페이스가 꼭 유리 직사각형일 필요는 없다는 것. <span class=\"hl-blue\">진동으로 힌트를 속삭이는 피젯 퍼즐</span>이든 <span class=\"hl-pink\">숨쉬는 조명</span>이든, 기술이 기술처럼 느껴지기를 멈추고 <span class=\"hl-mark\">놀이</span>처럼 느껴지기 시작하는 순간을 찾습니다.",
 "about.p.3": "<span class=\"hl-pink\">협업</span>, <span class=\"hl-blue\">전시</span>, 그리고 인터랙티브한 것들을 만드는 일에 대한 대화라면 언제든 환영합니다.",
 "about.meta.basedin": "거점",
 "about.meta.study": "학력",
 "about.meta.focus": "분야",
 "about.meta.contact": "연락처",
 "about.meta.basedin.v": "서울, 대한민국",
 "about.meta.study.v": "서울대학교 — 디자인",
 "about.meta.focus.v": "피지컬 컴퓨팅, 크리에이티브 코딩",
 "about.cv": "CV 보기 ( PDF ) ↗",
 "wip.tag": "진행 중 · 현재 헤엄치는 중",
 "wip.intro": "아직 물속에 있는 것들 — 움직이고 있는 리서치와 실험, 수면 위로 떠오르기 전의 작업들.",
 "wip.wip.1": "학생 프로젝트 팀의 그룹 토론을 눈에 보이게 만드는 XR 협업 코파일럿. 팀원들이 XR 회의실에서 함께 문제를 논의하는 동안 AI가 모든 발화를 주장·근거·질문·반박·합의로 구조화합니다. 구조화된 대화는 XR 공간 안에서 2D와 3D 노드 그래프로 자라나고, AI 에이전트가 토론 메모리를 바탕으로 논리적 빈틈과 참여 불균형을 실시간으로 피드백합니다.",
 "wip.wip.2": "<a href=\"https://virtualdojolab.com/\" target=\"_blank\" rel=\"noopener\">Virtual Dojo</a>와 협업하는 인터랙티브 사운드–식물 미디어아트 프로젝트. 살아있는 식물과 소리가 하나의 악기로 만납니다 — 유기물이 연주하고, 반응하고, 연주될 수 있는 방식에 대한 진행형 탐구입니다.",
 "wip.wip.3": "더 많은 실험들이 이쪽으로 헤엄쳐 오고 있어요. 곧 다시 확인해 주세요 — 물속에 뭐가 있는지 궁금하다면 <a href=\"mailto:jwyang29@snu.ac.kr\">메일을 보내주세요</a>.",
 "wip.hint": "스와이프하거나 버튼으로 넘겨보세요"
};

  function apply(lang) {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      if (lang === 'ko') {
        if (!(key in KO)) return;
        if (el.dataset.en === undefined) el.dataset.en = el.innerHTML;
        el.innerHTML = KO[key];
      } else if (el.dataset.en !== undefined) {
        el.innerHTML = el.dataset.en;
      }
    });
    document.documentElement.lang = lang;
    document.querySelectorAll('.lang-toggle').forEach((b) => {
      b.textContent = lang === 'ko' ? 'EN' : 'KO';
    });
    try { localStorage.setItem('lang', lang); } catch (e) {}
  }

  function current() {
    try { return localStorage.getItem('lang') || 'en'; } catch (e) { return 'en'; }
  }

  function init() {
    apply(current());
    document.querySelectorAll('.lang-toggle').forEach((b) => {
      b.addEventListener('click', () => {
        apply(document.documentElement.lang === 'ko' ? 'en' : 'ko');
      });
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
