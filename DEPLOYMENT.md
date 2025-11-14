# Deployment Guide

This document explains how to deploy The Story Nexus using the CI/CD pipeline with Docker Hub.

## Architecture Overview

**Development**: Local build and run with `docker-compose.yml`
**Production CI/CD**: GitHub Actions builds and pushes to Docker Hub
**Deployment**: Third-party servers pull pre-built images from Docker Hub

## Setup CI/CD Pipeline

### 1. Docker Hub Setup

Create a Docker Hub account at https://hub.docker.com if you don't have one.

Create an access token:
1. Go to Account Settings → Security → Access Tokens
2. Click "New Access Token"
3. Name it (e.g., "github-actions-storynexus")
4. Copy the token (you won't see it again)

### 2. GitHub Repository Secrets

Add the following secrets to your GitHub repository:

1. Go to repository Settings → Secrets and variables → Actions
2. Add two new repository secrets:
   - `DOCKERHUB_USERNAME`: Your Docker Hub username
   - `DOCKERHUB_TOKEN`: The access token you created

### 3. Trigger a Build

The CI/CD pipeline automatically triggers on:
- Push to `main` branch
- Creating version tags (e.g., `v1.0.0`)
- Manual workflow dispatch

To create a tagged release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

This creates multiple image tags:
- `latest` (main branch builds)
- `v1.0.0` (semantic version)
- `1.0` (major.minor)
- `1` (major version)
- `main-<git-sha>` (branch + commit SHA)

## Deployment on Third-Party Server

### Prerequisites

- Docker and Docker Compose installed
- Network access to Docker Hub

### Deployment Steps

1. **Copy deployment files to server**:
```bash
scp docker-compose.deploy.yml .env.deploy.example user@server:/opt/storynexus/
```

2. **SSH into server**:
```bash
ssh user@server
cd /opt/storynexus
```

3. **Configure environment**:
```bash
cp .env.deploy.example .env
nano .env
```

Edit `.env`:
```bash
DOCKERHUB_USERNAME=your-dockerhub-username
PORT=3000
```

4. **Create data directory**:
```bash
mkdir -p data
```

5. **Pull and run**:
```bash
docker compose -f docker-compose.deploy.yml pull
docker compose -f docker-compose.deploy.yml up -d
```

6. **Verify deployment**:
```bash
docker compose -f docker-compose.deploy.yml ps
docker compose -f docker-compose.deploy.yml logs -f
```

Access the application at `http://server-ip:3000`

### Update to New Version

```bash
docker compose -f docker-compose.deploy.yml pull
docker compose -f docker-compose.deploy.yml up -d
```

The `up -d` command automatically recreates containers with the new image.

### Use Specific Version

Edit `docker-compose.deploy.yml` to pin a specific version:
```yaml
image: ${DOCKERHUB_USERNAME}/storynexus:v1.0.0
```

Then pull and restart:
```bash
docker compose -f docker-compose.deploy.yml up -d
```

## Local Development vs Production

### Local Development
Uses `docker-compose.yml` which builds from source:
```bash
docker compose up --build
```

### Production Deployment
Uses `docker-compose.deploy.yml` which pulls pre-built images:
```bash
docker compose -f docker-compose.deploy.yml up -d
```

## Troubleshooting

### Image Pull Failed
- Verify Docker Hub username in `.env`
- Check image exists: `docker search your-username/storynexus`
- Ensure server has internet access

### Container Won't Start
```bash
docker compose -f docker-compose.deploy.yml logs
```

### Permission Issues
```bash
sudo chown -R 1000:1000 data/
```

### Reset Database
```bash
docker compose -f docker-compose.deploy.yml down -v
rm -rf data/*
docker compose -f docker-compose.deploy.yml up -d
```

## Multi-Architecture Support

Images are built for:
- `linux/amd64` (Intel/AMD)
- `linux/arm64` (Apple Silicon, ARM servers)

Docker automatically pulls the correct architecture.

## Security Considerations

- Never commit `.env` files
- Use Docker secrets for sensitive data in production
- Keep Docker and Docker Compose updated
- Run containers as non-root user (consider adding USER directive)
- Use specific version tags in production, not `latest`

## Monitoring

Check container health:
```bash
docker compose -f docker-compose.deploy.yml ps
```

View logs:
```bash
docker compose -f docker-compose.deploy.yml logs -f storynexus
```

Check resource usage:
```bash
docker stats storynexus-app
```

## Backup

Backup the data directory regularly:
```bash
tar -czf storynexus-backup-$(date +%Y%m%d).tar.gz data/
```

## Rollback

To rollback to a previous version:
```bash
docker compose -f docker-compose.deploy.yml down
# Edit docker-compose.deploy.yml to use previous version tag
docker compose -f docker-compose.deploy.yml up -d
```
