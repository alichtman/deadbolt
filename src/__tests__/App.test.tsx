import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  isDeadboltFile,
  ENCRYPTED_FILE_EXTENSION,
} from '../renderer/utils/fileUtils';
import App from '../renderer/App';

// Mock the electronAPI
const mockElectronAPI = {
  encryptFileRequest: jest.fn(),
  decryptFileRequest: jest.fn(),
  revealFileInFinder: jest.fn(),
  prettyPrintFilePath: jest.fn(),
};

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

// Mock window.electronAPI
window.electronAPI = mockElectronAPI;

// describe('App', () => {
//   it('should render', () => {
//     expect(render(<App />)).toBeTruthy();
//   });
// });

describe('App', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isDeadboltFile', () => {
    it('should correctly identify Deadbolt files', () => {
      expect(isDeadboltFile('test.deadbolt')).toBe(true);
      expect(isDeadboltFile('test.dbolt')).toBe(true);
      expect(isDeadboltFile('test.txt')).toBe(false);
      expect(isDeadboltFile(undefined)).toBe(false);
      expect(
        isDeadboltFile('ERROR_FROM_ELECTRON_MAIN_THREAD: some error'),
      ).toBe(false);
    });
  });

  describe('File Upload View', () => {
    it('should render file upload component initially', () => {
      render(<App />);
      expect(
        screen.getByText(/drag and drop a file here/i),
      ).toBeInTheDocument();
    });

    it('should handle file selection and show encrypt form for non-encrypted file', async () => {
      const file = new File(['test content'], 'test.txt', {
        type: 'text/plain',
      });
      render(<App />);

      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, file);

      expect(screen.getByText(/encrypt file/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should handle file selection and show decrypt form for encrypted file', async () => {
      const file = new File(
        ['test content'],
        `test${ENCRYPTED_FILE_EXTENSION}`,
        { type: 'text/plain' },
      );
      render(<App />);

      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, file);

      expect(screen.getByText(/decrypt file/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });
  });

  describe('Encryption/Decryption Process', () => {
    it('should show loading state during encryption', async () => {
      mockElectronAPI.encryptFileRequest.mockImplementation(
        () => new Promise(() => {}),
      );

      render(<App />);
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, file);

      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(screen.getByRole('button', { name: /encrypt/i }));

      expect(screen.getByText(/working/i)).toBeInTheDocument();
    });

    it('should show success modal after successful encryption', async () => {
      mockElectronAPI.encryptFileRequest.mockResolvedValue(
        '/path/to/encrypted.deadbolt',
      );

      render(<App />);
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, file);

      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(screen.getByRole('button', { name: /encrypt/i }));

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });
    });

    it('should show error modal when encryption fails', async () => {
      mockElectronAPI.encryptFileRequest.mockResolvedValue(
        'ERROR_FROM_ELECTRON_MAIN_THREAD: Failed to encrypt',
      );

      render(<App />);
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, file);

      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(screen.getByRole('button', { name: /encrypt/i }));

      await waitFor(() => {
        expect(screen.getByText(/failed to encrypt/i)).toBeInTheDocument();
      });
    });
  });

  describe('Success/Error Modal', () => {
    it('should copy path to clipboard and return to home on success modal close', async () => {
      mockElectronAPI.encryptFileRequest.mockResolvedValue(
        '/path/to/encrypted.deadbolt',
      );

      render(<App />);
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, file);

      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(screen.getByRole('button', { name: /encrypt/i }));

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /home/i }));

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '/path/to/encrypted.deadbolt',
      );
      expect(
        screen.getByText(/drag and drop a file here/i),
      ).toBeInTheDocument();
    });

    it('should reveal file in finder when button clicked', async () => {
      mockElectronAPI.encryptFileRequest.mockResolvedValue(
        '/path/to/encrypted.deadbolt',
      );
      mockElectronAPI.revealFileInFinder.mockResolvedValue(true);

      render(<App />);
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      const input = screen.getByTestId('file-input');
      await userEvent.upload(input, file);

      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'testpassword');
      await userEvent.click(screen.getByRole('button', { name: /encrypt/i }));

      await waitFor(() => {
        expect(screen.getByText(/success/i)).toBeInTheDocument();
      });

      await userEvent.click(screen.getByRole('button', { name: /reveal/i }));
      expect(mockElectronAPI.revealFileInFinder).toHaveBeenCalledWith(
        '/path/to/encrypted.deadbolt',
      );
    });
  });
});
