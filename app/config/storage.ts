// app/config/storage.ts
import { MMKV } from "react-native-mmkv";

export const storage = new MMKV({
  id: "user-storage",
  // encryptionKey: 'your-super-secret-key' // Opcjonalnie, jeśli chcesz szyfrować
});
