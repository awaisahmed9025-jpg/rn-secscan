import { XMLParser } from "fast-xml-parser";
import type { Finding, NativeRule } from "../../types";
import { lineOf, makeFinding } from "../../utils";

const ARRAY_TAGS = new Set(["activity", "activity-alias", "service", "receiver", "provider", "intent-filter", "action"]);
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => ARRAY_TAGS.has(name),
});

const applies = (p: string) => /AndroidManifest\.xml$/.test(p) && !/src[\\/]debug[\\/]/.test(p);

function getApplication(content: string): Record<string, any> | undefined {
  try {
    const doc = parser.parse(content);
    const app = doc?.manifest?.application;
    if (app === "") return {}; // <application/> with no attributes parses as an empty string
    return app && typeof app === "object" ? app : undefined;
  } catch {
    return undefined;
  }
}

export const androidAllowBackup: NativeRule = {
  kind: "native",
  id: "RNSEC101",
  title: "Android backup enabled",
  description: "With allowBackup enabled, app data (including local storage) can be extracted with adb backup or cloud backup.",
  masvs: "MASVS-STORAGE-2",
  severity: "medium",
  appliesTo: applies,
  check({ path, content }) {
    const app = getApplication(content);
    if (!app) return [];
    const value = app["@_android:allowBackup"];
    if (value === "true") {
      return [makeFinding(androidAllowBackup, path, lineOf(content, /android:allowBackup/), 'android:allowBackup="true" lets app data be extracted via backup. Set it to "false".', 'android:allowBackup="true"')];
    }
    if (value === undefined) {
      return [makeFinding(androidAllowBackup, path, lineOf(content, /<application/), "android:allowBackup is not set and defaults to true. Set it explicitly to \"false\".", "<application ...> (allowBackup not set)", "low")];
    }
    return [];
  },
};

export const androidCleartext: NativeRule = {
  kind: "native",
  id: "RNSEC102",
  title: "Android cleartext traffic allowed",
  description: "usesCleartextTraffic permits unencrypted HTTP connections for the whole app.",
  masvs: "MASVS-NETWORK-1",
  severity: "high",
  appliesTo: applies,
  check({ path, content }) {
    const app = getApplication(content);
    if (app?.["@_android:usesCleartextTraffic"] !== "true") return [];
    return [makeFinding(androidCleartext, path, lineOf(content, /usesCleartextTraffic/), 'android:usesCleartextTraffic="true" allows plain HTTP. Remove it or set it to "false".', 'android:usesCleartextTraffic="true"')];
  },
};

export const androidExported: NativeRule = {
  kind: "native",
  id: "RNSEC103",
  title: "Exported Android component without permission",
  description: "Exported components can be started by any app on the device unless protected by a permission.",
  masvs: "MASVS-PLATFORM-1",
  severity: "high",
  appliesTo: applies,
  check({ path, content }) {
    const app = getApplication(content);
    if (!app) return [];
    const findings: Finding[] = [];

    for (const tag of ["activity", "activity-alias", "service", "receiver", "provider"]) {
      for (const c of (app[tag] as Record<string, any>[] | undefined) ?? []) {
        if (c["@_android:exported"] !== "true") continue;
        const protectedBy = c["@_android:permission"] || c["@_android:readPermission"] || c["@_android:writePermission"];
        if (protectedBy) continue;

        const isLauncher = (c["intent-filter"] ?? []).some((f: any) =>
          (f.action ?? []).some((a: any) => a["@_android:name"] === "android.intent.action.MAIN")
        );
        if (isLauncher) continue;

        const name = c["@_android:name"] ?? "(unnamed)";
        const isActivity = tag.startsWith("activity");
        findings.push(
          makeFinding(
            androidExported,
            path,
            lineOf(content, `android:name="${name}"`),
            isActivity
              ? `Exported <${tag}> "${name}" has no permission. If it handles deep links, validate all incoming data.`
              : `Exported <${tag}> "${name}" has no permission, so any app can interact with it. Set exported="false" or add android:permission.`,
            `<${tag} android:name="${name}" android:exported="true">`,
            isActivity ? "low" : "high"
          )
        );
      }
    }
    return findings;
  },
};
