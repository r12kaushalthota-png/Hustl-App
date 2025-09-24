import { NativeModules, NativeEventEmitter, Platform, type EmitterSubscription } from "react-native";
export type AppleSuggestion = { title: string; subtitle: string };
export type AppleResolved = { name: string; lat: number; lng: number; formattedAddress: string };

const isIOS = Platform.OS === "ios";
const Native = isIOS ? (NativeModules as any).LocalSearchModule : undefined;

export const AppleLocalSearch = {
  available: !!(isIOS && Native),

  setQuery(q: string) {
    console.log("[ALS] setQuery:", q);
    Native?.setQuery(q);
  },

  setRegion(lat: number, lon: number, span = 0.2) {
    console.log("[ALS] setRegion:", lat, lon, span);
    Native?.setRegion(lat, lon, span);
  },

  resolve(title: string, subtitle: string): Promise<AppleResolved> {
    if (!Native) return Promise.reject(new Error("LocalSearch native module is not available"));
    console.log("[ALS] resolve:", title, "|", subtitle);
    return Native.resolve(title, subtitle);
  },

  subscribe(cb: (items: AppleSuggestion[]) => void): { remove: () => void } {
    if (!isIOS || !Native) return { remove: () => {} };
    const emitter = new NativeEventEmitter(Native);
    const sub: EmitterSubscription = emitter.addListener("onResults", (payload: any) => {
      console.log("[ALS] onResults:", payload?.items?.length ?? 0);
      cb(payload?.items ?? []);
    });
    return { remove: () => sub.remove() };
  },
};
