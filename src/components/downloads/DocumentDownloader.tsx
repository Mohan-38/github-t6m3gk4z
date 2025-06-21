import React, { useState } from 'react';
import { Download, Package, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { downloadFile, generateDownloadableLinks, generateDownloadPackage } from '../../utils/documentDownload';

interface Document {
  id: string;
  name: string;
  url: string;
  size?: number;
  category?: string;
}

interface DocumentDownloaderProps {
  documents: Document[];
  title?: string;
  allowBulkDownload?: boolean;
}

const DocumentDownloader: React.FC<DocumentDownloaderProps> = ({
  documents,
  title = "Project Documents",
  allowBulkDownload = true
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [downloadStatus, setDownloadStatus] = useState<{ [key: string]: 'success' | 'error' }>({});
  const [bulkDownloading, setBulkDownloading] = useState(false);

  const handleSingleDownload = async (document: Document) => {
    setDownloading(document.id);
    setDownloadStatus(prev => ({ ...prev, [document.id]: undefined as any }));

    try {
      // Generate downloadable link
      const [downloadableDoc] = await generateDownloadableLinks([document], {
        method: 'signed-url',
        expirationMinutes: 60
      });

      // Download the file
      await downloadFile(downloadableDoc.downloadUrl, document.name);
      
      setDownloadStatus(prev => ({ ...prev, [document.id]: 'success' }));
      
      // Clear success status after 3 seconds
      setTimeout(() => {
        setDownloadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[document.id];
          return newStatus;
        });
      }, 3000);

    } catch (error) {
      console.error('Download failed:', error);
      setDownloadStatus(prev => ({ ...prev, [document.id]: 'error' }));
      
      // Clear error status after 5 seconds
      setTimeout(() => {
        setDownloadStatus(prev => {
          const newStatus = { ...prev };
          delete newStatus[document.id];
          return newStatus;
        });
      }, 5000);
    } finally {
      setDownloading(null);
    }
  };

  const handleBulkDownload = async () => {
    setBulkDownloading(true);

    try {
      // Generate download package
      const packageUrl = await generateDownloadPackage(documents, `${title.replace(/\s+/g, '-').toLowerCase()}-documents.json`);
      
      // Download the package manifest
      const link = document.createElement('a');
      link.href = packageUrl;
      link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-manifest.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      window.URL.revokeObjectURL(packageUrl);

      // Also download individual files
      for (const document of documents) {
        try {
          const [downloadableDoc] = await generateDownloadableLinks([document]);
          await downloadFile(downloadableDoc.downloadUrl, document.name);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay between downloads
        } catch (error) {
          console.error(`Failed to download ${document.name}:`, error);
        }
      }

    } catch (error) {
      console.error('Bulk download failed:', error);
    } finally {
      setBulkDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'Unknown size';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-200">
          {title}
        </h3>
        
        {allowBulkDownload && documents.length > 1 && (
          <button
            onClick={handleBulkDownload}
            disabled={bulkDownloading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {bulkDownloading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Package className="h-4 w-4 mr-2" />
                Download All ({documents.length})
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-3">
        {documents.map((document) => {
          const isDownloading = downloading === document.id;
          const status = downloadStatus[document.id];
          
          return (
            <div
              key={document.id}
              className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600"
            >
              <div className="flex items-center space-x-3">
                <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                <div>
                  <h4 className="font-medium text-slate-900 dark:text-slate-200">
                    {document.name}
                  </h4>
                  <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                    <span>{formatFileSize(document.size)}</span>
                    {document.category && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{document.category}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {status === 'success' && (
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Downloaded</span>
                  </div>
                )}
                
                {status === 'error' && (
                  <div className="flex items-center text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    <span className="text-sm">Failed</span>
                  </div>
                )}
                
                <button
                  onClick={() => handleSingleDownload(document)}
                  disabled={isDownloading}
                  className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isDownloading ? (
                    <>
                      <Loader className="h-4 w-4 mr-1 animate-spin" />
                      <span className="text-sm">Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-1" />
                      <span className="text-sm">Download</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {documents.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p>No documents available</p>
        </div>
      )}
    </div>
  );
};

export default DocumentDownloader;