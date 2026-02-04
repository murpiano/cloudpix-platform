import { hasFlag, setFlag } from '@/app/flags';

const carriesFiles = (event: DragEvent): boolean =>
  event.dataTransfer?.types.includes('Files') ?? false;

/** Lets a file be dropped anywhere on the page once the archive is revealed. */
export const initDropzone = (onFile: (file: File) => void): void => {
  let depth = 0;

  const stop = (): void => {
    depth = 0;
    setFlag('dropping', false);
  };

  addEventListener('dragenter', (event) => {
    if (!carriesFiles(event) || !hasFlag('revealed')) {
      return;
    }
    depth += 1;
    setFlag('dropping', true);
  });

  addEventListener('dragover', (event) => {
    if (carriesFiles(event)) {
      event.preventDefault(); // allow dropping instead of opening the file
    }
  });

  addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (depth === 0) {
      setFlag('dropping', false);
    }
  });

  addEventListener('drop', (event) => {
    if (!carriesFiles(event)) {
      return;
    }

    event.preventDefault();
    stop();

    const file = event.dataTransfer?.files[0];
    if (file && hasFlag('revealed')) {
      onFile(file);
    }
  });
};
