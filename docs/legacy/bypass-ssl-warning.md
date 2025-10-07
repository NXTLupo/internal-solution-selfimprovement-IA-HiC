# How to Bypass SSL Certificate Warning

## The Warning You're Seeing
```
Your connection is not private
Attackers might be trying to steal your information from localhost
net::ERR_CERT_AUTHORITY_INVALID
```

This is **NORMAL** for self-signed certificates. Here's how to bypass it:

## Chrome/Edge Steps:
1. **Click "Advanced"** (at the bottom of the warning page)
2. **Click "Proceed to localhost (unsafe)"** 
3. ✅ You'll now see the green lock icon!

## Firefox Steps:
1. **Click "Advanced"**
2. **Click "Accept the Risk and Continue"**
3. ✅ Green lock appears!

## Safari Steps:
1. **Click "Show Details"**
2. **Click "Visit this website"**
3. **Click "Visit Website"** again to confirm
4. ✅ Secure connection established!

## Why This Happens:
- Self-signed certificates aren't verified by a Certificate Authority
- Browsers show this warning for security
- **For localhost development, this is completely safe to bypass**
- Once bypassed, you get the professional green lock icon

## Alternative: Install Certificate (Optional)
For a permanent fix without warnings:

### macOS:
```bash
# Quick install command:
sudo security add-trusted-cert -d -r trustRoot -k /System/Library/Keychains/SystemRootCertificates.keychain ssl-certs/localhost.crt
```

### Manual macOS:
1. Double-click `ssl-certs/localhost.crt`
2. Click "Add" to Keychain
3. Open Keychain Access app
4. Find "localhost" certificate
5. Right-click → Get Info → Trust → Always Trust

After doing this once per browser, you'll get instant green locks with no warnings!