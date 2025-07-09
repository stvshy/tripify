import React, { useRef, useCallback, useState } from "react";
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
import { AntDesign, MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  useCommunityStore,
  IncomingRequest,
  OutgoingRequest,
} from "../store/communityStore";
import ConfirmationModal from "../../components/ConfirmationModal";
const screenHeight = Dimensions.get("window").height;
const MAX_PANEL_HEIGHT = screenHeight * 0.7; // Panel zajmie maksymalnie 70% ekranu

// --- Komponenty potomne (bez zmian) ---
const FriendRequestItem = ({
  request,
  onAccept,
  onReject,
}: {
  request: IncomingRequest;
  onAccept: (request: IncomingRequest) => void;
  onReject: (request: IncomingRequest) => void;
}) => {
  /* ... ten komponent pozostaje bez zmian ... */
  const theme = useTheme();
  const router = useRouter();
  const { senderUid, senderNickname } = request;
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
            onPress={() => onReject(request)}
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
  onCancel: (request: OutgoingRequest) => void; // Teraz przekazujemy cały obiekt
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
          <Text style={{ fontWeight: "500", color: theme.colors.primary }}>
            {receiverNickname}
          </Text>
        </Text>
        <TouchableOpacity
          onPress={() => onCancel(request)} // Przekazujemy cały request do handlera
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

  // Animujemy tylko jedną wartość: pozycję Y panelu.
  // Zaczyna się "pod ekranem" (wartość = MAX_PANEL_HEIGHT) i animuje do 0 (widoczny).
  const panelTranslateY = useRef(new Animated.Value(MAX_PANEL_HEIGHT)).current;
  const [modalState, setModalState] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Yes",
    isDestructive: false,
  });
  const handleCloseModal = () => {
    setModalState({ ...modalState, visible: false });
  };

  // Nowa funkcja do pokazywania modala potwierdzającego
  const handleShowCancelModal = (request: OutgoingRequest) => {
    setModalState({
      visible: true,
      title: "Cancel Request",
      message: `Are you sure you want to cancel the friend request sent to ${request.receiverNickname}?`,
      confirmText: "Yes",
      isDestructive: false, // Używamy czerwonego przycisku dla jasności
      onConfirm: () => {
        cancelOutgoingRequest(request.receiverUid);
        handleCloseModal(); // Zamknij modal po potwierdzeniu
      },
    });
  };

  const openPanel = useCallback(() => {
    Animated.timing(panelTranslateY, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true, // Możemy użyć, bo animujemy 'transform'
    }).start();
  }, [panelTranslateY]);

  const closePanel = useCallback(() => {
    Animated.timing(panelTranslateY, {
      toValue: MAX_PANEL_HEIGHT,
      duration: 350,
      useNativeDriver: true,
    }).start();
  }, [panelTranslateY]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        // Pozwalamy przeciągać tylko w dół z pozycji otwartej
        if (gestureState.dy > 0) {
          panelTranslateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Jeśli przeciągnięto o więcej niż 40% wysokości panelu lub był szybki gest
        if (gestureState.dy > MAX_PANEL_HEIGHT * 0.4 || gestureState.vy > 0.5) {
          closePanel();
        } else {
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
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={{ color: theme.colors.onBackground }}>
              No incoming friend requests.
            </Text>
          </View>
        }
        // ✅ DODANA LINIA:
        contentContainerStyle={{ flexGrow: 1 }}
      />

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

      {/* ✅ CAŁKOWICIE NOWA, UPROSZCZONA LOGIKA PANELU ✅ */}
      <Animated.View
        style={[
          styles.outgoingPanel,
          {
            backgroundColor: theme.colors.surface,
            // 1. Panel ma MAXymalną wysokość, a nie sztywną.
            maxHeight: MAX_PANEL_HEIGHT,
            // 2. Animujemy transformację, co jest wydajniejsze i bezpieczniejsze.
            transform: [{ translateY: panelTranslateY }],
          },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.panelHeader}>
          <View style={styles.panelHandleContainer}>
            <View style={styles.panelHandle} />
          </View>
        </View>

        {/* 
          Ta FlatList teraz zachowuje się naturalnie.
          Rośnie razem z zawartością, a jej rodzic (Animated.View)
          rozszerza się, aż osiągnie `maxHeight`.
          Wtedy `FlatList` staje się scrollowalna.
          Nie potrzebujemy już żadnych `key`, `useEffect` ani stanu dla wysokości.
        */}
        <FlatList
          data={outgoingRequests}
          keyExtractor={(item) => item.receiverUid}
          renderItem={({ item }) => (
            <OutgoingRequestItem
              request={item}
              // ✅ ZMIANA 4: Podpinamy nową funkcję zamiast bezpośredniej akcji ze store'u
              onCancel={handleShowCancelModal}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyListContainer}>
              <Text style={{ color: theme.colors.onBackground }}>
                No sent requests.
              </Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 8 }}
        />
      </Animated.View>

      {/* ✅ ZMIANA 5: Renderujemy komponent modala na samym dole */}
      <ConfirmationModal
        visible={modalState.visible}
        title={modalState.title}
        message={modalState.message}
        onCancel={handleCloseModal}
        onConfirm={modalState.onConfirm}
        confirmText={modalState.confirmText}
        isDestructive={modalState.isDestructive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Zmienione na padding: 0, padding dodany do listy
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    paddingBottom: 80, // Zostaw miejsce na przycisk
  },
  emptyListContainer: {
    // Dodatkowy styl dla pustej listy w panelu
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  requestItem: {
    paddingVertical: 15,
    paddingHorizontal: 16, // Zwiększony padding
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
    alignSelf: "center", // Lepsze centrowanie
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
    bottom: 0, // Przyklejony do dołu
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 4.65,
    elevation: 6,
    // WAŻNE: BRAK `height`!
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Centrujemy uchwyt
    paddingTop: 10,
    // position: "relative", // Potrzebne do absolutnego pozycjonowania przycisku
  },
  panelHandleContainer: {
    alignItems: "center",
    paddingBottom: 10,
  },
  panelHandle: {
    width: 40,
    height: 5,
    backgroundColor: "#ccc",
    borderRadius: 2.5,
  },
});
