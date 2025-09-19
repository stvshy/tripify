import React from "react";
import { StyleSheet, Dimensions, View } from "react-native";
import { WebView } from "react-native-webview";

const { width, height } = Dimensions.get("window");

export default function GradientBackdrop() {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          width: 100vw;
          height: 100vh;
          background-color: #111827;
          background-image: 
            radial-gradient(at 27% 37%, #43CBFF 0px, transparent 50%),
            radial-gradient(at 97% 21%, #9708cc 0px, transparent 50%),
            radial-gradient(at 52% 99%, #43CBFF 0px, transparent 50%),
            radial-gradient(at 10% 29%, #9708cc 0px, transparent 50%),
            radial-gradient(at 97% 96%, #43CBFF 0px, transparent 50%),
            radial-gradient(at 33% 50%, #9708cc 0px, transparent 50%),
            radial-gradient(at 79% 53%, #43CBFF 0px, transparent 50%);
        }
      </style>
    </head>
    <body></body>
    </html>
  `;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <WebView
        source={{ html: htmlContent }}
        style={StyleSheet.absoluteFill}
        scrollEnabled={false}
        bounces={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        javaScriptEnabled={false}
        domStorageEnabled={false}
        startInLoadingState={false}
        scalesPageToFit={false}
        mixedContentMode="compatibility"
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.warn("WebView error: ", nativeEvent);
        }}
      />
    </View>
  );
}
