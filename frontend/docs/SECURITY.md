# Frontend Security & Deployment Guidelines

This document outlines the security posture, identified vulnerabilities, and required infrastructure/backend improvements for the `Where_is_my_bus_Syed` frontend.

## 1. JWT Authentication Migration (Backend Dependency)

### Current Implementation
The frontend currently stores the `accessToken` and `refreshToken` in `localStorage`. While convenient, this exposes the application to **Cross-Site Scripting (XSS)** attacks, as any malicious JavaScript running on the domain can extract these tokens.

### Future Migration Path
To harden the application for production, the backend must be updated to issue tokens via **HttpOnly Secure Cookies**.

**Steps for Backend/Infrastructure team:**
1. The backend login endpoint should stop returning raw tokens in the JSON payload.
2. The backend must set `Set-Cookie: accessToken=...; HttpOnly; Secure; SameSite=Strict` in the response headers.
3. The frontend `apiClient.ts` should be configured with `withCredentials: true` to automatically include cookies in all cross-origin or same-origin requests.
4. Token management logic (e.g., `localStorage.getItem`) can then be entirely removed from the frontend `useAuthStore` and `apiClient`.

---

## 2. Content Security Policy (CSP) Configuration

### Overview
A robust Content Security Policy (CSP) is critical to preventing XSS, clickjacking, and data injection attacks. Since the frontend is a statically built SPA (Single Page Application), CSP should be enforced at the **deployment/hosting layer** (e.g., Nginx, Vercel, AWS CloudFront).

### Recommended CSP Header
The following header should be injected by the hosting provider for all HTML responses:

```http
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline'; 
  img-src 'self' data: https://maps.googleapis.com; 
  connect-src 'self' https://api.whereismybus.com wss://api.whereismybus.com; 
  font-src 'self' data:; 
  frame-ancestors 'none'; 
  form-action 'self';
```

*(Note: Replace `https://api.whereismybus.com` with the actual production backend API URL).*

### Deployment Examples

**Nginx Configuration:**
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.yoursite.com; font-src 'self' data:; frame-ancestors 'none';" always;
```

**Vercel (`vercel.json`):**
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.yoursite.com; font-src 'self' data:; frame-ancestors 'none';"
        }
      ]
    }
  ]
}
```
