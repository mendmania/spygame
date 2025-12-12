import {
  ref,
  set,
  get,
  onValue,
  off,
  update,
  remove,
  type DataSnapshot,
} from 'firebase/database';
import { getFirebaseDatabase } from '../config';

export function createRef(path: string) {
  return ref(getFirebaseDatabase(), path);
}

export async function writeData<T>(path: string, data: T): Promise<void> {
  await set(createRef(path), data);
}

export async function readData<T>(path: string): Promise<T | null> {
  const snapshot = await get(createRef(path));
  return snapshot.exists() ? (snapshot.val() as T) : null;
}

export function subscribe<T>(
  path: string,
  callback: (data: T | null) => void
): () => void {
  const dbRef = createRef(path);

  const handler = (snapshot: DataSnapshot) => {
    callback(snapshot.exists() ? (snapshot.val() as T) : null);
  };

  onValue(dbRef, handler);

  return () => off(dbRef, 'value', handler);
}

export async function updateData(
  path: string,
  updates: Record<string, unknown>
): Promise<void> {
  await update(createRef(path), updates);
}

export async function removeData(path: string): Promise<void> {
  await remove(createRef(path));
}

export async function exists(path: string): Promise<boolean> {
  const snapshot = await get(createRef(path));
  return snapshot.exists();
}
