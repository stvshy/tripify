// app/components/FriendshipActionButtons.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "react-native-paper";
import { useCommunityStore } from "../app/store/communityStore";
import ConfirmationModal from "./ConfirmationModal"; // Upewnij się, że ścieżka jest poprawna

interface FriendshipActionButtonsProps {
  profileUid: string;
  profileNickname: string;
}

// Ten komponent jest w pełni samodzielny.
// Subskrybuje stan i zarządza akcjami bez obciążania rodzica.
export const FriendshipActionButtons = ({
  profileUid,
  profileNickname,
}: FriendshipActionButtonsProps) => {
  const theme = useTheme();
  const [modalState, setModalState] = useState({
    visible: false,
    title: "",
    message: "",
    onConfirm: () => {},
    confirmText: "Yes",
    isDestructive: false,
  });

  // === IZOLACJA STANU ===
  // Tylko ten komponent subskrybuje te konkretne stany.
  const friends = useCommunityStore((state) => state.friends);
  const incomingRequests = useCommunityStore((state) => state.incomingRequests);
  const outgoingRequests = useCommunityStore((state) => state.outgoingRequests);

  // Pobieramy akcje RAZ i nie powodują one re-renderów.
  const {
    acceptFriendRequest,
    rejectFriendRequest,
    sendFriendRequest,
    removeFriend,
    cancelOutgoingRequest,
  } = useCommunityStore.getState();

  // Logika jest identyczna jak wcześniej, ale zamknięta w małym komponencie.
  const isFriend = useMemo(
    () => friends.some((friend) => friend.uid === profileUid),
    [friends, profileUid]
  );
  const hasSentRequest = useMemo(
    () => outgoingRequests.some((req) => req.receiverUid === profileUid),
    [outgoingRequests, profileUid]
  );
  const hasReceivedRequest = useMemo(
    () => incomingRequests.some((req) => req.senderUid === profileUid),
    [incomingRequests, profileUid]
  );
  const incomingRequest = useMemo(
    () => incomingRequests.find((req) => req.senderUid === profileUid),
    [incomingRequests, profileUid]
  );

  // Handlers
  const handleAdd = () => sendFriendRequest(profileUid, profileNickname);
  const handleAccept = () => {
    if (incomingRequest) acceptFriendRequest(incomingRequest);
  };
  const handleDecline = () => {
    // Przekazujemy CAŁY obiekt zaproszenia. To kluczowe.
    if (incomingRequest) {
      rejectFriendRequest(incomingRequest);
    }
  };

  const handleCloseModal = () =>
    setModalState({ ...modalState, visible: false });

  const handleRemove = () => {
    setModalState({
      visible: true,
      title: "Remove Friend",
      message: `Are you sure you want to remove ${profileNickname} from your friends?`,
      confirmText: "Remove",
      isDestructive: true,
      onConfirm: () => {
        removeFriend(profileUid);
        handleCloseModal();
      },
    });
  };

  const handleCancelRequest = () => {
    setModalState({
      visible: true,
      title: "Cancel Request",
      message: "Are you sure you want to cancel the friend request?",
      confirmText: "Yes",
      isDestructive: false,
      onConfirm: () => {
        cancelOutgoingRequest(profileUid);
        handleCloseModal();
      },
    });
  };

  // Renderowanie przycisków
  if (hasReceivedRequest) {
    return (
      <View style={styles.friendActionButtons}>
        <TouchableOpacity
          onPress={handleAccept}
          style={[
            styles.acceptButton,
            { backgroundColor: theme.colors.primary },
          ]}
        >
          <Text style={styles.buttonText}>Accept</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDecline}
          style={[
            styles.declineButton,
            { backgroundColor: "rgba(116, 116, 116, 0.3)" },
          ]}
        >
          <Text style={styles.buttonText}>Decline</Text>
        </TouchableOpacity>
        <ConfirmationModal {...modalState} onCancel={handleCloseModal} />
      </View>
    );
  }

  if (isFriend) {
    return (
      <>
        <TouchableOpacity
          onPress={handleRemove}
          style={[
            styles.actionButton,
            { backgroundColor: "rgba(191, 115, 229, 0.43)" },
          ]}
        >
          <Text style={{ color: "#fff", fontSize: 14, fontWeight: "500" }}>
            Friend
          </Text>
        </TouchableOpacity>
        <ConfirmationModal {...modalState} onCancel={handleCloseModal} />
      </>
    );
  }

  if (hasSentRequest) {
    return (
      <>
        <TouchableOpacity
          onPress={handleCancelRequest}
          style={[
            styles.actionButton,
            { backgroundColor: "rgba(204, 204, 204, 0.7)" },
          ]}
        >
          <Text style={styles.addFriendButtonText}>Sent</Text>
        </TouchableOpacity>
        <ConfirmationModal {...modalState} onCancel={handleCloseModal} />
      </>
    );
  }

  return (
    <>
      <TouchableOpacity
        onPress={handleAdd}
        style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={styles.addFriendButtonText}>Add</Text>
      </TouchableOpacity>
      <ConfirmationModal {...modalState} onCancel={handleCloseModal} />
    </>
  );
};

// Style skopiowane z Twojego pliku dla spójności
const styles = StyleSheet.create({
  friendActionButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "48%",
    marginTop: 10,
  },
  acceptButton: {
    flex: 1,
    paddingVertical: 5.5,
    borderRadius: 20,
    alignItems: "center",
    marginRight: 3,
  },
  declineButton: {
    flex: 1,
    paddingVertical: 5.5,
    borderRadius: 20,
    alignItems: "center",
    marginLeft: 3,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  actionButton: {
    marginTop: 5,
    paddingVertical: 5.5,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    minHeight: 30,
  },
  addFriendButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
});
