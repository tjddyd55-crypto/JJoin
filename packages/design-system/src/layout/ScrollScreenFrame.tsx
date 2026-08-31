import { forwardRef } from 'react';

import { ScrollView, type ScrollViewProps } from 'react-native';

import { ScreenFrame, type ScreenFrameProps } from './ScreenFrame';

import { useTheme } from '../theme';



export type ScrollScreenFrameProps = ScreenFrameProps &

  ScrollViewProps & {

    contentPaddingBottom?: number;

  };



export const ScrollScreenFrame = forwardRef<ScrollView, ScrollScreenFrameProps>(function ScrollScreenFrame(

  {

    padded = true,

    edges,

    contentPaddingBottom,

    style,

    contentContainerStyle,

    children,

    ...rest

  },

  ref,

) {

  const theme = useTheme();

  const bottomInset = contentPaddingBottom ?? theme.layoutSpacing.sectionGap;



  return (

    <ScreenFrame padded={false} edges={edges} style={style}>

      <ScrollView

        ref={ref}

        style={{ flex: 1 }}

        keyboardShouldPersistTaps="handled"

        contentContainerStyle={[

          padded && { paddingHorizontal: theme.layoutSpacing.screenHorizontal },

          { paddingBottom: bottomInset, flexGrow: 1 },

          contentContainerStyle,

        ]}

        {...rest}

      >

        {children}

      </ScrollView>

    </ScreenFrame>

  );

});


