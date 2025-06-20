import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Shield, 
  Mail, 
  Smartphone, 
  Download, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Loader,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateDeviceFingerprint } from '../utils/advancedSecureDownloads';

const VerifyDownloadPage = () => {
  const { token } = useParams<{ token: string }>();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [sessionData, setSessionData] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  useEffect(() => {
    if (token) {
      setDeviceFingerprint(generateDeviceFingerprint());
      checkSession();
    }
  }, [token]);

  const checkSession = async () => {
    try {
      const { data: session, error } = await supabase
        .from('secure_download_sessions')
        .select('*')
        .eq('token', token)
        .eq('is_active', true)
        .single();

      if (error || !session) {
        setError('Invalid or expired session token');
        return;
      }

      // Check if session is expired
      if (new Date(session.expires_at) < new Date()) {
        setError('This download session has expired');
        return;
      }

      // Check download window
      const currentHour = new Date().getHours();
      if (currentHour < session.download_window_start || currentHour > session.download_window_end) {
        setError(`Downloads are only allowed between ${session.download_window_start}:00 and ${session.download_window_end}:00`);
        return;
      }

      setSessionData(session);

      // Get associated documents
      const { data: sessionDocs, error: docsError } = await supabase
        .from('session_documents')
        .select('*')
        .eq('session_id', session.id);

      if (!docsError && sessionDocs) {
        setDocuments(sessionDocs);
      }

    } catch (error) {
      console.error('Error checking session:', error);
      setError('Failed to verify session');
    }
  };

  const handleEmailVerification = async () => {
    if (!email || !sessionData) return;

    if (email.toLowerCase() !== sessionData.recipient_email.toLowerCase()) {
      setError('Email address does not match the authorized recipient');
      return;
    }

    setStep(2);
    setError(null);
  };

  const handleCodeVerification = async () => {
    if (!verificationCode || !sessionData) return;

    setIsVerifying(true);
    setError(null);

    try {
      if (verificationCode !== sessionData.verification_code) {
        setError('Invalid verification code');
        setIsVerifying(false);
        return;
      }

      // Update session as verified
      const { error: updateError } = await supabase
        .from('secure_download_sessions')
        .update({
          is_verified: true,
          device_fingerprint: deviceFingerprint,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionData.id);

      if (updateError) {
        throw updateError;
      }

      setStep(3);

    } catch (error) {
      console.error('Error verifying code:', error);
      setError('Failed to verify code');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDownload = async (documentId: string, documentUrl: string) => {
    try {
      // Update download count
      await supabase
        .from('session_documents')
        .update({
          download_count: documents.find(d => d.id === documentId)?.download_count + 1 || 1
        })
        .eq('id', documentId);

      // Update session download count
      await supabase
        .from('secure_download_sessions')
        .update({
          download_count: sessionData.download_count + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionData.id);

      // Trigger download
      const link = document.createElement('a');
      link.href = documentUrl;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Refresh session data
      checkSession();

    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const groupDocumentsByStage = () => {
    return documents.reduce((acc, doc) => {
      if (!acc[doc.review_stage]) {
        acc[doc.review_stage] = [];
      }
      acc[doc.review_stage].push(doc);
      return acc;
    }, {} as Record<string, any[]>);
  };

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-16">
        <div className="container mx-auto px-4 md:px-6 max-w-2xl">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200 mb-2">
              Access Denied
            </h1>
            <p className="text-red-600 dark:text-red-400 mb-6">{error}</p>
            <a
              href="/contact"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pt-24 pb-16">
      <div className="container mx-auto px-4 md:px-6 max-w-2xl">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
              <Shield className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-200 mb-2">
              Multi-Factor Authentication
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Secure document access verification
            </p>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}>
                <Mail className="h-4 w-4" />
              </div>
              <div className={`w-12 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}>
                <Smartphone className="h-4 w-4" />
              </div>
              <div className={`w-12 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-slate-300'}`}></div>
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-300 text-slate-600'
              }`}>
                <Download className="h-4 w-4" />
              </div>
            </div>
          </div>

          {/* Step 1: Email Verification */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-4">
                Step 1: Verify Your Email
              </h3>
              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:text-slate-200"
                  placeholder="Enter your email address"
                />
              </div>
              <button
                onClick={handleEmailVerification}
                disabled={!email}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Verify Email
              </button>
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {step === 2 && (
            <div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-4">
                Step 2: Enter Verification Code
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Enter the 6-digit verification code from your email
              </p>
              <div className="mb-4">
                <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Verification Code
                </label>
                <div className="relative">
                  <input
                    type={showCode ? 'text' : 'password'}
                    id="code"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-700 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-slate-900 dark:text-slate-200"
                    placeholder="Enter 6-digit code"
                    maxLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCode(!showCode)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showCode ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                </div>
              </div>
              <button
                onClick={handleCodeVerification}
                disabled={!verificationCode || isVerifying}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isVerifying ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>
            </div>
          )}

          {/* Step 3: Document Download */}
          {step === 3 && (
            <div>
              <div className="flex items-center mb-6">
                <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200">
                  Verification Complete
                </h3>
              </div>

              {sessionData && (
                <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm text-green-800 dark:text-green-300 space-y-1">
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>
                        Session expires: {new Date(sessionData.expires_at).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <Download className="h-4 w-4 mr-2" />
                      <span>
                        Downloads: {sessionData.download_count} / {sessionData.max_downloads}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <h4 className="text-md font-medium text-slate-900 dark:text-slate-200 mb-4">
                Available Documents
              </h4>

              {Object.entries(groupDocumentsByStage()).map(([stage, stageDocs]) => (
                <div key={stage} className="mb-6">
                  <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                    {stage.replace('_', ' ').toUpperCase()}
                  </h5>
                  <div className="space-y-3">
                    {stageDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg"
                      >
                        <div>
                          <h6 className="font-medium text-slate-900 dark:text-slate-200">
                            {doc.document_name}
                          </h6>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {doc.document_category} • Downloaded {doc.download_count} times
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownload(doc.id, doc.document_url)}
                          disabled={sessionData?.download_count >= sessionData?.max_downloads}
                          className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyDownloadPage;