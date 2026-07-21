# Backend Security Review Details

### BE-01 - Debug mode enabled by default
**Risk:** Low | **File:** config.py
> Flask app might accidentally run in debug mode.

### BE-02 - Fallback SECRET_KEY
**Risk:** Low | **File:** config.py
> Default secret key used if env var is missing.

### BE-03 - Unauthenticated reset saves
**Risk:** Low | **File:** progress_routes.py
> Reset endpoint allows saving progress without JWT.

### BE-04 - Missing rate limiting
**Risk:** Low | **File:** auth_routes.py
> Auth endpoints are not rate limited.

### BE-05 - Default Werkzeug hashing
**Risk:** Low | **File:** auth_routes.py
> Default pbkdf2 settings are used instead of bcrypt.

### BE-06 - Wildcard CORS
**Risk:** Low | **File:** app.py
> CORS policy is overly permissive.

### BE-07 - No security headers
**Risk:** Low | **File:** app.py
> Missing strict-transport-security and other headers.

### BE-08 - Verbose error handling
**Risk:** Low | **File:** app.py
> 500 errors leak stack traces.

### BE-09 - Outdated dependency
**Risk:** Low | **File:** requirements.txt
> Flask version in requirements.txt is slightly outdated.

### BE-10 - No input length constraints
**Risk:** Low | **File:** user_routes.py
> Username length not constrained before DB insert.

### BE-11 - Exposed health check
**Risk:** Low | **File:** dashboard_routes.py
> Health endpoint leaks server info.

### BE-12 - Missing JWT expiration check
**Risk:** Low | **File:** user_routes.py
> JWT expiration handled poorly on some routes.

### BE-13 - Insecure cookie flags
**Risk:** Low | **File:** auth_routes.py
> Session cookies missing HttpOnly flag.

### BE-14 - No DB query timeout
**Risk:** Low | **File:** dashboard_routes.py
> Queries might hang indefinitely.

