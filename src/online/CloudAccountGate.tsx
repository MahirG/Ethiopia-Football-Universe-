import { useEffect, useState } from 'react'
import { CheckCircle2, Cloud, LogOut, Mail, ShieldCheck } from 'lucide-react'
import {
  captureAuthSessionFromUrl, cloudAuthConfigured, hasCloudSession,
  requestMagicLink, signOutCloudSession,
} from './auth'
import './cloud-account.css'

export function CloudAccountGate() {
  const [email, setEmail] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const configured = cloudAuthConfigured()

  useEffect(() => {
    if (captureAuthSessionFromUrl()) {
      location.reload()
      return
    }
    setSignedIn(hasCloudSession())
  }, [])

  const sendLink = async () => {
    setSending(true)
    setMessage('')
    try {
      await requestMagicLink(email)
      setMessage('Secure sign-in link sent. Open it on this device to activate cloud services.')
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Unable to send sign-in link.')
    } finally {
      setSending(false)
    }
  }

  const signOut = async () => {
    await signOutCloudSession()
    location.reload()
  }

  return (
    <section className="online-account-gate">
      <div className="account-gate-icon">{signedIn ? <CheckCircle2 size={28} /> : <Cloud size={28} />}</div>
      <div className="account-gate-copy">
        <span className="eyebrow"><ShieldCheck size={14} /> Cloud account</span>
        <h2>{signedIn ? 'Cloud session active' : configured ? 'Activate cross-device progression' : 'Cloud service configuration required'}</h2>
        <p>{signedIn
          ? 'The Online Centre can now use your authenticated JWT with Row Level Security. Reloads keep the session until you sign out.'
          : configured
            ? 'Use a passwordless email link. The browser stores only the user session token; project secrets remain server-side.'
            : 'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable secure passwordless accounts. Local progression remains available.'}</p>
      </div>
      {signedIn ? (
        <button className="online-secondary" onClick={() => void signOut()}><LogOut size={17} /> Sign out</button>
      ) : configured ? (
        <div className="account-gate-form">
          <label><Mail size={16} /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
          <button className="online-primary" disabled={sending} onClick={() => void sendLink()}>{sending ? 'Sending…' : 'Send secure link'}</button>
          {message && <small>{message}</small>}
        </div>
      ) : <span className="online-status status-offline">local fallback</span>}
    </section>
  )
}
