import { useState, useEffect } from 'react';

export default function TrustCertificateModal() {
  const [showModal, setShowModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed or completed this
    const dismissed = localStorage.getItem('trustCertificateDismissed');
    const trusted = localStorage.getItem('trustCertificateCompleted');

    // Show modal on first launch if not already handled
    if (!dismissed && !trusted) {
      // Wait a bit after app loads to show the modal
      setTimeout(() => setShowModal(true), 2000);
    }
  }, []);

  const handleTrust = async () => {
    setProcessing(true);
    try {
      const result = await window.electronAPI.trustCertificate();

      if (result.success) {
        localStorage.setItem('trustCertificateCompleted', 'true');
        alert('Certificate trusted successfully! Future updates will install without Gatekeeper warnings.');
        setShowModal(false);
      } else {
        alert(`Failed to trust certificate: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error trusting certificate:', error);
      alert('Failed to trust certificate. Please try again or dismiss.');
    } finally {
      setProcessing(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('trustCertificateDismissed', 'true');
    setShowModal(false);
  };

  const handleLater = () => {
    setShowModal(false);
    // Don't set dismissed flag - will show again next launch
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Trust ProfileScraper Certificate?
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              ProfileScraper uses a self-signed certificate for code signing. Trusting this certificate will:
            </p>
            <ul className="text-sm text-gray-600 space-y-1 mb-4">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Future updates install without "Open Anyway" workaround</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>Smoother update experience</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>One-time setup (requires admin password)</span>
              </li>
            </ul>
            <p className="text-xs text-gray-500 italic">
              Note: This adds the certificate to your Mac's system keychain. You can remove it anytime from Keychain Access.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleTrust}
            disabled={processing}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
          >
            {processing ? 'Processing...' : 'Trust Certificate'}
          </button>
          <button
            onClick={handleLater}
            disabled={processing}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleDismiss}
            disabled={processing}
            className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            Don't Ask Again
          </button>
        </div>
      </div>
    </div>
  );
}
