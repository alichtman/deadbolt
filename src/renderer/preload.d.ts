declare global {
  interface Window {
    electronAPI: {
      revealFileInFinder: (filePath: string | undefined) => Promise<string>;
      encryptFileRequest: (
        filePath: string,
        password: string,
      ) => Promise<string>;
      decryptFileRequest: (
        filePath: string,
        password: string,
      ) => Promise<string>;
      prettyPrintFilePath: (filePath: string) => Promise<string>;
    };
  }
}

export {};
