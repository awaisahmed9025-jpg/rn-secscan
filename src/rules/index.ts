import type { JsRule, NativeRule, Rule } from "../types";
import { asyncStorageSensitive } from "./js/asyncstorage-sensitive";
import { insecureHttp } from "./js/insecure-http";
import { hardcodedSecrets } from "./js/hardcoded-secrets";
import { sensitiveLogging } from "./js/sensitive-logging";
import { webviewMisuse } from "./js/webview-misuse";
import { androidAllowBackup, androidCleartext, androidExported } from "./native/android-manifest";
import { iosAppTransportSecurity } from "./native/ios-plist";

export const jsRules: JsRule[] = [asyncStorageSensitive, insecureHttp, hardcodedSecrets, sensitiveLogging, webviewMisuse];
export const nativeRules: NativeRule[] = [androidAllowBackup, androidCleartext, androidExported, iosAppTransportSecurity];
export const allRules: Rule[] = [...jsRules, ...nativeRules];
