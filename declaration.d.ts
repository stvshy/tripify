declare module "*.svg" {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare module "*.png" {
  const value: any;
  export default value;
}

declare module "*.ttf" {
  const value: any;
  export default value;
}

declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";
