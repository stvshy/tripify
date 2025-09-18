// declaration.d.ts
declare module "*.svg" {
  import React from "react";
  import { SvgProps } from "react-native-svg";
  const content: React.FC<SvgProps>;
  export default content;
}
declare module "*.png" {
  import { ImageSourcePropType } from "react-native";
  const value: ImageSourcePropType;
  export default value;
}
declare module "react-native-draggable-flatlist" {
  import { FlatListProps } from "react-native";
  import React from "react";

  export type DragEndParams<T> = { data: T[]; from: number; to: number };
  export type RenderItemParams<T> = {
    item: T;
    getIndex?: () => number | undefined;
    drag: () => void;
    isActive: boolean;
  };
  export interface DraggableFlatListProps<T>
    extends Omit<
      FlatListProps<T>,
      "renderItem" | "onDragEnd" | "keyExtractor"
    > {
    data: T[];
    renderItem: (params: RenderItemParams<T>) => React.ReactElement | null;
    keyExtractor: (item: T, index: number) => string;
    onDragEnd: (params: DragEndParams<T>) => void;
    onDragBegin?: (index: number) => void;
    activationDistance?: number;
    autoscrollThreshold?: number;
    autoscrollSpeed?: number;
    dragItemOverflow?: boolean;
  }
  export default class DraggableFlatList<T> extends React.Component<
    DraggableFlatListProps<T>
  > {}
}
