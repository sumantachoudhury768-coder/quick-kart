import { useState } from 'react';
import { MailCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export function EmailVerificationBanner() {
  const { firebaseUser, resendVerificationEmail, refreshUserVerification } = useAuth();
  const [busy, setBusy] = useState(false);

  if (!firebaseUser || firebaseUser.emailVerified) return null;

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-950">
        <div className="flex items-start sm:items-center gap-2.5">
          <MailCheck className="h-4 w-4 text-amber-700 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <span>
            Please verify <strong>{firebaseUser.email}</strong> via the link sent to your inbox before placing orders or saving addresses.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await resendVerificationEmail();
              setBusy(false);
            }}
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100 transition-colors"
          >
            Resend Link
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await refreshUserVerification();
              setBusy(false);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-950 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
            I&apos;ve Verified
          </button>
        </div>
      </div>
    </div>
  );
}
