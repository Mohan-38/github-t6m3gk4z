// Document Download Utility with Multiple Serving Methods
import { supabase } from '../lib/supabase';

export interface DocumentDownloadOptions {
  method: 'direct' | 'proxy' | 'signed-url' | 'base64';
  expirationMinutes?: number;
}

/**
 * Generate downloadable document links that work outside the development environment
 */
export const generateDownloadableLinks = async (
  documents: Array<{
    id: string;
    name: string;
    url: string;
    size?: number;
  }>,
  options: DocumentDownloadOptions = { method: 'signed-url', expirationMinutes: 60 }
): Promise<Array<{
  id: string;
  name: string;
  downloadUrl: string;
  expiresAt?: string;
}>> => {
  const downloadableLinks = [];

  for (const document of documents) {
    try {
      let downloadUrl = document.url;
      let expiresAt: string | undefined;

      switch (options.method) {
        case 'signed-url':
          // Generate signed URL for Supabase storage files
          if (document.url.includes('supabase')) {
            const pathMatch = document.url.match(/\/storage\/v1\/object\/public\/project-documents\/(.+)$/);
            if (pathMatch) {
              const { data, error } = await supabase.storage
                .from('project-documents')
                .createSignedUrl(pathMatch[1], (options.expirationMinutes || 60) * 60);
              
              if (!error && data) {
                downloadUrl = data.signedUrl;
                expiresAt = new Date(Date.now() + (options.expirationMinutes || 60) * 60 * 1000).toISOString();
              }
            }
          }
          break;

        case 'proxy':
          // Create a proxy URL that serves the file through our backend
          downloadUrl = `/api/download/${document.id}`;
          break;

        case 'base64':
          // Convert small files to base64 data URLs (for files < 1MB)
          if ((document.size || 0) < 1024 * 1024) {
            try {
              const response = await fetch(document.url);
              const blob = await response.blob();
              const base64 = await blobToBase64(blob);
              downloadUrl = base64;
            } catch (error) {
              console.error('Error converting to base64:', error);
              // Fallback to original URL
            }
          }
          break;

        case 'direct':
        default:
          // Use original URL (may not work outside dev environment)
          downloadUrl = document.url;
          break;
      }

      downloadableLinks.push({
        id: document.id,
        name: document.name,
        downloadUrl,
        expiresAt
      });

    } catch (error) {
      console.error(`Error generating download link for ${document.name}:`, error);
      // Fallback to original URL
      downloadableLinks.push({
        id: document.id,
        name: document.name,
        downloadUrl: document.url
      });
    }
  }

  return downloadableLinks;
};

/**
 * Create a download endpoint that serves files directly
 */
export const createDownloadEndpoint = async (documentId: string): Promise<string> => {
  try {
    // Store download request in database
    const { data, error } = await supabase
      .from('download_requests')
      .insert({
        document_id: documentId,
        requested_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      })
      .select()
      .single();

    if (error) throw error;

    // Return a download URL that includes the request ID
    return `/download/${data.id}`;
  } catch (error) {
    console.error('Error creating download endpoint:', error);
    throw error;
  }
};

/**
 * Convert blob to base64 data URL
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Download file directly to user's device
 */
export const downloadFile = async (url: string, filename: string): Promise<void> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Cleanup
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('Error downloading file:', error);
    throw error;
  }
};

/**
 * Generate secure download package (ZIP file with all documents)
 */
export const generateDownloadPackage = async (
  documents: Array<{
    name: string;
    url: string;
  }>,
  packageName: string = 'project-documents.zip'
): Promise<string> => {
  try {
    // This would require a backend service to create ZIP files
    // For now, we'll return a JSON manifest that can be processed
    const manifest = {
      packageName,
      documents: documents.map(doc => ({
        name: doc.name,
        url: doc.url
      })),
      createdAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    return window.URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error generating download package:', error);
    throw error;
  }
};