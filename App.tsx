import React from 'react';
import { ThemeProvider } from 'styled-components';
import { Home } from './src/screens/Home';
import Webrtc from './src/screens/Webrtc';
import theme from './src/styles/theme';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <Webrtc />
    </ThemeProvider>
  )
}
