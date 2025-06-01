// app/components/CustomStepIndicator.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native"; // Usunięto Platform, bo nie jest tu używany

interface CustomStepIndicatorProps {
  currentPosition: number;
  labels: string[];
  stepCount: number;
  // Możesz dodać tu propsy do stylizacji
}

const CustomStepIndicator: React.FC<CustomStepIndicatorProps> = ({
  currentPosition,
  labels,
  stepCount,
}) => {
  // Usunięto pierwszą, niekompletną pętlę 'steps'
  // const steps = [];
  // for (let i = 0; i < stepCount; i++) {
  //   steps.push(
  //     <View key={i} style={styles.stepContainer}> // BŁĄD: styles.stepContainer nie istnieje
  //       {i > 0 && (
  //         <View
  //           style={[
  //             styles.line, // BŁĄD: styles.line nie istnieje
  //             i <= currentPosition ? styles.lineCompleted : {}, // BŁĄD: styles.lineCompleted nie istnieje
  //           ]}
  //         />
  //       )}
  //       {/* ... reszta starej pętli ... */}
  //     </View>
  //   );
  // }

  // Używamy tylko tej implementacji
  const renderedSteps = [];
  for (let i = 0; i < stepCount; i++) {
    const isActive = i === currentPosition;
    const isCompleted = i < currentPosition;

    renderedSteps.push(
      <View key={`step-${i}`} style={styles.stepItem}>
        <View
          style={[
            styles.circle,
            isActive ? styles.circleActive : {},
            isCompleted ? styles.circleCompleted : {},
          ]}
        >
          {isCompleted ? (
            <Text style={styles.checkMark}>✓</Text>
          ) : (
            <Text
              style={[styles.stepNumber, isActive && styles.stepNumberActive]}
            >
              {i + 1}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.label,
            isActive ? styles.labelActive : {},
            isCompleted ? styles.labelCompleted : {},
          ]}
        >
          {labels[i] || `Krok ${i + 1}`}
        </Text>
      </View>
    );

    if (i < stepCount - 1) {
      renderedSteps.push(
        <View
          key={`line-${i}`}
          style={[
            styles.lineSeparator,
            i < currentPosition ? styles.lineSeparatorCompleted : {},
          ]}
        />
      );
    }
  }

  return <View style={styles.indicatorRow}>{renderedSteps}</View>;
};

const styles = StyleSheet.create({
  indicatorRow: {
    flexDirection: "row",
    alignItems: "flex-start", // Aby kółko i etykieta były wyrównane do góry (dla etykiet pod kółkiem)
    // Jeśli etykiety są obok, można użyć 'center'
    justifyContent: "space-between", // Rozciąga elementy, w tym linie
    width: "100%",
  },
  stepItem: {
    alignItems: "center", // Wyśrodkowuje kółko i etykietę w pionie względem siebie
    // flex: 0, // Zapobiega rozciąganiu się stepItem przez linię, jeśli justifyContent to space-around
    // Można usunąć flexShrink, jeśli nie jest potrzebny
    paddingHorizontal: 5, // Mały padding, aby etykiety nie dotykały linii, jeśli są długie
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 15,
    backgroundColor: "#f0efef",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 5,
  },
  circleActive: {
    borderColor: "#961b9a",
    backgroundColor: "#ae05ea",
  },
  circleCompleted: {
    backgroundColor: "#059c78",
    borderColor: "#059c78",
  },
  stepNumber: {
    color: "#757575",
    fontSize: 13,
  },
  stepNumberActive: {
    color: "#6a1b9a",
  },
  checkMark: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  label: {
    fontSize: 11,
    color: "#ededed",
    textAlign: "center",
    // marginTop: 0.2, // Mały odstęp od kółka
  },
  labelActive: {
    color: "#8802b8",
    fontWeight: "bold",
  },
  labelCompleted: {
    color: "#059c78",
  },
  lineSeparator: {
    flexGrow: 1, // Pozwala linii się rozciągnąć
    height: 1.7,
    backgroundColor: "#e0e0e0",
    marginTop: 12 - 1, // (wysokość kółka / 2) - (wysokość linii / 2)
    // marginHorizontal: -5, // Ujemny margines, aby linia wchodziła "pod" padding stepItem, jeśli jest
  },
  lineSeparatorCompleted: {
    backgroundColor: "#059c78",
  },
});

export default CustomStepIndicator;
