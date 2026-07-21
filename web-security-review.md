# Web Security Review Details

### WEB-01 - PII stored in localStorage
**Risk:** Low | **File:** AuthContext.js
> User preferences might contain sensitive info.

### WEB-02 - No session TTL explicitly set
**Risk:** Low | **File:** AuthContext.js
> Tokens rely on server expiry without client fallback.

### WEB-03 - Missing CSP meta tag
**Risk:** Low | **File:** App.jsx
> Content Security Policy is not strictly enforced in HTML.

### WEB-04 - Missing X-Frame-Options
**Risk:** Low | **File:** index.html
> App could be framed by malicious domains.

### WEB-05 - Hardcoded base URL
**Risk:** Low | **File:** vite.config.js
> Base URL in Vite config could leak internal paths.

### WEB-06 - Console logs in production
**Risk:** Low | **File:** Login.jsx
> Some console.log statements remain in Login component.

### WEB-07 - Verbose error messages
**Risk:** Low | **File:** App.jsx
> Error boundaries could expose stack traces.

### WEB-08 - Overly permissive CORS headers
**Risk:** Low | **File:** Signup.jsx
> Client expects relaxed CORS from backend.

### WEB-09 - Lack of integrity hashes on external scripts
**Risk:** Low | **File:** index.html
> External CDNs used without SRI.

### WEB-10 - Inline styles used
**Risk:** Low | **File:** index.css
> CSP might block inline styles used for dynamic UI.

### WEB-11 - Unused dependencies
**Risk:** Low | **File:** package.json
> package.json contains unused dev dependencies.

### WEB-12 - Outdated dependency
**Risk:** Low | **File:** package.json
> A minor version update is available for React router.

### WEB-13 - No input length constraints
**Risk:** Low | **File:** Signup.jsx
> Frontend relies entirely on backend for validation.

### WEB-14 - Missing explicit rel="noopener"
**Risk:** Low | **File:** App.jsx
> External links could pose tabnabbing risks.

