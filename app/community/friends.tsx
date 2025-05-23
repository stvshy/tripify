// app/community/friends.tsx
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { auth, db } from "../config/firebaseConfig";
import {
  doc,
  getDoc,
  arrayRemove,
  onSnapshot,
  writeBatch,
  query,
  where,
  collection,
  deleteDoc,
} from "firebase/firestore";
import { useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";

export default function FriendsListScreen() {
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] = useState<
    { id: string; userAUid: string; userBUid: string; nickname: string }[]
  >([]);
  const theme = useTheme();

  const fetchFriendships = useCallback(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const userId = currentUser.uid;

    // Listener dla kolekcji friendships gdzie użytkownik jest jednym z dwóch
    const friendshipsQueryA = query(
      collection(db, "friendships"),
      where("userAUid", "==", userId),
      where("status", "==", "accepted")
    );

    const friendshipsQueryB = query(
      collection(db, "friendships"),
      where("userBUid", "==", userId),
      where("status", "==", "accepted")
    );

    const unsubscribeA = onSnapshot(friendshipsQueryA, async (snapshot) => {
      const fetchedFriendships: {
        id: string;
        userAUid: string;
        userBUid: string;
        nickname: string;
      }[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const friendUid = data.userBUid;
        const friendDoc = await getDoc(doc(db, "users", friendUid));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          fetchedFriendships.push({
            id: docSnap.id,
            userAUid: data.userAUid,
            userBUid: data.userBUid,
            nickname: friendData.nickname || "Unknown",
          });
        }
      }
      setFriendships((prev) => {
        const filtered = prev.filter(
          (f) => f.userAUid !== userId && f.userBUid !== userId
        );
        return [...filtered, ...fetchedFriendships];
      });
    });

    const unsubscribeB = onSnapshot(friendshipsQueryB, async (snapshot) => {
      const fetchedFriendships: {
        id: string;
        userAUid: string;
        userBUid: string;
        nickname: string;
      }[] = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const friendUid = data.userAUid;
        const friendDoc = await getDoc(doc(db, "users", friendUid));
        if (friendDoc.exists()) {
          const friendData = friendDoc.data();
          fetchedFriendships.push({
            id: docSnap.id,
            userAUid: data.userAUid,
            userBUid: data.userBUid,
            nickname: friendData.nickname || "Unknown",
          });
        }
      }
      setFriendships((prev) => {
        const filtered = prev.filter(
          (f) => f.userAUid !== userId && f.userBUid !== userId
        );
        return [...filtered, ...fetchedFriendships];
      });
    });

    setLoading(false);

    return () => {
      unsubscribeA();
      unsubscribeB();
    };
  }, []);

  // Użyj useFocusEffect, aby nasłuchiwać tylko, gdy ekran jest aktywny
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = fetchFriendships();
      return () => unsubscribe && unsubscribe();
    }, [fetchFriendships])
  );

  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Usuń dokument z kolekcji friendships
      const friendshipDocRef = doc(db, "friendships", friendshipId);
      await deleteDoc(friendshipDocRef);

      Alert.alert("Sukces", "Usunięto znajomego!");
      console.log(`Removed friendship document: ${friendshipId}`);
    } catch (error) {
      console.error("Error removing friend:", error);
      Alert.alert("Błąd", "Nie udało się usunąć znajomego.");
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }

  if (friendships.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={{ color: theme.colors.onBackground }}>
          Nie masz jeszcze żadnych znajomych.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={friendships}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View
          style={[
            styles.friendItem,
            { borderBottomColor: theme.colors.outline },
          ]}
        >
          <Text style={{ color: theme.colors.onBackground }}>
            {item.nickname}
          </Text>
          <TouchableOpacity
            onPress={() => handleRemoveFriend(item.id)}
            style={[
              styles.removeButton,
              { backgroundColor: theme.colors.error },
            ]}
          >
            <Text style={styles.removeButtonText}>Usuń</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { flex: 1, justifyContent: "center", alignItems: "center" },
  friendItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  removeButton: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 4 },
  removeButtonText: { color: "#fff", fontWeight: "bold" },
});
