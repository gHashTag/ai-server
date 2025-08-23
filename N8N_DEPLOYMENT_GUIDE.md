# N8N Production Deployment Guide

## 🎯 Overview

This guide explains how to properly deploy N8N workflow automation alongside the AI Server on Railway using best practices.

## 📋 Architecture

```
┌─────────────────────────────────────┐    ┌─────────────────────────────────────┐
│           AI Server                 │    │            N8N Service              │
│  (Railway Service #1)               │    │   (Railway Service #2)              │
├─────────────────────────────────────┤    ├─────────────────────────────────────┤
│                                     │    │                                     │
│  ┌─────────────────────────────┐    │    │  ┌─────────────────────────────┐    │
│  │      Express.js Server      │    │    │  │        N8N Server           │    │
│  │                             │    │    │  │                             │    │
│  │  ┌─────────────────────┐    │    │    │  │  Port: 5678                 │    │
│  │  │   N8N Proxy         │────┼────┼────┼──┼► PostgreSQL Database       │    │
│  │  │   /n8n/* → N8N      │    │    │    │  │  Workflows & Credentials    │    │
│  │  └─────────────────────┘    │    │    │  └─────────────────────────────┘    │
│  └─────────────────────────────┘    │    │                                     │
│                                     │    │  https://n8n-production.railway.app│
│  https://ai-server-production       │    └─────────────────────────────────────┘
│  .railway.app/n8n                  │                       ▲
└─────────────────────────────────────┘                       │
                                                              │
┌─────────────────────────────────────┐                       │
│        PostgreSQL Service           │                       │
│   (Railway Service #3)              │ ◄─────────────────────┘
├─────────────────────────────────────┤
│                                     │
│  Database: n8n_production          │
│  User: n8n_user                    │
│  Persistent storage for:            │
│  - Workflows                        │
│  - Credentials                      │
│  - Execution history                │
│  - Settings                         │
└─────────────────────────────────────┘
```

## 🚀 Step 1: Deploy N8N Service on Railway

### Using Railway's Official N8N Template

1. **Go to Railway Dashboard**
   - Visit: https://railway.com/deploy/n8n
   - Click "Deploy Now"

2. **Configure Environment Variables**

```env
# Database Configuration (Railway will auto-provision PostgreSQL)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=${{Postgres.PGHOST}}
DB_POSTGRESDB_PORT=${{Postgres.PGPORT}}
DB_POSTGRESDB_USER=${{Postgres.PGUSER}}
DB_POSTGRESDB_DATABASE=${{Postgres.PGDATABASE}}
DB_POSTGRESDB_PASSWORD=${{Postgres.PGPASSWORD}}

# N8N Configuration
N8N_PORT=5678
N8N_HOST=${{RAILWAY_PUBLIC_DOMAIN}}
N8N_PROTOCOL=https
WEBHOOK_URL=https://${{RAILWAY_PUBLIC_DOMAIN}}

# Security Settings
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password

# Encryption (CRITICAL - generate and save this key!)
N8N_ENCRYPTION_KEY=your-stable-32-char-encryption-key

# Additional Settings
N8N_USER_MANAGEMENT_DISABLED=true
N8N_PERSONALIZATION_ENABLED=false
N8N_SECURE_COOKIE=true
N8N_METRICS=true
N8N_LOG_LEVEL=info
GENERIC_TIMEZONE=Europe/Moscow
TZ=Europe/Moscow
```

3. **Important Notes**
   - **Save your N8N_ENCRYPTION_KEY**: Without it, you'll lose access to stored credentials
   - **Use strong N8N_BASIC_AUTH_PASSWORD**: This protects your workflows
   - **PostgreSQL will be auto-provisioned** by Railway's template

## 🔧 Step 2: Update AI Server Configuration

The AI Server is already configured to proxy N8N requests. Update the environment variables:

### Production Environment Variables

Add to your AI Server's Railway service:

```env
# N8N Service URL (update with your actual N8N service URL)
N8N_SERVICE_URL=https://your-n8n-service.up.railway.app
```

### How the Proxy Works

1. User visits: `https://ai-server-production.railway.app/n8n`
2. AI Server receives request at `/n8n`
3. Proxy forwards to: `https://your-n8n-service.railway.app/`
4. Response is returned to user through AI Server

## 🔗 Step 3: Connect Services

### 1. Get Your N8N Service URL

After deploying N8N service:
1. Go to Railway Dashboard
2. Select your N8N service
3. Go to "Settings" → "Domains"
4. Copy the Railway-provided domain (e.g., `n8n-production-abc123.up.railway.app`)

### 2. Update AI Server Environment

In AI Server Railway service settings:

```env
N8N_SERVICE_URL=https://n8n-production-abc123.up.railway.app
```

### 3. Configure N8N Webhooks

In N8N settings, set webhook URL to:
```
https://ai-server-production.railway.app/n8n/webhook
```

## 🛡️ Step 4: Security Configuration

### N8N Security Settings

```env
# Enable authentication
N8N_BASIC_AUTH_ACTIVE=true
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=YourSecurePassword123!

# Secure cookies for HTTPS
N8N_SECURE_COOKIE=true
N8N_COOKIES_SECURE=true

# Disable user management for single-user setup
N8N_USER_MANAGEMENT_DISABLED=true

# Restrict external access if needed
N8N_PERSONALIZATION_ENABLED=false
```

### Database Security

- Railway's PostgreSQL is automatically secured
- Use strong database passwords
- Enable SSL connections
- Regular backups are handled by Railway

## 📊 Step 5: Monitoring & Logging

### N8N Metrics

```env
N8N_METRICS=true
N8N_LOG_LEVEL=info
```

### Health Checks

N8N health check endpoint: `https://your-n8n-service.railway.app/health`
AI Server health check: `https://ai-server-production.railway.app/health`

## 🧪 Step 6: Testing the Deployment

### 1. Test N8N Direct Access

```bash
curl https://your-n8n-service.railway.app/health
```

### 2. Test AI Server Proxy

```bash
curl https://ai-server-production.railway.app/n8n
```

### 3. Test in Browser

1. Visit: `https://ai-server-production.railway.app/n8n`
2. Should redirect to N8N login page
3. Login with your configured credentials
4. Create a test workflow

## 🚨 Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check N8N service is running
   - Verify N8N_SERVICE_URL is correct
   - Check Railway service logs

2. **Authentication Issues**
   - Verify N8N_BASIC_AUTH_* variables
   - Check cookie settings for HTTPS

3. **Database Connection Issues**
   - Verify PostgreSQL service is running
   - Check database environment variables
   - Review N8N service logs

### Debugging Commands

```bash
# Check AI Server logs
railway logs --service ai-server

# Check N8N service logs  
railway logs --service n8n

# Check PostgreSQL logs
railway logs --service postgres
```

## 🔄 Step 7: Deployment & Updates

### AI Server Deployment

The AI Server will automatically deploy when you push changes to the production branch.

### N8N Updates

N8N service updates automatically with the official Docker image updates.

### Database Migrations

Railway handles PostgreSQL migrations automatically.

## 📝 Final Checklist

- [ ] N8N service deployed on Railway
- [ ] PostgreSQL database provisioned
- [ ] Environment variables configured
- [ ] AI Server N8N_SERVICE_URL updated
- [ ] Security settings enabled
- [ ] Test access via proxy
- [ ] Webhooks configured
- [ ] Backups verified

## 🎉 Success!

Your N8N workflow automation is now accessible at:
**https://ai-server-production.railway.app/n8n**

This setup provides:
- ✅ Professional multi-service architecture
- ✅ Proper separation of concerns  
- ✅ Scalable PostgreSQL database
- ✅ Secure authentication
- ✅ SSL/TLS encryption
- ✅ Automatic backups
- ✅ Easy maintenance and updates

## 🔗 Useful Links

- [N8N Official Documentation](https://docs.n8n.io)
- [Railway Documentation](https://docs.railway.app)  
- [N8N Docker Hub](https://hub.docker.com/r/n8nio/n8n)
- [Railway N8N Template](https://railway.com/deploy/n8n)