# Browser HTTPS Troubleshooting

## ✅ System Status: WORKING
- ✅ mkcert CA is properly installed
- ✅ Certificate is valid and trusted by macOS
- ✅ HTTPS server is serving the correct certificate
- ✅ Certificate chain verification: OK

## 🚨 Issue: Browser Still Shows "Not Secure"

This is a **browser cache/trust issue**, not a certificate problem.

## 🔧 SOLUTIONS (Try in order):

### 1. Clear Browser Cache & Hard Refresh
**Chrome/Edge:**
```
1. Press Cmd+Shift+R (hard refresh)
2. Or: Developer Tools (F12) → Right-click refresh → "Empty Cache and Hard Reload"
3. Or: Settings → Privacy → Clear browsing data → "Cached images and files"
```

**Firefox:**
```
1. Press Cmd+Shift+R (hard refresh)
2. Or: History → Clear Recent History → "Cache"
```

**Safari:**
```
1. Press Cmd+Option+R (hard refresh)
2. Or: Develop → Empty Caches
```

### 2. Restart Browser Completely
- Close ALL browser windows
- Quit browser application completely
- Reopen and visit https://localhost:8443

### 3. Check Browser Certificate Store

**Chrome/Edge:**
```
1. Settings → Privacy and Security → Security → Manage Certificates
2. Look for "mkcert" certificates in "Authorities" tab
3. If missing, import: ssl-certs/localhost+2.pem
```

**Firefox:**
```
1. Settings → Privacy & Security → Certificates → View Certificates
2. Authorities tab → Look for "mkcert development CA"
3. If missing, import the CA certificate
```

### 4. Disable Browser Extensions
- Temporarily disable ad blockers, security extensions
- Some extensions block local certificates

### 5. Try Different Browser
- Test in Chrome, Firefox, Safari, Edge
- If one works, it's a browser-specific issue

### 6. Force Certificate Reimport
```bash
# Remove and reinstall mkcert CA
mkcert -uninstall
mkcert -install

# Restart HTTPS proxy
docker compose -f docker-compose-https.yml restart
```

### 7. Check URL Exactly
Make sure you're visiting:
- ✅ `https://localhost:8443` (correct)
- ❌ `http://localhost:8443` (wrong protocol)
- ❌ `https://127.0.0.1:8443` (different hostname)

## 🎯 What You Should See:
- 🔒 Green lock icon (no warning triangle)
- "Secure" or padlock in address bar
- No "Not Secure" warning
- Certificate details show "mkcert development certificate"

## 🆘 If Still Not Working:
1. **Try Incognito/Private Mode** - bypasses cache and extensions
2. **Check which browser** you're using and version
3. **Try a different port** - some browsers cache certificate failures

## 📞 Quick Test:
Run this and tell me the output:
```bash
# Test certificate from command line
echo | openssl s_client -connect localhost:8443 2>/dev/null | openssl x509 -noout -subject
```

Expected: `subject=O=mkcert development certificate...`