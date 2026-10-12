/** UI コピー (英語) */

export const NAV = {
  brand: "Backr",
  discover: "Discover",
  create: "Start a project",
  about: "About",
  login: "Log in",
  logout: "Log out",
} as const;

export const AUTH = {
  title: "Log in",
  close: "Close",
  extension: "Browser extension",
  extensionDesc: "Sign with a NIP-07 extension (recommended)",
  extensionConnect: "Connect extension",
  nsec: "nsec",
  nsecDesc: "Enter your private key (kept in memory only)",
  nsecPlaceholder: "nsec1…",
  nsecLogin: "Log in with nsec",
  bunker: "Remote signer (NIP-46)",
  bunkerDesc: "Connect via bunker:// URL — your keys stay with the signer",
  bunkerPlaceholder: "bunker://…",
  bunkerConnect: "Connect bunker",
  bunkerConnecting: "Connecting…",
  readonly: "Read only",
  readonlyDesc: "Browse only with an npub (no signing)",
  readonlyPlaceholder: "npub1…",
  readonlyEnter: "Browse",
  memoryOnly: "Private keys are held in memory only. Never stored.",
  waiting: "Waiting for signer approval…",
  errors: {
    noExtension: "No NIP-07 browser extension found",
    badExtensionKey: "Extension returned an invalid public key",
    extensionDenied: "Connection to the extension was denied",
    badNsec: "Invalid nsec format",
    badNpub: "Invalid npub format",
    bunkerEmpty: "Enter a bunker:// URL",
  },
} as const;

export const STATES = {
  fetchFailed: "Failed to load from relay",
} as const;

export const HOME = {
  heroTag: "Featured project",
  endingSoon: "Ending soon",
  fresh: "New arrivals",
} as const;

export const ZAP = {
  scanNote: "Scan with your wallet app",
  invoiceReady: "Invoice ready",
  showQr: "Show QR",
  close: "Close",
  discard: "Discard invoice",
  submit: "Zap to support",
  needSession: "Login required",
  noPayTarget: "The creator has no lightning address (lud16/lud06)",
  lnurlConnectFailed: "Could not reach the LNURL server",
  lnurlBadResponse: (status: number) => `LNURL request failed: ${status}`,
  notPayRequest: "Not a valid LNURL-pay response",
  noNostr: "This wallet does not support zaps",
  noCallback: "LNURL response is missing a callback",
  badRange: "Invalid sendable range",
  noNostrPubkey: "LNURL response is missing nostrPubkey",
  min: (sats: number) => `Minimum ${sats} sats`,
  max: (sats: number) => `Maximum ${sats} sats`,
  callbackFailed: "Could not reach the callback",
  invoiceBadResponse: (status: number) => `Invoice request failed: ${status}`,
  invoiceMissing: (reason: string) => `Could not get an invoice: ${reason}`,
  amountMismatch: "Invoice amount does not match",
  invoiceUnknown: "unknown",
  buildFailed: "Could not build zap request",
  signFailed: "Signing failed",
} as const;

export const ACTIVITY = {
  zap: "Backed",
  comment: "Comment",
  report: "Update",
} as const;

export const REPORTS = {
  titlePlaceholder: "Title",
  bodyPlaceholder: "Progress and announcements (Markdown)",
} as const;

export const CREATE = {
  title: "Start a project",
  loginNotice:
    "You need to log in to publish. Use “Log in” in the header — you can still draft below.",
  summaryPlaceholder: "e.g. Help us host a Nostr hackathon",
  descriptionPlaceholder: "How funds will be used, timeline, etc.",
  publish: (relay: string) => `Publish to ${relay}`,
  errors: {
    creator: "Creator npub/hex is invalid (auto-filled when logged in)",
    goal: "Goal must be a positive number of sats",
    deadline: "Invalid deadline",
    noSignature: "Signing failed (read-only or not logged in)",
    rejected: (msg: string) => `Relay rejected: ${msg}`,
    failed: "Publishing failed",
  },
} as const;
