import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { useFocusEffect } from "@react-navigation/native";
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import {
  useCommunityStore,
  IncomingRequest,
  OutgoingRequest,
} from "../store/communityStore";

const ITEM_HEIGHT = 60;
const PANEL_HEADER_HEIGHT = 41;

// --- Komponenty potomne (bez zmian) ---
const FriendRequestItem: React.FC<{
  request: IncomingRequest;
  onAccept: (req: IncomingRequest) => void;
  onReject: (id: string) => void;
}> = ({ request, onAccept, onReject }) => {
  const theme = useTheme();
  const router = useRouter();
  const { senderUid, senderNickname, id } = request;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/profile/${senderUid}`)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.requestItem,
          { borderBottomColor: theme.colors.outline },
        ]}
      >
        <Text style={{ color: theme.colors.onBackground, fontSize: 14.4 }}>
          <Text style={{ fontWeight: "500", color: theme.colors.primary }}>
            {senderNickname}
          </Text>{" "}
          wants to be your friend
        </Text>
        <View style={styles.requestButtons}>
          <TouchableOpacity
            onPress={() => onAccept(request)}
            style={[
              styles.iconButton,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <AntDesign name="check" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => onReject(id)}
            style={[
              styles.iconButton,
              { backgroundColor: "rgba(116, 116, 116, 0.3)", marginLeft: 6 },
            ]}
          >
            <AntDesign name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const OutgoingRequestItem: React.FC<{
  request: OutgoingRequest;
  onCancel: (uid: string) => void;
}> = ({ request, onCancel }) => {
  const theme = useTheme();
  const router = useRouter();
  const { receiverUid, receiverNickname } = request;
  return (
    <TouchableOpacity
      onPress={() => router.push(`/profile/${receiverUid}`)}
      activeOpacity={0.7}
    >
      <View
        style={[
          styles.requestItem,
          { borderBottomColor: theme.colors.outline },
        ]}
      >
        <Text style={{ color: theme.colors.onBackground }}>
          Friend request sent to{" "}
          <Text style={{ fontWeight: "500", color: "#9f7fc7" }}>
            {receiverNickname}
          </Text>
        </Text>
        <TouchableOpacity
          onPress={() => onCancel(receiverUid)}
          style={[
            styles.iconButtonSend,
            { backgroundColor: "rgba(116, 116, 116, 0.3)" },
          ]}
        >
          <AntDesign name="close" size={11} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

// --- Główny komponent ekranu ---
export default function FriendRequestsScreen() {
  const theme = useTheme();
  const isLoading = useCommunityStore((state) => state.isLoading);
  const incomingRequests = useCommunityStore((state) => state.incomingRequests);
  const outgoingRequests = useCommunityStore((state) => state.outgoingRequests);
  const acceptFriendRequest = useCommunityStore(
    (state) => state.acceptFriendRequest
  );
  const rejectFriendRequest = useCommunityStore(
    (state) => state.rejectFriendRequest
  );
  const cancelOutgoingRequest = useCommunityStore(
    (state) => state.cancelOutgoingRequest
  );

  const screenHeight = Dimensions.get("window").height;
  const animatedValue = useRef(new Animated.Value(screenHeight)).current;
  const animatedValueRef = useRef(screenHeight);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    const listenerId = animatedValue.addListener(({ value }) => {
      animatedValueRef.current = value;
    });
    return () => animatedValue.removeListener(listenerId);
  }, [animatedValue]);

  const calculatePanelHeight = useCallback((): number => {
    const headerAndPaddingHeight = PANEL_HEADER_HEIGHT;
    const contentHeight =
      outgoingRequests.length * ITEM_HEIGHT + headerAndPaddingHeight;
    const maxPanelHeight = screenHeight * 0.8;
    const minPanelHeight = 150;

    return Math.max(Math.min(contentHeight, maxPanelHeight), minPanelHeight);
  }, [outgoingRequests, screenHeight]);

  const openPanel = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: screenHeight - calculatePanelHeight(),
      duration: 300,
      useNativeDriver: false,
    }).start(() => setIsPanelOpen(true));
  }, [animatedValue, screenHeight, calculatePanelHeight]);

  const closePanel = useCallback(() => {
    Animated.timing(animatedValue, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: false,
    }).start(() => setIsPanelOpen(false));
  }, [animatedValue, screenHeight]);

  useEffect(() => {
    if (isPanelOpen) {
      openPanel();
    }
  }, [outgoingRequests, isPanelOpen, openPanel]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        // Pozwala na przeciąganie tylko w dół z pozycji otwartej
        if (gestureState.dy > 0) {
          const openPosition = screenHeight - calculatePanelHeight();
          animatedValue.setValue(openPosition + gestureState.dy);
        }
      },
      // ✅✅✅ TUTAJ ZNAJDUJE SIĘ KLUCZOWA ZMIANA ✅✅✅
      onPanResponderRelease: (_, gestureState) => {
        const panelHeight = calculatePanelHeight();
        const openPosition = screenHeight - panelHeight;
        const currentPosition = animatedValueRef.current;

        // Definiujemy próg zamknięcia. Jeśli panel jest przeciągnięty
        // o więcej niż 40% swojej wysokości, zostanie zamknięty.
        // Możesz eksperymentować z tą wartością (np. 0.3 dla 30%).
        const closeThreshold = openPosition + panelHeight * 0.4;

        // Jeśli panel został przeciągnięty poniżej progu LUB gest w dół
        // był wystarczająco szybki (flick), zamykamy panel.
        if (currentPosition > closeThreshold || gestureState.vy > 0.5) {
          closePanel();
        } else {
          // W przeciwnym wypadku, wracamy do pozycji otwartej.
          openPanel();
        }
      },
    })
  ).current;

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {incomingRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={{ color: theme.colors.onBackground }}>
            No incoming friend requests.
          </Text>
        </View>
      ) : (
        <FlatList
          data={incomingRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <FriendRequestItem
              request={item}
              onAccept={acceptFriendRequest}
              onReject={rejectFriendRequest}
            />
          )}
        />
      )}

      <TouchableOpacity
        onPress={openPanel}
        style={[
          styles.outgoingButton,
          { backgroundColor: theme.colors.primary },
        ]}
      >
        <Text style={styles.outgoingButtonText}>Sent Requests</Text>
        <MaterialIcons
          name="keyboard-arrow-up"
          size={16}
          color="#fff"
          style={{ marginLeft: 4 }}
        />
      </TouchableOpacity>

      <Animated.View
        style={[
          styles.outgoingPanel,
          {
            top: animatedValue,
            height: calculatePanelHeight(),
            backgroundColor: theme.colors.surface,
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.panelHeader}>
          <View style={styles.panelHandleContainer}>
            <View style={styles.panelHandle} />
          </View>
          <TouchableOpacity onPress={closePanel} style={styles.closeButton} />
        </View>
        <FlatList
          data={outgoingRequests}
          keyExtractor={(item) => item.receiverUid}
          renderItem={({ item }) => (
            <OutgoingRequestItem
              request={item}
              onCancel={cancelOutgoingRequest}
            />
          )}
          contentContainerStyle={{ paddingBottom: 8 }}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 50,
  },
  requestItem: {
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  requestButtons: { flexDirection: "row" },
  iconButton: {
    width: 23,
    height: 23,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonSend: {
    width: 17,
    height: 17,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  outgoingButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    position: "absolute",
    bottom: 20,
    left: "33%",
    right: "33%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  outgoingButtonText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "bold",
    fontSize: 13,
  },
  outgoingPanel: {
    position: "absolute",
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.3,
    shadowRadius: 3.84,
    elevation: 5,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  panelHandleContainer: { flex: 1, alignItems: "center" },
  panelHandle: {
    width: "23%",
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 2.5,
    marginBottom: 10,
  },
  closeButton: { padding: 8 },
});
