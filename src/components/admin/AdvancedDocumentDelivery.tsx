import React, { useState } from 'react';
import { 
  Shield, 
  Smartphone, 
  Clock, 
  Database, 
  QrCode,
  Settings,
  Send,
  CheckCircle,
  AlertCircle,
  Loader
} from 'lucide-react';
import { useProjects } from '../../context/ProjectContext';
import { 
  generateMFADownloadLinks,
  generateBlockchainVerifiedLinks,
  generateProgressiveDownloadLinks,
  generateSecurePortalAccess,
  generateQRCodeDownloadLinks
} from '../../utils/advancedSecureDownloads';

interface AdvancedDocumentDeliveryProps {
  orderId: string;
  customerEmail: string;
  customerName: string;
  onClose: () => void;
}

const AdvancedDocumentDelivery: React.FC<AdvancedDocumentDeliveryProps> = ({
  orderId,
  customerEmail,
  customerName,
  onClose
}) => {
  const { orders, getProjectDocuments } = useProjects();
  const [selectedMethod, setSelectedMethod] = useState<string>('mfa');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const order = orders.find(o => o.id === orderId);
  const documents = order ? getProjectDocuments(order.projectId) : [];

  const deliveryMethods = [
    {
      id: 'mfa',
      name: 'Multi-Factor Authentication',
      icon: Shield,
      description: 'Email verification + OTP + device fingerprinting',
      features: ['Email + OTP verification', 'Device fingerprinting', 'Time-restricted access', 'Download monitoring'],
      security: 'Highest',
      complexity: 'Medium'
    },
    {
      id: 'blockchain',
      name: 'Blockchain Verification',
      icon: Database,
      description: 'Cryptographically secured with blockchain proof',
      features: ['Immutable delivery records', 'Cryptographic proof', 'Public verification', 'Non-repudiation'],
      security: 'Highest',
      complexity: 'Low'
    },
    {
      id: 'progressive',
      name: 'Progressive Unlock',
      icon: Clock,
      description: 'Documents unlock over time by review stages',
      features: ['Time-based unlocking', 'Stage progression', 'Extended access', 'Learning path'],
      security: 'Medium',
      complexity: 'Low'
    },
    {
      id: 'portal',
      name: 'Secure Customer Portal',
      icon: Settings,
      description: 'Dedicated dashboard with real-time tracking',
      features: ['Personal dashboard', 'Download tracking', 'Support chat', 'Mobile friendly'],
      security: 'High',
      complexity: 'Medium'
    },
    {
      id: 'qr',
      name: 'QR Code + Mobile',
      icon: QrCode,
      description: 'Mobile-first access with QR code scanning',
      features: ['QR code scanning', 'Mobile app integration', 'Offline access', 'Share protection'],
      security: 'Medium',
      complexity: 'Low'
    }
  ];

  const handleDelivery = async () => {
    if (!order || documents.length === 0) {
      setError('No documents available for delivery');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const formattedDocuments = documents.map(doc => ({
        id: doc.id,
        name: doc.name,
        url: doc.url,
        category: doc.document_category,
        review_stage: doc.review_stage
      }));

      let deliveryResult;

      switch (selectedMethod) {
        case 'mfa':
          deliveryResult = await generateMFADownloadLinks(
            formattedDocuments,
            customerEmail,
            orderId,
            {
              expirationHours: 48,
              maxDownloads: 3,
              requireEmailVerification: true,
              requireOTP: true,
              enableDeviceFingerprinting: true,
              allowedDownloadWindow: { startHour: 9, endHour: 18 }
            }
          );
          break;

        case 'blockchain':
          deliveryResult = await generateBlockchainVerifiedLinks(
            formattedDocuments,
            customerEmail,
            orderId
          );
          break;

        case 'progressive':
          deliveryResult = await generateProgressiveDownloadLinks(
            formattedDocuments.map(doc => ({
              ...doc,
              unlock_delay_hours: doc.review_stage === 'review_1' ? 0 : 
                                 doc.review_stage === 'review_2' ? 24 : 48
            })),
            customerEmail,
            orderId
          );
          break;

        case 'portal':
          deliveryResult = await generateSecurePortalAccess(
            formattedDocuments,
            customerEmail,
            orderId,
            customerName
          );
          break;

        case 'qr':
          deliveryResult = await generateQRCodeDownloadLinks(
            formattedDocuments,
            customerEmail,
            orderId
          );
          break;

        default:
          throw new Error('Invalid delivery method selected');
      }

      setResult(deliveryResult);

    } catch (err) {
      console.error('Advanced delivery error:', err);
      setError(err instanceof Error ? err.message : 'Failed to process delivery');
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedMethodData = deliveryMethods.find(m => m.id === selectedMethod);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-200">
              Advanced Document Delivery
            </h3>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Order Information */}
          <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <h4 className="font-medium text-slate-900 dark:text-slate-200 mb-2">Order Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Customer:</span>
                <p className="font-medium">{customerName}</p>
                <p className="text-slate-600 dark:text-slate-400">{customerEmail}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Project:</span>
                <p className="font-medium">{order?.project_title || order?.projectTitle}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Documents:</span>
                <p className="font-medium">{documents.length} files available</p>
              </div>
            </div>
          </div>

          {/* Delivery Method Selection */}
          <div className="mb-6">
            <h4 className="text-lg font-medium text-slate-900 dark:text-slate-200 mb-4">
              Choose Delivery Method
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {deliveryMethods.map((method) => {
                const IconComponent = method.icon;
                const isSelected = selectedMethod === method.id;
                
                return (
                  <div
                    key={method.id}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-slate-300 dark:border-slate-700 hover:border-slate-400'
                    }`}
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    <div className="flex items-center mb-3">
                      <IconComponent className={`h-6 w-6 mr-3 ${
                        isSelected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'
                      }`} />
                      <h5 className="font-medium text-slate-900 dark:text-slate-200">
                        {method.name}
                      </h5>
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                      {method.description}
                    </p>
                    
                    <div className="space-y-1">
                      {method.features.slice(0, 2).map((feature, index) => (
                        <div key={index} className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                          <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                          {feature}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between mt-3 text-xs">
                      <span className={`px-2 py-1 rounded ${
                        method.security === 'Highest' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
                        method.security === 'High' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
                        'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                      }`}>
                        {method.security} Security
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {method.complexity} Setup
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Method Details */}
          {selectedMethodData && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h5 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                {selectedMethodData.name} Features:
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {selectedMethodData.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-blue-800 dark:text-blue-300">
                    <CheckCircle className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-4 rounded-lg flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Success Result */}
          {result && (
            <div className="mb-6 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-4 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="h-5 w-5 mr-2" />
                <h5 className="font-medium">Delivery Successful!</h5>
              </div>
              <div className="text-sm space-y-1">
                {selectedMethod === 'mfa' && (
                  <>
                    <p>MFA session created: {result.sessionId}</p>
                    <p>Verification email sent with OTP code</p>
                    <p>Expires: {new Date(result.expiresAt).toLocaleString()}</p>
                  </>
                )}
                {selectedMethod === 'blockchain' && (
                  <>
                    <p>Blockchain TX: {result.blockchainTxId}</p>
                    <p>Proof of delivery: {result.proofOfDelivery}</p>
                    <p>Verification email sent</p>
                  </>
                )}
                {selectedMethod === 'progressive' && (
                  <>
                    <p>Progressive session: {result.sessionId}</p>
                    <p>Unlock schedule: {result.unlockSchedule.length} stages</p>
                    <p>Schedule email sent to customer</p>
                  </>
                )}
                {selectedMethod === 'portal' && (
                  <>
                    <p>Portal created with temporary password</p>
                    <p>Access token: {result.accessToken}</p>
                    <p>Portal credentials sent via email</p>
                  </>
                )}
                {selectedMethod === 'qr' && (
                  <>
                    <p>QR code generated</p>
                    <p>Verification token: {result.verificationToken}</p>
                    <p>Mobile access email sent</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              disabled={isProcessing}
            >
              {result ? 'Close' : 'Cancel'}
            </button>
            
            {!result && (
              <button
                onClick={handleDelivery}
                disabled={isProcessing || documents.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isProcessing ? (
                  <>
                    <Loader className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send via {selectedMethodData?.name}
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedDocumentDelivery;