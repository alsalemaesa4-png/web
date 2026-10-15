import crypto from 'node:crypto'
import { readFileSync } from 'node:fs'
import admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { logger } from 'firebase-functions'

if (!admin.apps.length) {
  admin.initializeApp()
}

const auth = admin.auth()
const db = admin.firestore()

const OTP_COLLECTION = 'emailVerificationOtps'
const OTP_MIN_RESPONSE_MS = 800
const OTP_GENERIC_SEND_MESSAGE = 'If the email exists, an OTP has been sent.'
const OTP_GENERIC_VERIFY_ERROR = 'The verification code is invalid or expired.'
const PASSWORD_RESET_GENERIC_MESSAGE = 'If the email exists, a password reset link has been sent.'
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 5
const rateLimitMap = new Map()
const allowedOrigins = new Set([
  'https://olivegardentrading.com',
  'https://www.olivegardentrading.com',
  'https://olive-garden-1d06f.web.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
])
const downloadReleaseConfig = readDownloadReleaseConfig()

function readDownloadReleaseConfig() {
  try {
    const raw = readFileSync(new URL('./download-release.json', import.meta.url), 'utf8')
    return JSON.parse(raw)
  } catch (error) {
    logger.error('Failed to load download-release.json', error)
    return null
  }
}

function normalizeUrl(value) {
  return String(value || '').trim()
}

async function loadDownloadRelease() {
  const config = downloadReleaseConfig || {}
  const manifestCandidates = [
    normalizeUrl(config.manifest_url),
    normalizeUrl(config.website_manifest_url),
  ].filter(Boolean)

  for (const manifestUrl of manifestCandidates) {
    try {
      const response = await fetch(manifestUrl, {
        method: 'GET',
        headers: {
          accept: 'application/json',
        },
      })
      if (!response.ok) {
        logger.warn('download manifest request failed', {
          manifestUrl,
          status: response.status,
        })
        continue
      }

      const manifest = await response.json()
      const installerUrl = normalizeUrl(manifest?.installer_url)
      if (!installerUrl) {
        logger.warn('download manifest missing installer_url', { manifestUrl })
        continue
      }

      return {
        version: String(manifest?.latest_version || config.latest_version || '').trim(),
        releaseDate: String(manifest?.release_date || config.release_date || '').trim(),
        installerUrl,
      }
    } catch (error) {
      logger.warn('download manifest fetch failed', {
        manifestUrl,
        error: String(error?.message || error),
      })
    }
  }

  const fallbackInstallerUrl = normalizeUrl(config.installer_url)
  if (!fallbackInstallerUrl) {
    return null
  }

  return {
    version: String(config.latest_version || '').trim(),
    releaseDate: String(config.release_date || '').trim(),
    installerUrl: fallbackInstallerUrl,
  }
}

function getRuntimeConfig() {
  const config = {
    brevoApiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || '',
    senderName: process.env.BREVO_SENDER_NAME || 'OGT Nexus',
    otpSecret: process.env.EMAIL_OTP_SECRET || '',
    otpTtlMinutes: Number(process.env.EMAIL_OTP_TTL_MINUTES || 10),
    otpCooldownSeconds: Number(process.env.EMAIL_OTP_COOLDOWN_SECONDS || 60),
    otpMaxAttempts: Number(process.env.EMAIL_OTP_MAX_ATTEMPTS || 5),
  }

  if (!config.brevoApiKey || !config.senderEmail || !config.otpSecret) {
    throw new Error(
      'Missing required runtime config. Set BREVO_API_KEY, BREVO_SENDER_EMAIL, and EMAIL_OTP_SECRET in functions/.env.',
    )
  }

  return config
}

function setCorsHeaders(req, res) {
  const origin = String(req.headers?.origin || '').trim()
  if (origin && allowedOrigins.has(origin)) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
  }
  res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type')
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
}

function handlePreflight(req, res) {
  const origin = String(req.headers?.origin || '').trim()
  if (origin && !allowedOrigins.has(origin)) {
    if (req.method === 'OPTIONS') {
      res.status(403).send('')
      return true
    }
    return false
  }

  setCorsHeaders(req, res)
  if (req.method === 'OPTIONS') {
    res.status(204).send('')
    return true
  }

  return false
}

function sendJson(req, res, status, payload) {
  setCorsHeaders(req, res)
  res.status(status).json(payload)
}

function ensureAllowedOrigin(req, res) {
  const origin = String(req.headers?.origin || '').trim()
  if (!origin || allowedOrigins.has(origin)) {
    return true
  }
  res.status(403).json({ error: 'Not allowed by CORS.' })
  return false
}

function readBearerToken(req) {
  const authorization = String(req.headers?.authorization || '').trim()
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return ''
  }
  return authorization.slice(7).trim()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureMinimumDelay(startedAt, minimumMs = OTP_MIN_RESPONSE_MS) {
  const elapsed = Date.now() - startedAt
  const remaining = minimumMs - elapsed
  if (remaining > 0) {
    await sleep(remaining)
  }
}

function getClientIp(req) {
  const forwardedHeader = req.headers?.['x-forwarded-for']
  const forwarded = Array.isArray(forwardedHeader) ? forwardedHeader[0] : forwardedHeader
  const firstForwarded = String(forwarded || '')
    .split(',')
    .map((value) => value.trim())
    .find(Boolean)
  return (
    firstForwarded ||
    String(req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || 'unknown').trim() ||
    'unknown'
  )
}

function checkRateLimit(scope, req) {
  const now = Date.now()
  const key = `${scope}:${getClientIp(req)}`
  const existing = rateLimitMap.get(key) || []
  const timestamps = existing.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)

  if (timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitMap.set(key, timestamps)
    return false
  }

  timestamps.push(now)
  rateLimitMap.set(key, timestamps)

  for (const [entryKey, entryTimestamps] of rateLimitMap.entries()) {
    const freshTimestamps = entryTimestamps.filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS)
    if (freshTimestamps.length > 0) {
      rateLimitMap.set(entryKey, freshTimestamps)
    } else {
      rateLimitMap.delete(entryKey)
    }
  }

  return true
}

async function sendOtpProcessedResponse(req, res, startedAt) {
  await ensureMinimumDelay(startedAt)
  sendJson(req, res, 200, {
    success: true,
    message: OTP_GENERIC_SEND_MESSAGE,
  })
}

async function sendOtpVerifyFailure(req, res, startedAt) {
  await ensureMinimumDelay(startedAt)
  sendJson(req, res, 400, {
    error: OTP_GENERIC_VERIFY_ERROR,
    message: OTP_GENERIC_VERIFY_ERROR,
  })
}

async function sendPasswordResetProcessedResponse(req, res, startedAt) {
  await ensureMinimumDelay(startedAt)
  sendJson(req, res, 200, {
    success: true,
    message: PASSWORD_RESET_GENERIC_MESSAGE,
  })
}

async function resolveAuthorizedUser(req, email) {
  const cleanEmail = String(email || '').trim().toLowerCase()
  const idToken = readBearerToken(req)

  if (idToken) {
    const decoded = await auth.verifyIdToken(idToken)
    const tokenEmail = String(decoded.email || '').trim().toLowerCase()
    if (!tokenEmail) {
      const error = new Error('The authenticated session does not contain an email address.')
      error.statusCode = 400
      throw error
    }
    if (cleanEmail && tokenEmail !== cleanEmail) {
      const error = new Error('The provided email does not match the authenticated session.')
      error.statusCode = 403
      throw error
    }
    const userRecord = await auth.getUser(decoded.uid)
    return {
      uid: userRecord.uid,
      email: userRecord.email || tokenEmail,
      userRecord,
    }
  }

  if (!cleanEmail) {
    const error = new Error('Email is required.')
    error.statusCode = 400
    throw error
  }

  const userRecord = await auth.getUserByEmail(cleanEmail)
  return {
    uid: userRecord.uid,
    email: userRecord.email || cleanEmail,
    userRecord,
  }
}

function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

function hashOtpCode({ uid, email, code, secret }) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${uid}:${email}:${code}`)
    .digest('hex')
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function sendBrevoOtpEmail({
  apiKey,
  senderEmail,
  senderName,
  recipientEmail,
  recipientName,
  code,
  otpTtlMinutes,
}) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email: recipientEmail,
          name: recipientName || recipientEmail,
        },
      ],
      subject: 'رمز التحقق لحسابك في OGT Nexus',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #1f2937; line-height: 1.8;">
          <h2 style="margin: 0 0 12px;">رمز التحقق لحسابك</h2>
          <p style="margin: 0 0 12px;">استخدم الرمز التالي لإكمال التحقق من بريدك الإلكتروني:</p>
          <div style="margin: 18px 0; padding: 16px 18px; border-radius: 12px; background: #111827; color: #fbbf24; font-size: 32px; font-weight: 800; letter-spacing: 8px; text-align: center; direction: ltr;">
            ${code}
          </div>
          <p style="margin: 0 0 10px;">صلاحية الرمز: ${otpTtlMinutes} دقائق.</p>
          <p style="margin: 0;">إذا لم تطلب هذا الرمز، يمكنك تجاهل الرسالة.</p>
        </div>
      `,
      textContent: `رمز التحقق الخاص بك هو: ${code}. تنتهي صلاحيته خلال ${otpTtlMinutes} دقائق.`,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    const error = new Error('Brevo request failed.')
    error.statusCode = 502
    error.details = body
    throw error
  }
}

async function sendBrevoPasswordResetEmail({
  apiKey,
  senderEmail,
  senderName,
  recipientEmail,
  recipientName,
  resetLink,
}) {
  const safeName = recipientName || recipientEmail
  const safeLink = String(resetLink || '').trim()
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: {
        email: senderEmail,
        name: senderName,
      },
      to: [
        {
          email: recipientEmail,
          name: safeName,
        },
      ],
      subject: 'إعادة تعيين كلمة المرور في OGT Nexus',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; direction: rtl; text-align: right; color: #1f2937; line-height: 1.8;">
          <h2 style="margin: 0 0 12px;">إعادة تعيين كلمة المرور</h2>
          <p style="margin: 0 0 12px;">مرحبًا ${escapeHtml(safeName)}،</p>
          <p style="margin: 0 0 12px;">تلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك في OGT Nexus.</p>
          <p style="margin: 0 0 16px;">اضغط على الزر التالي لإكمال العملية بأمان:</p>
          <div style="margin: 18px 0; text-align: center;">
            <a href="${escapeHtml(safeLink)}" style="display: inline-block; padding: 14px 24px; border-radius: 12px; background: #d4af37; color: #111827; font-weight: 700; text-decoration: none;">
              إعادة تعيين كلمة المرور
            </a>
          </div>
          <p style="margin: 16px 0 10px;">إذا لم تعمل الزر، يمكنك فتح الرابط التالي يدويًا:</p>
          <p style="margin: 0 0 16px; word-break: break-word;"><a href="${escapeHtml(safeLink)}">${escapeHtml(safeLink)}</a></p>
          <p style="margin: 0;">إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة بأمان.</p>
        </div>
      `,
      textContent: `مرحبًا ${safeName}\n\nتلقينا طلبًا لإعادة تعيين كلمة المرور الخاصة بحسابك في OGT Nexus.\n\nاستخدم الرابط التالي لإكمال العملية:\n${safeLink}\n\nإذا لم تطلب إعادة التعيين، يمكنك تجاهل هذه الرسالة.`,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    const error = new Error('Brevo password reset request failed.')
    error.statusCode = 502
    error.details = body
    throw error
  }
}

export const sendEmailOtp = onRequest(
  {
    region: 'us-central1',
    cors: false,
    maxInstances: 10,
    invoker: 'public',
  },
  async (req, res) => {
    if (handlePreflight(req, res)) {
      return
    }
    if (!ensureAllowedOrigin(req, res)) {
      return
    }

    if (req.method !== 'POST') {
      sendJson(req, res, 405, { error: 'Method not allowed.' })
      return
    }

    const startedAt = Date.now()
    if (!checkRateLimit('sendEmailOtp', req)) {
      console.warn('OTP request processed')
      await sendOtpProcessedResponse(req, res, startedAt)
      return
    }

    if (!readBearerToken(req)) {
      console.warn('OTP request processed')
      await sendOtpProcessedResponse(req, res, startedAt)
      return
    }

    try {
      const config = getRuntimeConfig()
      const email = String(req.body?.email || '').trim().toLowerCase()
      const { userRecord, uid, email: resolvedEmail } = await resolveAuthorizedUser(req, email)

      if (!userRecord.email) {
        console.warn('OTP request processed')
        await sendOtpProcessedResponse(req, res, startedAt)
        return
      }

      if (userRecord.emailVerified) {
        console.warn('OTP request processed')
        await sendOtpProcessedResponse(req, res, startedAt)
        return
      }

      const otpRef = db.collection(OTP_COLLECTION).doc(uid)
      const otpSnapshot = await otpRef.get()
      const now = Date.now()

      if (otpSnapshot.exists) {
        const existing = otpSnapshot.data()
        const lastSentAt = existing?.lastSentAt?.toMillis?.() || 0
        const availableAt = lastSentAt + config.otpCooldownSeconds * 1000

        if (availableAt > now) {
          console.warn('OTP request processed')
          await sendOtpProcessedResponse(req, res, startedAt)
          return
        }
      }

      const code = createOtpCode()
      const codeHash = hashOtpCode({
        uid,
        email: resolvedEmail,
        code,
        secret: config.otpSecret,
      })

      await otpRef.set(
        {
          uid,
          email: resolvedEmail,
          codeHash,
          attempts: 0,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSentAt: admin.firestore.FieldValue.serverTimestamp(),
          expiresAt: admin.firestore.Timestamp.fromMillis(
            now + config.otpTtlMinutes * 60 * 1000,
          ),
        },
        { merge: true },
      )

      const userProfile = await db.collection('users').doc(uid).get()
      const displayName =
        userProfile.data()?.name || userRecord.displayName || userRecord.email.split('@')[0]

      await sendBrevoOtpEmail({
        apiKey: config.brevoApiKey,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        recipientEmail: resolvedEmail,
        recipientName: displayName,
        code,
        otpTtlMinutes: config.otpTtlMinutes,
      })

      await sendOtpProcessedResponse(req, res, startedAt)
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        console.warn('OTP request processed')
        await sendOtpProcessedResponse(req, res, startedAt)
        return
      }
      logger.error('sendEmailOtp failed', error)
      sendJson(req, res, error.statusCode || 500, {
        error: error.message || 'Failed to send verification code.',
      })
    }
  },
)

export const verifyEmailOtp = onRequest(
  {
    region: 'us-central1',
    cors: false,
    maxInstances: 10,
    invoker: 'public',
  },
  async (req, res) => {
    if (handlePreflight(req, res)) {
      return
    }
    if (!ensureAllowedOrigin(req, res)) {
      return
    }

    if (req.method !== 'POST') {
      sendJson(req, res, 405, { error: 'Method not allowed.' })
      return
    }

    const startedAt = Date.now()
    if (!checkRateLimit('verifyEmailOtp', req)) {
      console.warn('OTP request processed')
      await sendOtpVerifyFailure(req, res, startedAt)
      return
    }

    if (!readBearerToken(req)) {
      console.warn('OTP request processed')
      await sendOtpVerifyFailure(req, res, startedAt)
      return
    }

    try {
      const config = getRuntimeConfig()
      const email = String(req.body?.email || '').trim().toLowerCase()
      const code = String(req.body?.code || '').trim()
      const { userRecord, uid, email: resolvedEmail } = await resolveAuthorizedUser(req, email)

      if (!userRecord.email) {
        console.warn('OTP request processed')
        await sendOtpVerifyFailure(req, res, startedAt)
        return
      }

      if (!/^\d{6}$/.test(code)) {
        await sendOtpVerifyFailure(req, res, startedAt)
        return
      }

      if (userRecord.emailVerified) {
        await db.collection('users').doc(uid).set(
          {
            emailVerified: true,
            verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        )

        await ensureMinimumDelay(startedAt)
        sendJson(req, res, 200, { success: true, alreadyVerified: true })
        return
      }

      const otpRef = db.collection(OTP_COLLECTION).doc(uid)
      const otpSnapshot = await otpRef.get()

      if (!otpSnapshot.exists) {
        console.warn('OTP request processed')
        await sendOtpVerifyFailure(req, res, startedAt)
        return
      }

      const otpData = otpSnapshot.data()
      const expiresAt = otpData?.expiresAt?.toMillis?.() || 0
      const attempts = Number(otpData?.attempts || 0)

      if (expiresAt < Date.now()) {
        await otpRef.delete()
        await sendOtpVerifyFailure(req, res, startedAt)
        return
      }

      if (attempts >= config.otpMaxAttempts) {
        await sendOtpVerifyFailure(req, res, startedAt)
        return
      }

      const candidateHash = hashOtpCode({
        uid,
        email: resolvedEmail,
        code,
        secret: config.otpSecret,
      })

      if (candidateHash !== otpData.codeHash) {
        await otpRef.set(
          {
            attempts: admin.firestore.FieldValue.increment(1),
            lastAttemptAt: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true },
        )

        await sendOtpVerifyFailure(req, res, startedAt)
        return
      }

      await auth.updateUser(uid, { emailVerified: true })
      await db.collection('users').doc(uid).set(
        {
          emailVerified: true,
          verifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
      await otpRef.delete()

      await ensureMinimumDelay(startedAt)
      sendJson(req, res, 200, { success: true })
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        console.warn('OTP request processed')
        await sendOtpVerifyFailure(req, res, startedAt)
        return
      }
      logger.error('verifyEmailOtp failed', error)
      sendJson(req, res, error.statusCode || 500, {
        error: error.message || 'Failed to verify the code.',
      })
    }
  },
)

export const sendPasswordResetEmail = onRequest(
  {
    region: 'us-central1',
    cors: false,
    maxInstances: 10,
    invoker: 'public',
  },
  async (req, res) => {
    if (handlePreflight(req, res)) {
      return
    }
    if (!ensureAllowedOrigin(req, res)) {
      return
    }

    if (req.method !== 'POST') {
      sendJson(req, res, 405, { error: 'Method not allowed.' })
      return
    }

    const startedAt = Date.now()
    if (!checkRateLimit('sendPasswordResetEmail', req)) {
      await sendPasswordResetProcessedResponse(req, res, startedAt)
      return
    }

    try {
      const config = getRuntimeConfig()
      const email = String(req.body?.email || '').trim().toLowerCase()
      if (!email) {
        sendJson(req, res, 400, { error: 'Email is required.' })
        return
      }

      let userRecord
      try {
        userRecord = await auth.getUserByEmail(email)
      } catch (error) {
        if (error?.code === 'auth/user-not-found') {
          await sendPasswordResetProcessedResponse(req, res, startedAt)
          return
        }
        throw error
      }

      const resetLink = await auth.generatePasswordResetLink(email)
      const userProfile = await db.collection('users').doc(userRecord.uid).get()
      const displayName =
        userProfile.data()?.name || userRecord.displayName || userRecord.email?.split('@')[0] || email

      await sendBrevoPasswordResetEmail({
        apiKey: config.brevoApiKey,
        senderEmail: config.senderEmail,
        senderName: config.senderName,
        recipientEmail: email,
        recipientName: displayName,
        resetLink,
      })

      await sendPasswordResetProcessedResponse(req, res, startedAt)
    } catch (error) {
      logger.error('sendPasswordResetEmail failed', error)
      sendJson(req, res, error.statusCode || 500, {
        error: error.message || 'Failed to send password reset email.',
      })
    }
  },
)

export const downloadApp = onRequest(
  {
    region: 'us-central1',
    cors: false,
    maxInstances: 10,
    invoker: 'public',
  },
  async (req, res) => {
    if (handlePreflight(req, res)) {
      return
    }
    if (!ensureAllowedOrigin(req, res)) {
      return
    }

    if (req.method !== 'GET') {
      sendJson(req, res, 405, { error: 'Method not allowed.' })
      return
    }

    const idToken = readBearerToken(req)
    if (!idToken) {
      sendJson(req, res, 401, { error: 'Unauthorized.' })
      return
    }

    try {
      const decoded = await auth.verifyIdToken(idToken)
      const userRecord = await auth.getUser(decoded.uid)
      if (!userRecord.emailVerified) {
        sendJson(req, res, 403, { error: 'Email verification is required.' })
        return
      }

      const release = await loadDownloadRelease()
      if (!release?.installerUrl) {
        sendJson(req, res, 503, { error: 'Download release is not configured.' })
        return
      }

      sendJson(req, res, 200, {
        success: true,
        release: {
          version: release.version || '',
          releaseDate: release.releaseDate || '',
          installerUrl: release.installerUrl || '',
        },
      })
    } catch (error) {
      logger.error('downloadApp failed', error)
      sendJson(req, res, 500, { error: 'Failed to prepare the download.' })
    }
  },
)
