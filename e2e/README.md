# Mobile E2E

Appium 3 and WebdriverIO 9 exercise the example app with native touch input on Android
emulators and iOS simulators. Tests cover opening/closing the viewer, two-finger
pinch in/out, and paging left/right. Existing Jest tests remain separate.

## Install

From the repository root, use the Node version in `.nvmrc`:

```sh
nvm use
pnpm install --frozen-lockfile
npm --prefix e2e ci
npm --prefix e2e run typecheck
```

`e2e/` is an independent, private **npm** package, not a pnpm workspace. Appium's
documented local driver discovery supports npm. Its server and both drivers are
locked in `package-lock.json`; do not install global Appium drivers for these tests.
Run commands through `npm --prefix e2e` so Appium starts in this package. If you use
`APPIUM_HOME` for another project, unset it for these commands: a custom Appium home
would bypass this package's locked drivers. It is never cleared or modified by the
test runner.

The npm overrides pin patched `serialize-javascript` and the main Appium server's
`morgan`. Retain them until upstream dependency ranges include the fixes. Driver
bundles still contain `morgan@1.11.0` in their browser/WebView support dependencies;
npm overrides do not replace bundled packages, so its moderate advisory remains.
The browser-download dependency `extract-zip@2.0.1` still has an
[upstream high-severity advisory without a published fix](https://github.com/advisories/GHSA-jmr9-qjv8-65gv)
as of 2026-09-20. `npm --prefix e2e audit` therefore still reports vulnerabilities;
this is not a clean security audit. This suite uses native capabilities and locally
built applications, and does not request browser downloads. E2E dependencies are
excluded from the published React Native library. Do not use `npm audit fix --force`
to downgrade WebdriverIO across major versions; revisit the upstream fix instead.

Required native tools:

- Android: JDK 17, Android SDK/platform tools, an emulator image matching the host
  architecture, `ANDROID_HOME`, and `JAVA_HOME`.
- iOS: macOS, Xcode, CocoaPods, and an installed iOS simulator runtime.

```sh
npm --prefix e2e run doctor:android
npm --prefix e2e run doctor:ios
```

Doctor's optional tools for streaming, App Bundles, or simulator permission changes
are not required for this suite. Required checks must pass.

## Build standalone apps

```sh
npm --prefix e2e run build:android
npm --prefix e2e run build:ios
```

The scripts run Expo prebuild and compile Release applications with
`EXPO_PUBLIC_E2E=1`. Android produces `e2e/build/android/viewer.apk`; iOS produces
`e2e/build/ios/GIVE.app`. These applications contain their JS bundle and local image
fixtures, so Metro and an internet connection are not needed when running tests.
The Android artifact uses the example project's development signing configuration;
the iOS artifact is simulator-only. Neither is an App Store distribution artifact.

The generated `example/android` and `example/ios` projects remain untracked. Do not
manually change them to configure E2E. App configuration belongs in Expo config;
build orchestration belongs in `scripts/`. Rebuild after changing app/library code,
assets, or the E2E build flag. The ordinary example build displays the normal demo.

Android builds the current host's emulator ABI by default: `arm64-v8a` on Apple
Silicon, `x86_64` on x64 hosts. Override with `E2E_ANDROID_ARCH` when appropriate.
iOS builds the simulator architecture of the current Mac. Build and test on the
same architecture.

## Select a device and run

An explicit `E2E_DEVICE_UDID` is required on **both** platforms, so an attached
personal device cannot be selected accidentally. Start an emulator/simulator
before running. Prefer dedicated E2E devices; the application is installed and
restarted by the test runner.

Android (choose an installed AVD from `emulator -list-avds`):

```sh
emulator -avd YOUR_E2E_AVD -port 5556 -no-snapshot
# In another terminal:
E2E_DEVICE_UDID=emulator-5556 npm --prefix e2e run test:android
```

iOS (get simulator UDIDs from `xcrun simctl list devices available`):

```sh
xcrun simctl boot YOUR_SIMULATOR_UDID
xcrun simctl bootstatus YOUR_SIMULATOR_UDID -b
E2E_DEVICE_UDID=YOUR_SIMULATOR_UDID npm --prefix e2e run test:ios
```

The WebdriverIO Appium service owns the local server lifecycle. It binds to
`127.0.0.1:4723`, without relaxed security. Tests run serially in a single worker;
each test relaunches the app to reset its in-memory state. Tests and spec files
have zero automatic retries.

On CI, iOS uses a headless simulator so Appium does not restart the already-booted
device to open a Simulator window. A separate `prepare:ios` step downloads the
official simulator WebDriverAgent release matching the locked XCUITest driver's
bundled WDA version and the host architecture. Appium uses that prebuilt agent with
`usePreinstalledWDA` / `prebuiltWDAPath`, avoiding compilation inside session
creation. Its connection timeout is five minutes to cover cold installation and
startup; test timeouts and zero-retry behavior remain unchanged.

Local runs can opt into the same prebuilt path with `npm --prefix e2e run prepare:ios`
and `E2E_WDA_PATH` pointing to `e2e/build/wda/WebDriverAgentRunner-Runner.app`.
Preparing WDA replaces only the generated `e2e/build/wda/` directory. The default
local configuration still lets Appium build WDA normally.

| Environment variable   | Purpose                                                         |
| ---------------------- | --------------------------------------------------------------- |
| `E2E_DEVICE_UDID`      | Explicit Android serial or iOS simulator UDID; required         |
| `E2E_APP_PATH`         | Override the platform's default built-app path                  |
| `E2E_ANDROID_ARCH`     | Android build ABI; defaults to the host's emulator ABI          |
| `E2E_APPIUM_PORT`      | Local server port; defaults to `4723`                           |
| `E2E_ARTIFACT_DIR`     | Absolute output directory; defaults to timestamped `artifacts/` |
| `E2E_REPEAT`           | Number of independent suite runs; defaults to `10`              |
| `E2E_NEGATIVE_CONTROL` | Set to `1` to deliberately fail the smoke assertion             |

Use distinct ports, devices, and output directories if running the two platforms
at the same time. The default commands intentionally target one device at a time.

## What the assertions prove

`example/src/e2e/E2EScreen.tsx` uses the actual public `GestureViewer` and
`GestureTrigger` components. It displays current index via `useGestureViewerState`
and scale via the `zoomChange` event. Tests do not call zoom/navigation controllers
to substitute for gestures, or mock Gesture Handler/Reanimated.

- Readiness requires the actual image load event and opening-animation completion.
- Pinching sends native two-finger input, asserts a scale increase, then asserts a
  decrease with the minimum scale respected. Android and iOS input parameters have
  different semantics, so the suite does not require an identical final scale.
- Paging sends a relative W3C touch path and checks the resulting image index.
- Closing checks that the modal disappears and the home screen becomes visible.

Coordinates are derived from the viewer's current bounds. Pointer pauses describe
the gesture itself; state assertions wait for observable results. There are no
fixed post-gesture sleeps, and application animations remain enabled.

This initial suite does **not** establish pan displacement, focal-point preservation,
all zoom limits, rotation, performance/FPS, real-device behavior, or every supported
React Native version. Add those as separate cases with a meaningful observable
result; an unchanged page index alone does not prove that a pan moved the image.

## Repetition and failure diagnostics

```sh
E2E_DEVICE_UDID=emulator-5556 npm --prefix e2e run test:repeat:android
E2E_DEVICE_UDID=YOUR_SIMULATOR_UDID npm --prefix e2e run test:repeat:ios
```

Each command runs ten independent suites by default, stops on the first failed
run, and writes per-run artifacts plus `summary.json`. Ten passes are an initial
stability check, not a statistical guarantee against flakiness.

Each run produces Appium/WDIO logs, session capabilities, and JUnit XML. Failed
tests additionally capture a screenshot, native UI hierarchy, and device logs.
If device-log collection fails, its error is saved rather than presented as a
successful capture. Session startup failures still leave server/runner logs;
screenshots require an established session.

Verify failure detection intentionally:

```sh
E2E_DEVICE_UDID=emulator-5556 E2E_NEGATIVE_CONTROL=1 \
  npm --prefix e2e run test:android -- --spec specs/smoke.e2e.ts
```

This command **must exit nonzero**, reporting expected `99/3` versus actual `1/3`.
Check that a nonempty PNG, UI XML, device log, and failing JUnit report were saved.
Then run normally without `E2E_NEGATIVE_CONTROL`. The same option works for iOS.

## CI

`.github/workflows/mobile-e2e.yml` runs on manual dispatch, relevant pull requests
to `main`, and merge groups. It uses Ubuntu 24.04 with an API 36 x86_64 emulator,
and macOS 26 with Xcode 26.6 / iOS 26.5 on ARM64. The same checkout is built and
tested within each platform job. Actions are pinned to commit SHAs.

Reports and diagnostics are uploaded even on failure and retained for 14 days.
Retries are disabled; a test failure fails its job. A workflow file in a local
checkout has not executed on GitHub until its branch is pushed and the workflow
actually runs. Branch-protection requirements are configured separately in GitHub.
Because PR execution uses path filters, do not require an always-present check
without adding an appropriate always-running gate.

## Official references

- [Appium system requirements](https://appium.io/docs/en/latest/quickstart/requirements/)
- [Appium local driver management](https://appium.io/docs/en/latest/guides/managing-exts/)
- [WebdriverIO Appium service](https://webdriver.io/docs/appium-service/)
- [WebdriverIO TypeScript setup](https://webdriver.io/docs/typescript/)
- [WebdriverIO assertions and waiting](https://webdriver.io/docs/bestpractices/)
- [Android gestures](https://github.com/appium/appium-uiautomator2-driver/blob/master/docs/android-mobile-gestures.md)
- [iOS gestures](https://appium.github.io/appium-xcuitest-driver/latest/guides/gestures/)
- [Prebuilt WebDriverAgent](https://appium.github.io/appium-xcuitest-driver/latest/guides/run-prebuilt-wda/)
- [Expo local native builds](https://docs.expo.dev/guides/local-app-development/)
