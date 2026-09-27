import { requireOptionalNativeModule } from 'expo';

export type RawStore = { name: string; street: string; city: string; latitude: number; longitude: number; distanceMeters: number };

type StoreSearchNative = {
  searchAsync(query: string, latitude: number, longitude: number, radiusMeters: number): Promise<RawStore[]>;
  driveMinutesAsync(fromLatitude: number, fromLongitude: number, toLatitude: number, toLongitude: number): Promise<number>;
  /** File URL of a PNG map of the store's block, with a pin. */
  mapImageAsync(latitude: number, longitude: number, width: number, height: number, dark: boolean): Promise<string>;
};

/** Null on the web and Android, and in builds made before this module existed. */
export const StoreSearch = requireOptionalNativeModule<StoreSearchNative>('StoreSearch');
