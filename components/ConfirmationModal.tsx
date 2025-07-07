import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { MotiView, AnimatePresence } from "moti";

const { width } = Dimensions.get("window");

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmText = "Yes",
  cancelText = "No",
  isDestructive = false,
}) => {
  const theme = useTheme();

  const confirmButtonColor = isDestructive
    ? theme.colors.error
    : theme.colors.primary;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
      statusBarTranslucent={true}
    >
      <AnimatePresence>
        {visible && (
          <MotiView
            style={styles.overlay}
            from={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              type: "timing",
              duration: 230, // <--- ZMIANA: Skrócony czas dla tła
            }}
          >
            {/* ZMIANA: Usunięto animację 'scale' i skrócono czas dla super płynnego 'fade' */}
            <MotiView
              style={[
                styles.content,
                { backgroundColor: theme.colors.surface },
              ]}
              from={{ opacity: 0 }} // Tylko zanikanie, bez skalowania
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{
                type: "timing",
                duration: 230, // <--- ZMIANA: Bardzo krótki czas dla samego okna
              }}
            >
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {title}
              </Text>

              <Text
                style={[
                  styles.message,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {message}
              </Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.cancelButton,
                    {
                      borderColor: theme.colors.primary,
                      borderWidth: 1.5,
                    },
                  ]}
                  onPress={onCancel}
                >
                  <Text
                    style={[styles.buttonText, { color: theme.colors.primary }]}
                  >
                    {cancelText}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.confirmButton,
                    { backgroundColor: confirmButtonColor },
                  ]}
                  onPress={onConfirm}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      { color: theme.colors.onPrimary },
                    ]}
                  >
                    {confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            </MotiView>
          </MotiView>
        )}
      </AnimatePresence>
    </Modal>
  );
};

// Style bez zmian
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    width: width * 0.85,
    padding: 24,
    borderRadius: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20.5,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  message: {
    fontSize: 15.5,
    textAlign: "center",
    marginBottom: 20.5,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    width: "100%",
  },
  button: {
    borderRadius: 40,
    paddingVertical: 8.8,
    paddingHorizontal: 15,
    minWidth: 103,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "transparent",
  },
  confirmButton: {},
  buttonText: {
    fontSize: 15.5,
    fontWeight: "bold",
  },
});

export default ConfirmationModal;
