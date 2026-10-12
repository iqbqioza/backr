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
  readMethod: "Read-only",
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
  loading: "Loading…",
  emptyProjects: "No projects yet. Publish the first one from “Start a project”.",
  notFound: "Project not found.",
  invalidId: "Invalid project ID",
  fetchFailed: "Failed to load from relay",
  retry: "Retry",
  back: "← Back to list",
  soon: "Soon",
} as const;

export const RELAY_BAR = {
  label: "Relay",
  reset: "Reset",
} as const;

export const HOME = {
  heroTag: "Featured project",
  recommended: "Recommended for you",
  endingSoon: "Ending soon",
  fresh: "New arrivals",
} as const;

export const GOAL_STATUS_LABEL = {
  achieved: "Goal reached!",
  ended: "Closed",
  "ending-soon": "Almost there",
  active: "Funding now",
} as const;

export const UNKNOWN_TITLE = "Untitled goal";

export const TITLE_FALLBACK = "Untitled";

export const GOAL_STATS = {
  supporters: "Supporters",
  timeLeft: "Time left",
  verified: "Verified tally (LNURL signer & amount checked)",
  unverified: "Unverified: the creator's lightning address is unknown",
  remainingToGoal: (amount: string) => `${amount} sats to go!`,
  recent: (count: number) => `${count} supporters in the last 24h!`,
  supporterCount: (count: number) => `${count} supporters`,
} as const;

export const SHARE = {
  copyUrl: "Copy page URL",
  copyNevent: "Copy nevent",
  copyDone: "Copied",
} as const;

export const GOAL_DETAIL = {
  placeholder: "⚡",
} as const;

export const TABS = {
  desc: "About",
  supporters: (count: number) => `Backers (${count})`,
  comments: (count: number) => `Comments (${count})`,
  reports: (count: number) => `Updates (${count})`,
  owner: "Owner",
} as const;

export const ZAP = {
  title: "Support this project",
  min: (sats: number) => `Minimum ${sats} sats`,
  max: (sats: number) => `Maximum ${sats} sats`,
  noWallet: "Funding closed. New zaps are not counted.",
  goalLine: (goal: string, amount: string) => `Goal ${goal} sats · Your zap ${amount}`,
  directNote: "Zaps go straight to the creator — all-or-nothing",
  submit: "Zap to support",
  working: "Working…",
  steps: {
    resolve: "Checking recipient…",
    sign: "Signing zap request…",
    invoice: "Requesting invoice…",
  },
  invoiceTitle: (amount: string) => `Invoice for ${amount} sats issued.`,
  invoiceNote: "Pay it with your wallet — the receipt will update the meter.",
  scanNote: "Scan with your wallet app",
  invoiceReady: "Invoice ready",
  showQr: "Show QR",
  close: "Close",
  discard: "Discard invoice",
  copyInvoice: "Copy invoice",
  copied: "Copied",
  share: "Share your support",
  shared: "Share text copied",
  confirmPaid: "I've paid — refresh tally",
  presetsLabel: "Amount",
  customPlaceholder: "Custom",
  commentPlaceholder: "Leave a message (optional)",
  loginRequired: "Please log in to support (read-only cannot zap)",
  needSession: "Login required",
  noPayTarget: "The creator has no lightning address (lud16/lud06)",
  lnurlConnectFailed: "Could not reach the LNURL server",
  lnurlBadResponse: (status: number) => `LNURL request failed: ${status}`,
  notPayRequest: "Not a valid LNURL-pay response",
  noNostr: "This wallet does not support zaps",
  noCallback: "LNURL response is missing a callback",
  badRange: "Invalid sendable range",
  noNostrPubkey: "LNURL response is missing nostrPubkey",
  callbackFailed: "Could not reach the callback",
  invoiceBadResponse: (status: number) => `Invoice request failed: ${status}`,
  invoiceMissing: (reason: string) => `Could not get an invoice: ${reason}`,
  amountMismatch: "Invoice amount does not match",
  invoiceUnknown: "unknown",
  noClipboard: "Clipboard unavailable — copy the invoice manually",
} as const;

export const SUPPORTERS = {
  title: (count: number) => `Backers (${count})`,
  empty: "No backers yet. Be the first!",
  section: (count: number) => `Backers (${count})`,
} as const;

export const SUPPORTER_HIGHLIGHTS = {
  first: "First backer",
  top: "Top 3",
} as const;

export const ACTIVITY = {
  title: "Recent activity",
  zap: "Zap",
  comment: "Comment",
  report: "Update",
} as const;

export const COMMENTS = {
  ...SUPPORTERS,
  loading: "Loading comments…",
  needLogin: "Log in to post a comment.",
  inputPlaceholder: "Write a comment (plain text)",
  submit: "Post",
  posting: "Posting…",
  reply: "Reply",
  replying: "Replying…",
  replyTo: (name: string) => `Replying to ${name}`,
  cancel: "Cancel",
  replyLevel: (depth: number) => `Reply L${depth}`,
  remove: "Delete",
  working: "Deleting…",
  confirm: "Delete this comment?",
  failed: "Could not post comment",
  failedDelete: "Could not delete",
} as const;

export const REPORTS = {
  section: (count: number) => `Updates (${count})`,
  empty: "No updates yet.",
  formTitle: "Write an update",
  titlePlaceholder: "Title",
  bodyPlaceholder: "Progress and announcements (Markdown)",
  submit: "Publish update",
  publishing: "Publishing…",
  edit: "Edit",
  save: "Save",
  saving: "Saving…",
  remove: "Delete",
  working: "Working…",
  confirm: "Delete this update?",
  failed: "Could not save update",
} as const;

export const OWNER = {
  title: "Project owner",
  loading: "Loading…",
  noProfile: "No profile published yet.",
} as const;

export const CREATE = {
  title: "Start a project",
  loginNotice:
    "You need to log in to publish. Use “Log in” in the header — you can still draft below.",
  creator: "Creator (npub / hex)",
  creatorFallback: (key: string) => `Creator: ${key}`,
  summary: "Short description",
  summaryPlaceholder: "e.g. Help us host a Nostr hackathon",
  description: "Details",
  descriptionPlaceholder: "How funds will be used, timeline, etc.",
  goal: "Goal (sats)",
  goalPlaceholder: "100000",
  deadline: "Deadline (optional)",
  image: "Image URL (optional)",
  imagePlaceholder: "https://…",
  build: "Review event",
  preview: "Preview",
  titleFallback: "Add a title",
  descFallback: "Add a description",
  goalLine: (goal: string) => `Goal: ${goal}`,
  noDeadline: "No deadline",
  publish: (relay: string) => `Publish to ${relay}`,
  publishing: "Publishing…",
  publishSoon: "Signing and publishing will be available soon.",
  published: (link: string) => `Published! ${link}`,
  openDetail: "Open project page",
  errors: {
    creator: "Creator npub/hex is invalid (auto-filled when logged in)",
    goal: "Goal must be a positive number of sats",
    deadline: "Invalid deadline",
    noSignature: "Signing failed (read-only or not logged in)",
    rejected: (msg: string) => `Relay rejected: ${msg}`,
    failed: "Publishing failed",
  },
} as const;

export const ABOUT = {
  title: "About Backr",
  lead: "Backr is crowdfunding that lives entirely on Nostr. No accounts, no servers — just your keys.",
  mechanics: "How it works",
  mechanicsItems: [
    "Zaps go straight to the creator; Backr never holds funds",
    "All-or-nothing: no refunds regardless of deadline or outcome",
    "The progress meter sums verified zap receipts (kind:9735)",
    "Zaps after the deadline (closed_at) are excluded from the tally",
  ],
  nips: "Supported NIPs",
} as const;

export const NIP_TABLE = {
  nipl01: "Keys, events and relay messaging",
  nipl19: "nevent / npub / nsec encoding",
  nipl23: "Long-form updates (kind:30023)",
  nipl57: "Lightning zaps (kind:9734 → kind:9735)",
  nipl75: "Funding goals (kind:9041) — no custom kinds",
} as const;
