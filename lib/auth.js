import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'square-associates-mvp-secret-change-me')

export async function signToken(payload, expiresIn = '7d') {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SECRET)
}

export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload
  } catch {
    return null
  }
}

export async function getUserFromRequest(request) {
  const cookie = request.headers.get('cookie') || ''
  const m = cookie.match(/sa_token=([^;]+)/)
  if (!m) return null
  return await verifyToken(decodeURIComponent(m[1]))
}
