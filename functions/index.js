// index.js

// Importy dla nowej składni (v2)
const {
  onDocumentCreated,
  onDocumentUpdated,
} = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");

// Inicjalizacja aplikacji - robimy to tylko raz
initializeApp();

// Ustawienie globalnego regionu, w którym mają działać funkcje (opcjonalne, ale dobra praktyka)
// Wybierz region najbliższy Twoim użytkownikom, np. europe-west1 (Belgia) lub europe-west3 (Frankfurt)
setGlobalOptions({ region: "europe-west1" });

const MIN_TOKEN_LENGTH = 3;

/**
 * Generuje tablicę tokenów (podciągów) dla danego nicku.
 * @param {string} nickname Nick do przetworzenia.
 * @returns {string[]} Tablica unikalnych tokenów.
 */
const generateTokens = (nickname) => {
  if (!nickname || typeof nickname !== "string") {
    return [];
  }
  const lowerNickname = nickname.toLowerCase();
  const tokens = new Set();

  if (lowerNickname.length < MIN_TOKEN_LENGTH) {
    return [];
  }

  for (let i = 0; i <= lowerNickname.length - MIN_TOKEN_LENGTH; i++) {
    for (let j = i + MIN_TOKEN_LENGTH; j <= lowerNickname.length; j++) {
      tokens.add(lowerNickname.substring(i, j));
    }
  }

  return Array.from(tokens);
};

// NOWA SKŁADNIA dla funkcji uruchamianej przy tworzeniu dokumentu
exports.generateNicknameTokensOnCreate = onDocumentCreated(
  "users/{userId}",
  (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      console.log("No data associated with the event");
      return;
    }
    const data = snapshot.data();

    if (data && data.nickname) {
      const tokens = generateTokens(data.nickname);
      console.log(
        `Generowanie tokenów dla nowego użytkownika ${data.nickname}.`
      );
      // Zapisujemy zaktualizowany dokument
      return snapshot.ref.update({ nickname_tokens: tokens });
    }
  }
);

// NOWA SKŁADNIA dla funkcji uruchamianej przy aktualizacji dokumentu
exports.generateNicknameTokensOnUpdate = onDocumentUpdated(
  "users/{userId}",
  (event) => {
    const beforeSnapshot = event.data.before;
    const afterSnapshot = event.data.after;

    if (!beforeSnapshot || !afterSnapshot) {
      console.log("No data associated with the event");
      return;
    }

    const beforeData = beforeSnapshot.data();
    const afterData = afterSnapshot.data();

    // Sprawdzamy, czy nick się zmienił
    if (afterData && beforeData.nickname !== afterData.nickname) {
      const tokens = generateTokens(afterData.nickname);
      console.log(
        `Aktualizacja tokenów dla użytkownika ${afterData.nickname}.`
      );
      // Zapisujemy zaktualizowany dokument
      return afterSnapshot.ref.update({ nickname_tokens: tokens });
    }
  }
);
