@AGENTS.md

# 메모 프린터 (memo-printer)

카메라로 촬영 → PrintNode 인쇄 → 인쇄 기록 리뷰하는 Expo(React Native) 안드로이드 앱.

## 스택 / 환경
- **Expo SDK 56** (React Native, Hermes), TypeScript, React Navigation(native-stack + bottom-tabs)
- 패키지: `com.echeil.memoprinter` / 앱 이름 "메모 프린터"
- Repo: `git@github.com:sungki1972/memo-printer.git` (SSH, 계정 sungki1972)
- 인쇄 서버: `https://barcode1.echeil.com` (`/api/print/image`, `/api/logs`, 재인쇄 등)

## 빌드 (로컬 release APK)
WSL2. android 폴더는 gitignore라 이미 생성돼 있음. 빌드 환경은 PATH에 없으니 명시 필요:
```bash
cd android
export JAVA_HOME=/home/gihwaja/android-dev/jdk-17.0.19+10
export ANDROID_HOME=/home/gihwaja/android-dev/android-sdk
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew assembleRelease
# 산출물: android/app/build/outputs/apk/release/app-release.apk → 루트 memo-printer.apk로 복사
```
- 증분 빌드 ~20초~2분. SDK 경로는 `android/local.properties`에 박혀 있음.
- `*.apk`/`*.aab`/`.omc/`는 gitignore. APK(120MB)는 git에 안 올림 → 배포는 **GitHub Releases**(asset 2GB 허용)로.

## 화면 구조
- 탭: **촬영**(CameraScreen) / **기록**(LogsScreen)
- 스택: Preview, LogDetail(서버 로그 상세), HistoryDetail(로컬 기록 상세)
- 기록 탭은 2개 세그먼트:
  - **내 인쇄(로컬)** = `src/services/historyStore.ts` — 이 폰에 저장된 기록. 썸네일 있음, 오프라인, CRUD(재인쇄/메모수정/삭제). 앱 삭제 시 사라짐.
  - **서버 기록** = `/api/logs` — 전체 기기 통합 로그. 이미지 URL 안 줘서 썸네일 대부분 없음, 조회 전용.

## 함정 (DEBUGGED — 재발 주의)
1. **expo-file-system v56 새 동기 API 금지.** `File/Directory.textSync()/copySync()/.exists` 등은 타입엔 있고 tsc도 통과하지만 **릴리스(Hermes) APK에서 호출 즉시 네이티브 강제종료** (JS try/catch·ErrorBoundary로 못 잡음). → `expo-file-system/legacy`의 비동기 API + 인메모리 캐시 패턴 사용(historyStore.ts 참고). AGENTS.md의 "Expo HAS CHANGED" 경고가 이것.
2. **expo-image 대신 RN 기본 Image 권장** (이번엔 무죄였지만 서버 탭 LogCard의 RN Image가 검증됨). HistoryCard/HistoryDetail은 RN Image로 통일.
3. **서버 job_id가 숫자로 올 수 있음.** `jobId.slice()` 직접 호출 금지 → 저장 시 `String()` 정규화 + 렌더 시 방어. (HistoryCard 크래시 원인이었음)
4. **WSL2는 USB 기기를 adb로 직접 못 봄.** logcat 필요 시 무선 디버깅(`adb connect`) 또는 usbipd. 기기 연결 없이 진단하려면 `src/components/ErrorBoundary.tsx`(상시 배치)가 JS 에러를 화면에 표시 — componentStack 최상단이 범인.

## 웹 뷰어 (web/)
- `web/` = 인쇄 기록을 웹에서 조회하는 Next.js 14 앱 (App Router, TypeScript, 무 Tailwind).
- **PIN 게이트 2573** (sessionStorage), 서버 통합 기록(`/api/logs`) 조회 전용 — 검색(현재 페이지)·페이지네이션·상태/타입 배지.
- **CORS 회피**: 브라우저가 `barcode1.echeil.com`을 직접 못 부르므로 `web/app/api/logs/route.ts`가 서버사이드 프록시.
- 배포: `cd web && vercel --prod` (별도 Vercel 프로젝트). 같은 memo-printer repo의 서브디렉토리.

## 현재 상태 (2026-06-07)
- main `10f5e19`까지 push 완료. 기록 탭 크래시 3종 모두 해결, 정상 작동 확인.
- 최신 APK: 루트 `memo-printer.apk` + `C:\Users\neola\Downloads\memo-printer.apk`(115MB).
- **남은 작업**: GitHub Release에 APK 첨부 → `https://github.com/sungki1972/memo-printer/releases/new` (태그 v1.0.0, APK 드래그업로드). 공식 `gh` CLI는 `~/.local/bin/gh`(v2.93)에 설치돼 있으나 미인증 — 인증 1회 하면 `gh release create`로 자동화 가능.
