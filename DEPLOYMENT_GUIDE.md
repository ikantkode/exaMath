# exaMath Production Deployment Guide

## Dokploy Setup

1. In Dokploy, create a new **Docker Compose** project
2. Point the **Git Repository** to: `https://github.com/ikantkode/exaMath-prod`
3. Set **Compose File Path** to: `docker-compose.prod.yml`
4. Under **Environment Variables**, add:

```
DB_USER=construction
DB_PASSWORD=<your-secure-password>
DB_NAME=construction_db
JWT_SECRET=<generate-a-secure-random-string>
```

5. Save and deploy

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DB_USER` | PostgreSQL username | Yes |
| `DB_PASSWORD` | PostgreSQL password | Yes |
| `DB_NAME` | PostgreSQL database name | Yes |
| `JWT_SECRET` | Secret for signing JWT tokens | Yes |

## Port Mapping

Dokploy handles routing automatically. No port exposure needed in the compose file.

## Health Checks

- **Database**: `pg_isready` runs every 10s
- **Backend**: HTTP check on `/api/auth/setup-status` every 15s
- **Frontend**: Depends on backend health

## First Deployment

After deployment:
1. Visit your app URL
2. Complete the setup wizard (creates first OWNER user)
3. Login with the created credentials
4. Start importing schedules

## Backup PostgreSQL Data

```bash
docker exec examath-db-1 pg_dump -U construction construction_db > backup.sql
```

## Logs

```bash
docker logs examath-backend-1
docker logs examath-frontend-1
docker logs examath-db-1
```
