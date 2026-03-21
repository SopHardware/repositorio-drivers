import { IStorage, IStorageFactory } from '../interfaces/IStorage.js';
import { googleDriveStorage } from './GoogleDriveStorage.js';

export class StorageFactory implements IStorageFactory {
  private static instance: StorageFactory;
  private storage: IStorage;

  private constructor() {
    this.storage = googleDriveStorage;
  }

  static getInstance(): StorageFactory {
    if (!StorageFactory.instance) {
      StorageFactory.instance = new StorageFactory();
    }
    return StorageFactory.instance;
  }

  getStorage(): IStorage {
    return this.storage;
  }
}

export const storageFactory = StorageFactory.getInstance();
export const storage = storageFactory.getStorage();
