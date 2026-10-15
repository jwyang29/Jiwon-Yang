# Media 폴더 사용법

각 프로젝트 폴더에 정해진 이름으로 파일을 넣으면 상세페이지에 자동 표시됩니다.
파일이 없으면 그 자리에 `[ 캡션 ]` 글자만 보입니다.

권장: JPG(또는 WebP), 가로 1600px 이하, 500KB 이하 / 동영상 H.264 MP4, 20MB 이하.
PNG를 쓰고 싶으면 Claude에게 확장자 변경 요청.

## 파일 이름 규칙

대부분의 페이지는 세 칸 구조입니다.

| 파일 | 위치 |
| --- | --- |
| `hero.jpg` | 상단 큰 이미지 |
| `detail1.jpg` | 하단 그리드 왼쪽 |
| `detail2.jpg` | 하단 그리드 오른쪽 |
| `demo.mp4` | 동영상 (넣은 뒤 Claude에게 embed 요청) |

Playground만 섹션마다 이미지가 붙는 구조라 이름이 다릅니다.
Silhouette은 디테일이 세 칸입니다.

이름은 **전부 소문자, 확장자 `.jpg`**. 띄어쓰기와 한글은 쓰지 마세요.
폴더 이름은 상세페이지 파일명과 같습니다 (`ripple.html` → `media/ripple/`).

## 지금 비어 있는 칸

2026-10-15 기준 17칸. 피그마 덱에 있던 사진 다섯 장을 먼저 채웠습니다.

### Playground `media/playground/`

이미 있음: `hero.jpg`, `reading.jpg`, `overview.jpg`, `system.jpg`, `process.jpg`, `demo.mp4`

| 파일 | 어떤 사진 | 들어갈 섹션 |
| --- | --- | --- |
| `context.jpg` | 관람객이 모래를 다시 평평하게 고르는 장면 | Context |

`process.jpg`는 피그마에 있던 갠트리 조립 사진을 넣었습니다.
원래 캡션은 "골판지 리그에 센서가 흩어져 있는" 쪽이었으니, 그 사진이 따로 있으면 바꾸는 게 맞습니다.

`detail2.jpg`(모래에 선을 긋는 막대)는 아직 쓰이는 칸이 없습니다.
위 네 캡션 중 하나를 바꿔서 쓰거나, 섹션을 하나 더 만들면 됩니다.

### Nothing To Hide `media/nothingtohide/`

| 파일 | 어떤 사진 |
| --- | --- |
| `hero.jpg` | 후프 안에서 사용 중인 장면. 전신이 나오게 |
| `detail1.jpg` | 피라미드와 로드셀 |
| `detail2.jpg` | 후프 제작 디테일 |

세 장 다 피그마 More Works의 슬라이드 캡처 안에 들어 있습니다.
다만 그건 발표 슬라이드를 통째로 찍은 것이라 글씨와 레이아웃이 같이 박혀 있고,
잘라내면 한 장당 가로 250에서 350px밖에 안 나옵니다. 원본 사진이 있으면 그쪽이 낫습니다.

### Ripple `media/ripple/`

피그마 덱에서 빠진 작업이라 쓸 수 있는 사진이 없습니다.

| 파일 | 어떤 사진 |
| --- | --- |
| `hero.jpg` | 화면에 물결이 퍼지는 순간 |
| `detail1.jpg` | 스케치가 돌아가는 화면 |
| `detail2.jpg` | 초기 링 테스트 |

### AI Station `media/aistation/`

이미 있음: `hero.jpg` (피그마에 있던 조감도 렌더)

| 파일 | 어떤 사진 |
| --- | --- |
| `detail1.jpg` | 인터페이스 화면 |
| `detail2.jpg` | 팀 작업 장면 |

### Gameboy `media/gameboy/`

이미 있음: `hero.jpg` (피그마에 있던 분해도)

| 파일 | 어떤 사진 |
| --- | --- |
| `detail1.jpg` | 컨트롤러를 손에 든 모습 |
| `detail2.jpg` | 다시 조립된 모델 |

지금 `hero.jpg`는 영상 타이틀 카드라 오른쪽 위에 `Gameboy / Jiwon Yang / Arduino UNO / Processing`
글씨가 들어가 있습니다. 페이지에 이미 제목이 있으니 거슬리면 글씨 없는 렌더로 교체하세요.

### bloo `media/bloo/`

피그마 덱에서 빠진 작업이라 쓸 수 있는 사진이 없습니다.

| 파일 | 어떤 사진 |
| --- | --- |
| `hero.jpg` | 렌더와 분해도 |
| `detail1.jpg` | 3D 프린팅한 프로토타입 |
| `detail2.jpg` | 메커니즘 디테일 |

### IML `media/iml/`

피그마 덱에 들어간 적이 없어 쓸 수 있는 사진이 없습니다.

| 파일 | 어떤 사진 |
| --- | --- |
| `hero.jpg` | 상단 큰 이미지 |
| `detail1.jpg` | 디테일 1 |
| `detail2.jpg` | 디테일 2 |

IML 페이지는 캡션이 아직 `Hero Image`, `Detail 01` 같은 기본값입니다.
어떤 사진을 넣을지 정하면 캡션도 같이 바꾸는 게 좋습니다.

## 이미지가 아예 안 들어가는 페이지

| 페이지 | 지금 상태 |
| --- | --- |
| `foldit.html` | 실행 중인 게임을 iframe으로 띄움. 사진 칸 없음 |
| `wip.html` | 글만 있음 |

종이를 접고 촬영하는 쪽을 보여주고 싶으면 Foldit에 사진 칸을 만들 수 있습니다.

## 나중에 바꿀 것

Silhouette은 지금 `hero.jpg`, `detail1~3.jpg`로 AUD와 VIB가 섞여 있습니다.
`aud-hero.jpg`, `vib-render1.jpg` 처럼 나눠서 올리기로 한 상태이고,
올리고 나면 캡션과 경로를 거기에 맞춰야 합니다.

`media/graphics/`는 비어 있고 어느 페이지에서도 참조하지 않습니다.
풀에 떠 있는 `graphics.glb`와는 별개입니다.
