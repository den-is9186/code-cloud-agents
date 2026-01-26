# 👤 USER MANAGEMENT SPECIFICATION

**Datum:** 2026-01-26
**Feature:** User Management + Authentication + 2FA
**Priorität:** 🔴 KRITISCH (blockiert Phase 1)
**Status:** Geplant

---

## 🎯 ANFORDERUNGEN

### User-Wunsch:
✅ **Minimal-Version mit 2FA**
- Login/Logout
- JWT Token
- User-Team Zuordnung
- **Two-Factor Authentication (2FA)**

---

## 🏗️ ARCHITECTURE

### Database Schema (Redis)

```typescript
// User
user:{userId} → {
  id: string;
  email: string;
  password_hash: string;  // bcrypt
  name: string;
  created_at: number;
  twofa_enabled: boolean;
  twofa_secret?: string;  // TOTP Secret (encrypted)
  backup_codes?: string[];  // Hashed backup codes
}

// User Sessions
session:{sessionId} → {
  user_id: string;
  token: string;  // JWT
  created_at: number;
  expires_at: number;
  ip: string;
  user_agent: string;
}

// User-Team Relations
user:{userId}:teams → [team_id_1, team_id_2, ...]
team:{teamId}:users → [user_id_1, user_id_2, ...]

// Team Roles
team:{teamId}:user:{userId}:role → "owner" | "admin" | "member"

// Indexes
users:by_email:{email} → user_id
```

---

## 🔐 AUTHENTICATION FLOW

### 1. Registration
```
POST /api/auth/register
Body: {
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}

→ Creates user
→ Sends verification email (optional für MVP)
→ Returns: { message: "User created. Please verify your email." }
```

### 2. Login (ohne 2FA)
```
POST /api/auth/login
Body: {
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

IF user.twofa_enabled === false:
  → Generate JWT
  → Return: { token, user }

IF user.twofa_enabled === true:
  → Generate temp token (5min TTL)
  → Return: { requires_2fa: true, temp_token }
```

### 3. Login (mit 2FA)
```
POST /api/auth/login/verify-2fa
Body: {
  "temp_token": "...",
  "code": "123456"  // TOTP Code from Authenticator App
}

→ Verify TOTP code
→ Generate JWT
→ Return: { token, user }
```

### 4. Enable 2FA
```
POST /api/auth/2fa/enable
Headers: { Authorization: Bearer <token> }

→ Generate TOTP secret
→ Return: {
    qr_code: "data:image/png;base64,...",  // QR Code für Authenticator App
    secret: "JBSWY3DPEHPK3PXP",  // Manual Entry
    backup_codes: ["12345678", "87654321", ...]  // 10 Backup Codes
  }
```

### 5. Confirm 2FA Activation
```
POST /api/auth/2fa/confirm
Headers: { Authorization: Bearer <token> }
Body: {
  "code": "123456"  // Test-Code vom User
}

→ Verify code
→ Activate 2FA für User
→ Return: { success: true }
```

### 6. Disable 2FA
```
POST /api/auth/2fa/disable
Headers: { Authorization: Bearer <token> }
Body: {
  "password": "CurrentPassword",
  "code": "123456"  // Letzter TOTP Code
}

→ Verify password + code
→ Disable 2FA
→ Delete secret + backup codes
→ Return: { success: true }
```

### 7. Backup Code Login
```
POST /api/auth/login/backup-code
Body: {
  "temp_token": "...",
  "backup_code": "12345678"
}

→ Verify backup code (einmalig verwendbar)
→ Mark backup code as used
→ Generate JWT
→ Return: { token, user, warning: "This backup code is now invalid" }
```

---

## 🛠️ IMPLEMENTATION

### 1. User Model
```typescript
// src/models/user.ts

import bcrypt from 'bcrypt';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  name: string;
  created_at: number;
  twofa_enabled: boolean;
  twofa_secret?: string;
  backup_codes?: string[];
}

export class UserService {
  async create(email: string, password: string, name: string): Promise<User> {
    const userId = generateId();
    const passwordHash = await bcrypt.hash(password, 10);

    const user: User = {
      id: userId,
      email,
      password_hash: passwordHash,
      name,
      created_at: Date.now(),
      twofa_enabled: false
    };

    await redis.hset(`user:${userId}`, user);
    await redis.set(`users:by_email:${email}`, userId);

    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = await redis.get(`users:by_email:${email}`);
    if (!userId) return null;

    const user = await redis.hgetall(`user:${userId}`);
    return user as User;
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async enable2FA(userId: string): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
    // Generate TOTP secret
    const secret = speakeasy.generateSecret({
      name: `Code Cloud Agents (${userId})`,
      length: 32
    });

    // Generate QR code
    const qrCode = await QRCode.toDataURL(secret.otpauth_url!);

    // Generate 10 backup codes
    const backupCodes = Array.from({ length: 10 }, () =>
      Math.random().toString(36).substring(2, 10).toUpperCase()
    );

    // Hash backup codes before storing
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Store (NOT activated yet)
    await redis.hset(`user:${userId}:2fa_pending`, {
      secret: secret.base32,
      backup_codes: JSON.stringify(hashedBackupCodes)
    });

    return {
      secret: secret.base32,
      qrCode,
      backupCodes
    };
  }

  async confirm2FA(userId: string, code: string): Promise<boolean> {
    const pending = await redis.hgetall(`user:${userId}:2fa_pending`);
    if (!pending) throw new Error('2FA not initiated');

    const verified = speakeasy.totp.verify({
      secret: pending.secret,
      encoding: 'base32',
      token: code
    });

    if (!verified) return false;

    // Activate 2FA
    await redis.hset(`user:${userId}`, {
      twofa_enabled: true,
      twofa_secret: pending.secret,
      backup_codes: pending.backup_codes
    });

    await redis.del(`user:${userId}:2fa_pending`);

    return true;
  }

  async verify2FA(userId: string, code: string): Promise<boolean> {
    const user = await redis.hgetall(`user:${userId}`);
    if (!user.twofa_enabled) return false;

    return speakeasy.totp.verify({
      secret: user.twofa_secret,
      encoding: 'base32',
      token: code,
      window: 1  // Allow 1 step before/after (30s tolerance)
    });
  }

  async verifyBackupCode(userId: string, code: string): Promise<boolean> {
    const user = await redis.hgetall(`user:${userId}`);
    if (!user.backup_codes) return false;

    const backupCodes = JSON.parse(user.backup_codes);

    // Find matching backup code
    for (let i = 0; i < backupCodes.length; i++) {
      const isValid = await bcrypt.compare(code, backupCodes[i]);
      if (isValid) {
        // Mark as used (remove from list)
        backupCodes.splice(i, 1);
        await redis.hset(`user:${userId}`, 'backup_codes', JSON.stringify(backupCodes));
        return true;
      }
    }

    return false;
  }

  async disable2FA(userId: string, password: string, code: string): Promise<boolean> {
    const user = await redis.hgetall(`user:${userId}`) as User;

    // Verify password
    const passwordValid = await this.verifyPassword(user, password);
    if (!passwordValid) return false;

    // Verify 2FA code
    const codeValid = await this.verify2FA(userId, code);
    if (!codeValid) return false;

    // Disable 2FA
    await redis.hdel(`user:${userId}`, 'twofa_secret', 'backup_codes');
    await redis.hset(`user:${userId}`, 'twofa_enabled', false);

    return true;
  }
}
```

### 2. JWT Service
```typescript
// src/services/jwt.ts

import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRY = '7d';  // 7 days
const TEMP_TOKEN_EXPIRY = '5m';  // 5 minutes (für 2FA)

export interface JWTPayload {
  user_id: string;
  email: string;
  type: 'auth' | 'temp';
}

export class JWTService {
  generateToken(userId: string, email: string): string {
    return jwt.sign(
      { user_id: userId, email, type: 'auth' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );
  }

  generateTempToken(userId: string, email: string): string {
    return jwt.sign(
      { user_id: userId, email, type: 'temp' },
      JWT_SECRET,
      { expiresIn: TEMP_TOKEN_EXPIRY }
    );
  }

  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  }

  async createSession(userId: string, token: string, req: Request): Promise<string> {
    const sessionId = generateId();

    await redis.hset(`session:${sessionId}`, {
      user_id: userId,
      token,
      created_at: Date.now(),
      expires_at: Date.now() + 7 * 24 * 60 * 60 * 1000,  // 7 days
      ip: req.ip,
      user_agent: req.headers['user-agent']
    });

    // Set expiry
    await redis.expire(`session:${sessionId}`, 7 * 24 * 60 * 60);

    return sessionId;
  }

  async destroySession(sessionId: string): Promise<void> {
    await redis.del(`session:${sessionId}`);
  }
}
```

### 3. Auth Middleware
```typescript
// src/middleware/auth.ts

import { Request, Response, NextFunction } from 'express';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or invalid authorization header'
      }
    });
  }

  const token = authHeader.substring(7);

  try {
    const payload = jwtService.verifyToken(token);

    if (payload.type !== 'auth') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Temporary token cannot be used for this endpoint'
        }
      });
    }

    // Attach user to request
    const user = await userService.findById(payload.user_id);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Token is invalid or expired'
      }
    });
  }
}
```

### 4. Auth Routes
```typescript
// src/api/auth.ts

import { Router } from 'express';
import { z } from 'zod';

const router = Router();

// Registration
const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1)
});

router.post('/auth/register', async (req, res) => {
  const { email, password, name } = RegisterSchema.parse(req.body);

  // Check if user exists
  const existing = await userService.findByEmail(email);
  if (existing) {
    return res.status(409).json({
      error: {
        code: 'USER_EXISTS',
        message: 'User with this email already exists'
      }
    });
  }

  // Create user
  const user = await userService.create(email, password, name);

  res.json({
    data: {
      message: 'User created successfully',
      user: { id: user.id, email: user.email, name: user.name }
    }
  });
});

// Login
const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = LoginSchema.parse(req.body);

  // Find user
  const user = await userService.findByEmail(email);
  if (!user) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }

  // Verify password
  const passwordValid = await userService.verifyPassword(user, password);
  if (!passwordValid) {
    return res.status(401).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password'
      }
    });
  }

  // Check 2FA
  if (user.twofa_enabled) {
    const tempToken = jwtService.generateTempToken(user.id, user.email);
    return res.json({
      data: {
        requires_2fa: true,
        temp_token: tempToken
      }
    });
  }

  // Generate JWT
  const token = jwtService.generateToken(user.id, user.email);
  const sessionId = await jwtService.createSession(user.id, token, req);

  res.json({
    data: {
      token,
      session_id: sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        twofa_enabled: user.twofa_enabled
      }
    }
  });
});

// 2FA Verify
const Verify2FASchema = z.object({
  temp_token: z.string(),
  code: z.string().length(6)
});

router.post('/auth/login/verify-2fa', async (req, res) => {
  const { temp_token, code } = Verify2FASchema.parse(req.body);

  // Verify temp token
  let payload;
  try {
    payload = jwtService.verifyToken(temp_token);
    if (payload.type !== 'temp') {
      throw new Error('Invalid token type');
    }
  } catch {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Temporary token is invalid or expired'
      }
    });
  }

  // Verify 2FA code
  const codeValid = await userService.verify2FA(payload.user_id, code);
  if (!codeValid) {
    return res.status(401).json({
      error: {
        code: 'INVALID_2FA_CODE',
        message: 'Invalid 2FA code'
      }
    });
  }

  // Generate JWT
  const user = await userService.findById(payload.user_id);
  const token = jwtService.generateToken(user.id, user.email);
  const sessionId = await jwtService.createSession(user.id, token, req);

  res.json({
    data: {
      token,
      session_id: sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        twofa_enabled: user.twofa_enabled
      }
    }
  });
});

// Backup Code Login
const BackupCodeSchema = z.object({
  temp_token: z.string(),
  backup_code: z.string().length(8)
});

router.post('/auth/login/backup-code', async (req, res) => {
  const { temp_token, backup_code } = BackupCodeSchema.parse(req.body);

  // Verify temp token
  let payload;
  try {
    payload = jwtService.verifyToken(temp_token);
    if (payload.type !== 'temp') {
      throw new Error('Invalid token type');
    }
  } catch {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Temporary token is invalid or expired'
      }
    });
  }

  // Verify backup code
  const codeValid = await userService.verifyBackupCode(payload.user_id, backup_code);
  if (!codeValid) {
    return res.status(401).json({
      error: {
        code: 'INVALID_BACKUP_CODE',
        message: 'Invalid or already used backup code'
      }
    });
  }

  // Generate JWT
  const user = await userService.findById(payload.user_id);
  const token = jwtService.generateToken(user.id, user.email);
  const sessionId = await jwtService.createSession(user.id, token, req);

  res.json({
    data: {
      token,
      session_id: sessionId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        twofa_enabled: user.twofa_enabled
      },
      warning: 'This backup code is now invalid. Please generate new codes if needed.'
    }
  });
});

// Enable 2FA
router.post('/auth/2fa/enable', requireAuth, async (req, res) => {
  const { secret, qrCode, backupCodes } = await userService.enable2FA(req.user.id);

  res.json({
    data: {
      qr_code: qrCode,
      secret,
      backup_codes: backupCodes
    }
  });
});

// Confirm 2FA
const Confirm2FASchema = z.object({
  code: z.string().length(6)
});

router.post('/auth/2fa/confirm', requireAuth, async (req, res) => {
  const { code } = Confirm2FASchema.parse(req.body);

  const confirmed = await userService.confirm2FA(req.user.id, code);
  if (!confirmed) {
    return res.status(400).json({
      error: {
        code: 'INVALID_CODE',
        message: 'Invalid 2FA code'
      }
    });
  }

  res.json({
    data: {
      success: true,
      message: '2FA enabled successfully'
    }
  });
});

// Disable 2FA
const Disable2FASchema = z.object({
  password: z.string(),
  code: z.string().length(6)
});

router.post('/auth/2fa/disable', requireAuth, async (req, res) => {
  const { password, code } = Disable2FASchema.parse(req.body);

  const disabled = await userService.disable2FA(req.user.id, password, code);
  if (!disabled) {
    return res.status(400).json({
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid password or 2FA code'
      }
    });
  }

  res.json({
    data: {
      success: true,
      message: '2FA disabled successfully'
    }
  });
});

// Logout
router.post('/auth/logout', requireAuth, async (req, res) => {
  const sessionId = req.headers['x-session-id'] as string;
  if (sessionId) {
    await jwtService.destroySession(sessionId);
  }

  res.json({
    data: {
      success: true,
      message: 'Logged out successfully'
    }
  });
});

export default router;
```

---

## 🎨 UI COMPONENTS

### 1. Login Component
```tsx
// frontend/components/Login.tsx

import { useState } from 'react';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [code, setCode] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const { data } = await response.json();

    if (data.requires_2fa) {
      setRequires2FA(true);
      setTempToken(data.temp_token);
    } else {
      // Store token + redirect
      localStorage.setItem('token', data.token);
      window.location.href = '/dashboard';
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();

    const response = await fetch('/api/auth/login/verify-2fa', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ temp_token: tempToken, code })
    });

    const { data } = await response.json();
    localStorage.setItem('token', data.token);
    window.location.href = '/dashboard';
  };

  if (requires2FA) {
    return (
      <form onSubmit={handleVerify2FA} className="space-y-4">
        <h2 className="text-2xl font-bold">Enter 2FA Code</h2>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="123456"
          className="w-full border border-gray-300 rounded-lg px-4 py-2"
          maxLength={6}
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">
          Verify
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <h2 className="text-2xl font-bold">Login</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full border border-gray-300 rounded-lg px-4 py-2"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full border border-gray-300 rounded-lg px-4 py-2"
      />
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg">
        Login
      </button>
    </form>
  );
}
```

### 2. Enable 2FA Component
```tsx
// frontend/components/Enable2FA.tsx

import { useState } from 'react';

export function Enable2FA() {
  const [qrCode, setQRCode] = useState('');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'init' | 'confirm' | 'done'>('init');

  const handleEnable = async () => {
    const response = await fetch('/api/auth/2fa/enable', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    const { data } = await response.json();
    setQRCode(data.qr_code);
    setSecret(data.secret);
    setBackupCodes(data.backup_codes);
    setStep('confirm');
  };

  const handleConfirm = async () => {
    const response = await fetch('/api/auth/2fa/confirm', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    if (response.ok) {
      setStep('done');
    }
  };

  if (step === 'init') {
    return (
      <div>
        <h3>Enable Two-Factor Authentication</h3>
        <p>Add an extra layer of security to your account.</p>
        <button onClick={handleEnable} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Enable 2FA
        </button>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="space-y-4">
        <h3>Scan QR Code</h3>
        <img src={qrCode} alt="QR Code" className="mx-auto" />
        <p className="text-sm text-gray-600">Or enter this secret manually:</p>
        <code className="block bg-gray-100 p-2 rounded">{secret}</code>

        <h4 className="font-semibold mt-4">Backup Codes (Save these!)</h4>
        <div className="grid grid-cols-2 gap-2">
          {backupCodes.map((code, i) => (
            <code key={i} className="bg-gray-100 p-2 rounded text-center">{code}</code>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium mb-2">Enter code from your app:</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="123456"
            className="w-full border border-gray-300 rounded-lg px-4 py-2"
            maxLength={6}
          />
          <button onClick={handleConfirm} className="w-full bg-blue-600 text-white py-2 rounded-lg mt-2">
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="text-green-600 text-5xl mb-4">✓</div>
      <h3 className="text-xl font-semibold">2FA Enabled!</h3>
      <p>Your account is now protected with two-factor authentication.</p>
    </div>
  );
}
```

---

## 📦 DEPENDENCIES

```json
{
  "dependencies": {
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.3",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/bcrypt": "^5.0.2",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/speakeasy": "^2.0.10",
    "@types/qrcode": "^1.5.5"
  }
}
```

---

## 🧪 TESTING

### Unit Tests
```typescript
// tests/services/user.test.ts

describe('UserService', () => {
  describe('2FA', () => {
    it('should enable 2FA and generate QR code', async () => {
      const { secret, qrCode, backupCodes } = await userService.enable2FA(userId);

      expect(secret).toBeDefined();
      expect(qrCode).toMatch(/^data:image\/png;base64/);
      expect(backupCodes).toHaveLength(10);
    });

    it('should verify TOTP code', async () => {
      await userService.enable2FA(userId);
      const code = speakeasy.totp({ secret, encoding: 'base32' });

      const confirmed = await userService.confirm2FA(userId, code);
      expect(confirmed).toBe(true);
    });

    it('should verify backup code once', async () => {
      await userService.enable2FA(userId);
      const backupCode = backupCodes[0];

      const valid1 = await userService.verifyBackupCode(userId, backupCode);
      expect(valid1).toBe(true);

      const valid2 = await userService.verifyBackupCode(userId, backupCode);
      expect(valid2).toBe(false);  // Already used
    });
  });
});
```

---

## ✅ ERFOLGSKRITERIEN

- [ ] User kann sich registrieren
- [ ] User kann sich einloggen
- [ ] JWT Token funktioniert
- [ ] User kann 2FA aktivieren
- [ ] QR Code wird korrekt generiert
- [ ] TOTP Codes werden akzeptiert
- [ ] Backup Codes funktionieren
- [ ] Backup Codes sind einmalig verwendbar
- [ ] User kann 2FA deaktivieren
- [ ] Sessions werden getrackt

---

**Geschätzte Zeit:** ~6h

**Dependencies:**
- bcrypt (Password Hashing)
- jsonwebtoken (JWT)
- speakeasy (TOTP)
- qrcode (QR Code Generation)

**Bereit zum Start?**

