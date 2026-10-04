import { describeFileStoreContract } from './file-store-contract.ts';
import { MemoryFileStore } from './memory-file-store.ts';

describeFileStoreContract('MemoryFileStore', async () => {
  const store = new MemoryFileStore();
  return Object.assign(store, {
    async seed(name: string, text: string) {
      store.files.set(name, text);
    },
  });
});
