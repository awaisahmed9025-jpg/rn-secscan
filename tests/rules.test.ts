import { describe, it, expect } from "vitest";
import { Project } from "ts-morph";
import type { JsRule } from "../src/types";
import { asyncStorageSensitive } from "../src/rules/js/asyncstorage-sensitive";
import { insecureHttp } from "../src/rules/js/insecure-http";
import { hardcodedSecrets } from "../src/rules/js/hardcoded-secrets";
import { sensitiveLogging } from "../src/rules/js/sensitive-logging";
import { webviewMisuse } from "../src/rules/js/webview-misuse";
import { androidAllowBackup, androidCleartext, androidExported } from "../src/rules/native/android-manifest";
import { iosAppTransportSecurity } from "../src/rules/native/ios-plist";

function run(rule: JsRule, code: string, file = "a.ts") {
  const project = new Project({ useInMemoryFileSystem: true });
  return rule.check(project.createSourceFile(file, code));
}

describe("RNSEC001 AsyncStorage", () => {
  it("flags sensitive keys", () => {
    expect(run(asyncStorageSensitive, `AsyncStorage.setItem("authToken", t);`)).toHaveLength(1);
    expect(run(asyncStorageSensitive, `AsyncStorage.setItem(KEYS.REFRESH_TOKEN, t);`)).toHaveLength(1);
  });
  it("ignores harmless keys", () => {
    expect(run(asyncStorageSensitive, `AsyncStorage.setItem("theme", "dark");`)).toHaveLength(0);
    expect(run(asyncStorageSensitive, `AsyncStorage.setItem("author", "me");`)).toHaveLength(0);
  });
  it("ignores reads", () => {
    expect(run(asyncStorageSensitive, `AsyncStorage.getItem("authToken");`)).toHaveLength(0);
  });
  it("adds same-file context when a stored token reaches a network sink", () => {
    const code = `async function load() {
      await AsyncStorage.setItem("authToken", token);
      const stored = await AsyncStorage.getItem("authToken");
      const alias = stored;
      await fetch(url, { headers: { Authorization: alias } });
      setAuthState(alias);
    }`;
    const [finding] = run(asyncStorageSensitive, code);
    expect(finding.message).toContain("reaches a network call");
    expect(finding.message).toContain("reaches state or storage");
  });
});

describe("RNSEC002 insecure HTTP", () => {
  it("flags remote http in network contexts", () => {
    expect(run(insecureHttp, `fetch("http://api.example.com/x");`)).toHaveLength(1);
    expect(run(insecureHttp, "const baseURL = `http://api.example.com/${v}`;")).toHaveLength(1);
  });
  it("ignores https, localhost and XML namespaces", () => {
    expect(run(insecureHttp, `fetch("https://api.example.com");`)).toHaveLength(0);
    expect(run(insecureHttp, `fetch("http://localhost:8081/x");`)).toHaveLength(0);
    expect(run(insecureHttp, `const xmlns = "http://www.w3.org/2000/svg";`)).toHaveLength(0);
  });
});

describe("RNSEC003 hardcoded secrets", () => {
  it("flags known formats (built at runtime so this repo holds no real-looking keys)", () => {
    const aws = "AKIA" + "IOSFODNN7EXAMPLE";
    const res = run(hardcodedSecrets, `const k = "${aws}";`);
    expect(res).toHaveLength(1);
    expect(res[0].snippet).not.toContain(aws);
  });
  it("flags generic high-entropy secrets by name", () => {
    expect(run(hardcodedSecrets, `const apiKey = "k8Vd2xQp9LmZr4TbW7Yn";`)).toHaveLength(1);
  });
  it("ignores placeholders, messages and env lookups", () => {
    expect(run(hardcodedSecrets, `const apiKey = "YOUR_API_KEY_HERE";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const passwordError = "Password is required";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const apiKey = process.env.API_KEY;`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const AppPasswords = "/settings/app-passwords";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const SYSTEM_USER_ACCESS_TOKEN_ROLE = "system_user_access_token_role";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const E2E_PRIVATE_KEY = "RC_E2E_PRIVATE_KEY";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const E2E_SEC_CHANGE_PASSWORD = "e2e_sec_change_password";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const HEADER_X_example-app_PREAUTH_SECRET = "X-example-app-Preauth-Secret";`)).toHaveLength(0);
  });
  it("ignores secret-named storage-key labels but still flags credential values", () => {
    expect(run(hardcodedSecrets, `const PASSWORDS_KEY = "saved_passwords";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const SYNC_AUTH_TOKEN_KEY = "@sync_auth_token";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const SYNC_PASSWORD_KEY = "sync_session_password";`)).toHaveLength(0);
    expect(run(hardcodedSecrets, `const API_KEY = "k8Vd2xQp9LmZr4TbW7Yn";`)).toHaveLength(1);
  });
});

describe("RNSEC004 sensitive logging", () => {
  it("flags tokens in console calls", () => {
    expect(run(sensitiveLogging, `console.log("x", authToken);`)).toHaveLength(1);
    expect(run(sensitiveLogging, `console.error(JSON.stringify(credentials));`)).toHaveLength(1);
  });
  it("ignores labels, __DEV__ guards and non-value names", () => {
    expect(run(sensitiveLogging, `console.log("Token refreshed");`)).toHaveLength(0);
    expect(run(sensitiveLogging, `if (__DEV__) { console.log(authToken); }`)).toHaveLength(0);
    expect(run(sensitiveLogging, `console.log(tokenCount, isTokenValid);`)).toHaveLength(0);
  });
  it("identifies when a logged token came from AsyncStorage", () => {
    const code = `async function logStoredToken() {
      const authToken = await AsyncStorage.getItem("authToken");
      console.log(authToken);
    }`;
    const [finding] = run(sensitiveLogging, code);
    expect(finding.message).toContain("read from AsyncStorage");
    expect(finding.message).toContain("reaches a console log");
  });
});

describe("RNSEC005 WebView", () => {
  it("flags permissive settings", () => {
    const code = `const a = <WebView originWhitelist={["*"]} allowUniversalAccessFromFileURLs />;`;
    const res = run(webviewMisuse, code, "a.tsx");
    expect(res.map((r) => r.severity).sort()).toEqual(["high", "medium"]);
  });
  it("ignores safe configuration", () => {
    const code = `const a = <WebView originWhitelist={["https://example.com"]} allowUniversalAccessFromFileURLs={false} />;`;
    expect(run(webviewMisuse, code, "a.tsx")).toHaveLength(0);
  });
});

describe("Android manifest rules", () => {
  const manifest = (appAttrs: string, body = "") =>
    `<manifest xmlns:android="http://schemas.android.com/apk/res/android"><application ${appAttrs}>${body}</application></manifest>`;
  const file = (content: string, path = "android/app/src/main/AndroidManifest.xml") => ({ path, content });

  it("flags allowBackup true, and low when unset", () => {
    expect(androidAllowBackup.check(file(manifest('android:allowBackup="true"')))[0].severity).toBe("medium");
    expect(androidAllowBackup.check(file(manifest("")))[0].severity).toBe("low");
    expect(androidAllowBackup.check(file(manifest('android:allowBackup="false"')))).toHaveLength(0);
  });
  it("flags cleartext traffic", () => {
    expect(androidCleartext.check(file(manifest('android:usesCleartextTraffic="true"')))).toHaveLength(1);
  });
  it("flags exported service but not the launcher activity", () => {
    const body = `
      <activity android:name=".Main" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/></intent-filter></activity>
      <service android:name=".Sync" android:exported="true"/>
      <service android:name=".Safe" android:exported="true" android:permission="com.x.PERM"/>`;
    const res = androidExported.check(file(manifest("", body)));
    expect(res).toHaveLength(1);
    expect(res[0].message).toContain(".Sync");
  });
  it("skips debug manifests", () => {
    expect(androidCleartext.appliesTo("android/app/src/debug/AndroidManifest.xml")).toBe(false);
  });
});

describe("iOS ATS rule", () => {
  const plist = (inner: string) =>
    `<?xml version="1.0"?><plist version="1.0"><dict><key>NSAppTransportSecurity</key><dict>${inner}</dict></dict></plist>`;
  it("flags arbitrary loads", () => {
    const res = iosAppTransportSecurity.check({ path: "Info.plist", content: plist("<key>NSAllowsArbitraryLoads</key><true/>") });
    expect(res).toHaveLength(1);
    expect(res[0].severity).toBe("high");
  });
  it("ignores localhost exceptions and strict ATS", () => {
    const local = plist("<key>NSExceptionDomains</key><dict><key>localhost</key><dict><key>NSExceptionAllowsInsecureHTTPLoads</key><true/></dict></dict>");
    expect(iosAppTransportSecurity.check({ path: "Info.plist", content: local })).toHaveLength(0);
    expect(iosAppTransportSecurity.check({ path: "Info.plist", content: plist("<key>NSAllowsArbitraryLoads</key><false/>") })).toHaveLength(0);
  });
});
