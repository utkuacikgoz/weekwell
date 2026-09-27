import { requireOptionalNativeModule } from 'expo';

export type RawStore = { name: string; street: string; city: string; latitude: number; longitude: number; distanceMeters: number };

type StoreSearchNative = {
  searchAsync(query: string, latitude: number, longitude: number, radiusMeters: number): Promise<RawStore[]>;
};

/** Null on the web and Android, and in builds made before this module existed. */
export const StoreSearch = requireOptionalNativeModule<StoreSearchNative>('StoreSearch');
