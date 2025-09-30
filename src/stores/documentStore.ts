import { create } from 'zustand';
import { Document, Page } from '../types';

interface DocumentStore {
  documents: Document[];
  currentDocument: Document | null;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  addPageToDocument: (documentId: string, page: Page) => void;
  removePageFromDocument: (documentId: string, pageId: string) => void;
  setCurrentDocument: (document: Document | null) => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  documents: [],
  currentDocument: null,

  addDocument: (document) =>
    set((state) => ({
      documents: [...state.documents, document],
    })),

  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === id ? { ...doc, ...updates, updatedAt: new Date() } : doc
      ),
    })),

  deleteDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((doc) => doc.id !== id),
    })),

  addPageToDocument: (documentId, page) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === documentId
          ? { ...doc, pages: [...doc.pages, page], updatedAt: new Date() }
          : doc
      ),
    })),

  removePageFromDocument: (documentId, pageId) =>
    set((state) => ({
      documents: state.documents.map((doc) =>
        doc.id === documentId
          ? {
              ...doc,
              pages: doc.pages.filter((p) => p.id !== pageId),
              updatedAt: new Date(),
            }
          : doc
      ),
    })),

  setCurrentDocument: (document) =>
    set({ currentDocument: document }),
}));
