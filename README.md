# seonilog

**모르는 것을 하나씩 알아가는 공대생의 학습 기록입니다.**

궁금했던 개념, 직접 확인한 예시, 아직 남은 질문을 Markdown으로 기록하는 개인 블로그입니다. Astro로 정적 페이지를 만들고, GitHub Actions를 통해 GitHub Pages에 배포하도록 구성했습니다.

- 블로그 주소: [seonizz.github.io/seonilog](https://seonizz.github.io/seonilog/)
- 저장소: [seonizz/seonilog](https://github.com/seonizz/seonilog)
- 배포 진행 상황: [GitHub Actions](https://github.com/seonizz/seonilog/actions)

위 블로그 주소는 배포 대상 주소입니다. 최초 배포 완료 여부와 이후 변경 사항의 반영 여부는 Actions에서 확인해 주세요.

## 처음 시작하신다면

1. 글만 작성하실 때는 [글 작성 안내](docs/WRITING.md)를 따라 주세요. GitHub 웹에서도 작성할 수 있습니다.
2. 화면 디자인을 Claude Code에 맡기실 때는 [CLAUDE.md](CLAUDE.md)를 먼저 읽도록 요청해 주세요.
3. 컴퓨터에서 블로그를 확인하거나 기능을 수정하실 때는 아래 실행 방법을 사용해 주세요.

## 준비된 구조

- 최신 글과 전체 글 목록
- Markdown 글 상세 페이지와 본문 목차
- 태그별 글 목록과 검색
- 블로그 소개와 404 페이지
- RSS, sitemap, 검색·공유용 메타데이터
- 초안 및 미래 날짜 글의 공개 빌드 제외
- GitHub Pages 자동 배포 설정

카테고리를 미리 늘리지 않고 태그로 글을 분류합니다. 디자인은 최소한의 읽기·탐색 기능을 갖춘 상태에서 별도로 발전시킬 수 있도록 분리합니다.

## 컴퓨터에서 실행하기

[Node.js](https://nodejs.org/) **24 버전**을 권장합니다. 최소 요구 버전은 `22.23.4`입니다. Node.js를 설치하면 npm도 함께 설치됩니다.

저장소를 내려받은 뒤 해당 폴더에서 실행해 주세요.

```sh
npm ci
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 여시면 됩니다. 사이트가 `/seonilog/` 경로를 사용하므로 이 경로까지 포함해 접속해 주세요.

개발 서버에서는 초안과 미래 날짜의 글도 확인할 수 있습니다. 실제 공개 대상만 보려면 배포용 빌드를 사용해 주세요.

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 수정 사항을 확인하는 개발 서버 실행 |
| `npm run check` | Astro 및 TypeScript 검사 |
| `npm test` | 기능 테스트 실행 |
| `npm run build` | 공개용 정적 사이트를 `dist/`에 생성 |
| `npm run verify` | 빌드된 결과의 링크와 공개 데이터 등 검증 |
| `npm run new:post -- english-slug "한글 제목"` | 새 초안 파일 생성 |

## 새 글 작성하기

```sh
npm run new:post -- my-first-note "첫 번째 학습 기록"
```

생성된 `src/content/blog/my-first-note.md`를 열어 제목, 요약, 태그와 본문을 채워 주세요. 공개할 준비가 되면 `draft: false`로 바꾸고, `pubDate`가 오늘 또는 과거 날짜인지 확인한 뒤 커밋해 주세요.

```yaml
---
title: "첫 번째 학습 기록"
description: "이번에 이해한 내용을 한 문장으로 소개합니다."
pubDate: 2026-11-03
tags: ["학습기록"]
draft: false
---
```

`draft: true`는 **블로그에서만 글을 숨깁니다.** 이 저장소는 공개 저장소이므로 초안 파일의 원문도 GitHub에서 볼 수 있습니다. 비공개 메모는 저장소에 올리지 말아 주세요.

미래 날짜를 지정해도 해당 시각에 자동으로 발행되지는 않습니다. 날짜가 지난 뒤 다음 빌드가 실행될 때 공개 대상에 포함됩니다.

코드나 글 구조를 수정한 뒤에는 다음 순서로 확인할 수 있습니다.

```sh
npm run check
npm test
npm run build
npm run verify
```

`verify`는 먼저 만들어진 빌드 결과를 검사하므로 `build` 다음에 실행해 주세요.

## 주요 파일

```text
src/
  content/blog/       Markdown 글
  assets/            글에서 사용할 로컬 이미지
  components/        재사용 화면 요소
  layouts/           페이지의 공통 구조
  pages/             주소별 페이지와 피드
  styles/            공통 스타일
docs/
  WRITING.md         글 작성 및 공개 방법
  DESIGN-HANDOFF.md  디자인 변경 시 지켜야 할 기능
templates/post.md     글 작성 템플릿
CLAUDE.md             Claude Code 작업 진입점
.github/workflows/    검사 및 배포 자동화
```

## 디자인 작업

색상, 서체, 간격, 카드·목록 표현, 페이지 레이아웃을 자유롭게 발전시킬 수 있습니다. 글의 데이터 형식과 URL, 초안 처리, 검색, RSS, GitHub Pages 배포는 유지해 주세요.

자세한 작업 범위와 검증 기준은 [디자인 인계 문서](docs/DESIGN-HANDOFF.md)에 정리했습니다.

## 참고 문서

- [Astro의 GitHub Pages 배포 안내](https://docs.astro.build/en/guides/deploy/github/)
- [Astro의 Markdown 안내](https://docs.astro.build/en/guides/markdown-content/)
- [Astro 콘텐츠 컬렉션 안내](https://docs.astro.build/en/guides/content-collections/)
