// app/components/CustomStepIndicator.tsx
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ScaledSheet, s, vs, ms } from "react-native-size-matters";

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
  // Size-matters scaling values
  const circleSize = ms(22);
  const fontSize = ms(12.8);
  const labelFontSize = ms(10.8);
  const marginBottom = vs(4.8);
  const lineHeight = vs(1.2);
  const paddingHorizontal = s(5);
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
      <View
        key={`step-${i}`}
        style={[
          styles.stepItem,
          {
            paddingHorizontal: paddingHorizontal,
          },
        ]}
      >
        <View
          style={[
            styles.circle,
            {
              width: circleSize,
              height: circleSize,
              borderRadius: circleSize / 2,
              marginBottom: marginBottom,
            },
            isActive ? styles.circleActive : {},
            isCompleted ? styles.circleCompleted : {},
          ]}
        >
          {isCompleted ? (
            <FontAwesome name="check" size={fontSize} color="#fff" />
          ) : (
            <Text
              style={[
                styles.stepNumber,
                { fontSize: fontSize },
                isActive && styles.stepNumberActive,
              ]}
            >
              {i + 1}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.label,
            { fontSize: labelFontSize },
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
            {
              height: lineHeight,
              marginTop: circleSize / 2 - lineHeight / 2,
            },
            i < currentPosition ? styles.lineSeparatorCompleted : {},
          ]}
        />
      );
    }
  }

  return <View style={styles.indicatorRow}>{renderedSteps}</View>;
};

const styles = ScaledSheet.create({
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
    // paddingHorizontal will be set dynamically
  },
  circle: {
    // width, height, borderRadius, marginBottom will be set dynamically
    backgroundColor: "#f0efef",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: "0.1@s",
    borderColor: "#e0e0e0",
  },
  circleActive: {
    borderColor: "#961b9a",
    backgroundColor: "#ae05ea",
  },
  circleCompleted: {
    backgroundColor: "#0ab958",
    borderColor: "#059c78",
  },
  stepNumber: {
    color: "#757575",
    // fontSize will be set dynamically
    textAlign: "center",
    lineHeight: ms(15.0), // Slightly smaller line height to move text up
    paddingLeft: ms(0.45), // Small shift to the right
  },
  stepNumberActive: {
    color: "#f0e4ef",
  },
  checkMark: {
    color: "#fff",
    fontSize: "16@ms",
    fontWeight: "bold",
  },
  label: {
    // fontSize will be set dynamically
    color: "#ededed",
    textAlign: "center",
    // marginTop: 0.2, // Mały odstęp od kółka
    fontFamily: "Figtree-Regular",
    marginTop: "-1@vs",
  },
  labelActive: {
    color: "#d216fa",
    // fontWeight: "bold",
    fontFamily: "Figtree-SemiBold", // Użyj Roboto-Medium, jeśli jest dostępne
    marginTop: "-1@vs",
  },
  labelCompleted: {
    color: "#02c959",
    marginTop: "-1@vs",
  },
  lineSeparator: {
    flexGrow: 1, // Pozwala linii się rozciągnąć
    // height and marginTop will be set dynamically
    backgroundColor: "#e0e0e0",
    // marginHorizontal: -5, // Ujemny margines, aby linia wchodziła "pod" padding stepItem, jeśli jest
  },
  lineSeparatorCompleted: {
    backgroundColor: "#01C356",
  },
});

export default CustomStepIndicator;
