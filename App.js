import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CameraScreen from './components/CameraScreen';
import EditScreen from './components/EditScreen';
import DocumentsScreen from './components/DocumentsScreen';

export default function App() {
  const [screen, setScreen] = useState('camera'); // 'camera', 'edit', 'documents'
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documents, setDocuments] = useState([]);

  const navigateToEdit = (document) => {
    setCurrentDocument(document);
    setScreen('edit');
  };

  const navigateToDocuments = () => {
    setScreen('documents');
  };

  const navigateToCamera = () => {
    setScreen('camera');
  };

  const addDocument = (document) => {
    setDocuments([...documents, document]);
  };

  const updateDocument = (docId, updates) => {
    setDocuments(documents.map(doc =>
      doc.id === docId ? { ...doc, ...updates } : doc
    ));
  };

  return (
    <View style={styles.container}>
      {screen === 'camera' && (
        <CameraScreen
          onNavigateToEdit={navigateToEdit}
          onAddDocument={addDocument}
          onNavigateToDocuments={navigateToDocuments}
        />
      )}
      {screen === 'edit' && (
        <EditScreen
          document={currentDocument}
          onNavigateBack={navigateToCamera}
          onNavigateToDocuments={navigateToDocuments}
          onUpdateDocument={updateDocument}
        />
      )}
      {screen === 'documents' && (
        <DocumentsScreen
          documents={documents}
          onNavigateToCamera={navigateToCamera}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
