import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import App from './App';
import './colors.css';

const theme = createTheme({
  components: {
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiInputBase-input': {
            color: 'var(--text-color-secondary)',
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'var(--text-color-secondary)',
            opacity: 0.8,
          },
        },
      },
    },
  },
});
const container = document.getElementById('root') as HTMLElement;
const root = createRoot(container);
root.render(
  <ThemeProvider theme={theme}>
    <App />
  </ThemeProvider>,
);
