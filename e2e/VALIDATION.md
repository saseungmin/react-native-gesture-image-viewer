# Initial mobile E2E validation

Verified locally on 2026-09-20. This records the initial setup validation; it is
not a claim that later revisions or additional OS versions have been tested.

The native repeat-run baseline was recorded against library commit `ece944f`
(3.0.0). The draft PR was subsequently rebased onto `0265b94` (3.1.0), which adds
pan inertia. Native E2E results on that newer base must be confirmed by the PR's
CI runs; the historical repeat counts below are not post-rebase results.

Post-rebase checks passed: 20 Jest suites / 216 tests, lint, formatting, root and
E2E TypeScript checks, and actionlint. The native repeat counts below remain the
original pre-rebase baseline.

## Environment

| Component               | Verified version                                    |
| ----------------------- | --------------------------------------------------- |
| Node / npm / pnpm       | 24.21.0 / 11.19.0 / 11.26.0                         |
| React Native / Expo     | 0.86.3 / 57.0.24                                    |
| Appium / WebdriverIO    | 3.7.0 / 9.31.9                                      |
| UiAutomator2 / XCUITest | 8.7.0 / 12.13.1                                     |
| Android                 | Android 16, API 36, ARM64 emulator, Pixel 7 profile |
| iOS                     | iOS 26.5 simulator, iPhone 17 Pro                   |
| Native toolchain        | Xcode 26.6 (17F113), Temurin JDK 17.0.17            |

Both platforms used Release builds with bundled JavaScript and local image
fixtures. Android's APK contains `assets/index.android.bundle`; the iOS app
contains `main.jsbundle`. No Metro server was started for the E2E runs.

## Results

| Check                               | Result                                                        |
| ----------------------------------- | ------------------------------------------------------------- |
| Android native gesture suite        | 10 consecutive runs × 3 cases = 30 passed                     |
| iOS native gesture suite            | 10 consecutive runs × 3 cases = 30 passed                     |
| Automatic test/spec retries         | Disabled                                                      |
| Skipped E2E cases                   | 0                                                             |
| Android negative control            | Expected assertion failure, process exit 1                    |
| iOS negative control                | Expected assertion failure, process exit 1                    |
| Failure diagnostics, both platforms | Nonempty PNG, native UI XML, device log, failing JUnit report |
| Existing Jest tests                 | 14 suites, 156 tests passed                                   |
| Root and E2E TypeScript checks      | Passed                                                        |
| Lint and formatting                 | Passed                                                        |
| Library build                       | Passed                                                        |
| Expo dependency compatibility       | Passed                                                        |
| Normal Expo export, all platforms   | Passed                                                        |
| Documentation typecheck and build   | Passed                                                        |
| Workflow static validation          | actionlint 1.7.12 passed; ShellCheck was not installed        |
| Package dry run                     | 155 files; no `e2e/`, `example/`, or workflow files included  |

Each suite covers native left/right paging, native pinch-open/pinch-close, and
viewer opening/closing. Negative controls expected the deliberately incorrect
page `99/3`, received the real page `1/3`, and failed as intended. They are separate
from the 60 passing E2E test executions above.

The repeat runs used the final locked E2E dependencies, including the security
overrides, and explicit separate Appium service ports for the two platforms.
Earlier setup/debugging attempts are not included in the consecutive-pass counts.

Local evidence is retained under the ignored `e2e/artifacts/` directory:

- `android-verified/summary.json` and `run-1` through `run-10`
- `ios-verified/summary.json` and `run-1` through `run-10`
- `android-negative-verified/` and `ios-negative-verified/`
- `validation/environment.json`: toolchain, device capabilities, build/lock hashes
- `validation/negative-controls.json`: checked failure artifacts and their sizes
- `validation/`: native build logs, Jest results, Expo export, and dependency audit

These generated logs are local evidence and are not committed to Git. Future CI
runs upload their own diagnostics as GitHub Actions artifacts.

## Limits and outstanding upstream advisories

The GitHub-hosted jobs have **not** been executed from this local checkout. Their
workflow was statically validated. In particular, Linux/x86_64 Android execution
is not established by the local ARM64 result. No real devices or additional React
Native/OS versions were tested.

A fresh local iOS simulator initially stalled during its first-boot data migration.
Restarting only that test simulator resolved it before the recorded repeat runs.
CI builds before booting its simulator and has an overall job timeout, but its
fresh-device startup still needs confirmation on the hosted runner.

The existing root audit passed its high-severity threshold, with one moderate
finding. The separate E2E audit is **not clean**: npm reports 13 high and 10 moderate
dependency entries, propagated from two remaining packages:

- `extract-zip@2.0.1`, used by browser-download tooling, has
  [a high-severity advisory without a published fix](https://github.com/advisories/GHSA-jmr9-qjv8-65gv).
- `morgan@1.11.0` remains inside the drivers' bundled browser/WebView dependencies;
  it has [a moderate log-forging advisory](https://github.com/advisories/GHSA-jxfw-x594-9x9m).

The main Appium server's Morgan and Mocha's `serialize-javascript` are overridden
to patched versions. Native tests use locally built apps and do not request browser
downloads. These developer-tool dependencies are excluded from the published
library; that separation does not remove the upstream advisories.
