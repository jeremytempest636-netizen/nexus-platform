# NEXUS — Intelligent Infrastructure & Application Platform

> AI-Powered Platform for Application Deployment, Infrastructure Monitoring, Incident Response, and Intelligent Operations.

NEXUS is a full-stack DevOps and infrastructure operations platform designed to centralize application deployment, container management, infrastructure monitoring, Kubernetes operations, security scanning, incident management, audit logging, and AI-assisted root-cause analysis.

## Overview

NEXUS combines modern application development with DevOps, SRE, cloud-native infrastructure, security, and AI operations into a single platform.

### Core Capabilities

- Application and project management
- Docker container monitoring and image inspection
- Application deployment engine
- Infrastructure monitoring (CPU, memory, disk, network telemetry)
- Container metrics, statistics, and centralized logs
- Incident management with AI-powered analysis
- AI DevOps Copilot
- Kubernetes cluster monitoring, deployment scaling, and pod restart operations
- Security Center (container, image, dependency, network exposure, and secrets checks)
- RBAC and audit logging
- GitHub Actions CI
- PostgreSQL persistence
- Redis-ready architecture

---

## Architecture

```text
                         ┌──────────────────────────┐
                         │        NEXUS UI          │
                         │ Next.js + TypeScript     │
                         │ Tailwind + Recharts      │
                         └────────────┬─────────────┘
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │       API Layer          │
                         │ Next.js Route Handlers   │
                         └────────────┬─────────────┘
                                      │
             ┌────────────────────────┼────────────────────────┐
             │                        │                        │
             ▼                        ▼                        ▼
    ┌────────────────┐       ┌────────────────┐       ┌────────────────┐
    │   PostgreSQL   │       │ Docker Engine  │       │  Kubernetes    │
    │   Prisma ORM   │       │   Dockerode    │       │  Client Node   │
    └────────────────┘       └────────────────┘       └────────────────┘
             │                        │                        │
             ▼                        ▼                        ▼
       Projects/Users          Containers/Images        Pods/Deployments
       Deployments             Logs/Metrics             Services/Nodes
       Incidents               Runtime Security         Scaling/Restart
       Audit Logs
                                      │
                                      ▼
                         ┌──────────────────────────┐
                         │      AI DevOps Layer     │
                         │ OpenRouter / LLM         │
                         │ RCA / Telemetry Analysis │
                         └──────────────────────────┘
```

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS, Recharts |
| **Backend** | Next.js Route Handlers, Node.js, TypeScript, Prisma ORM, PostgreSQL, Redis-ready architecture |
| **DevOps** | Docker, Docker Compose, Dockerode, Kubernetes, kubectl, kind, Linux, Nginx, GitHub Actions |
| **AI** | OpenRouter, LLM API, structured AI responses, AI DevOps Copilot, root-cause analysis, infrastructure telemetry analysis |
| **Security** | JWT authentication, Role-Based Access Control, audit logging, Docker & image security inspection, npm dependency audit, network exposure detection, environment/secrets detection |

---

## Platform Modules

### Dashboard

Provides an operational overview of the NEXUS environment, displaying infrastructure and application information from the platform's APIs.

### Applications

Application and project management interface.

- Create projects
- Project status
- Search
- Active/archived filtering
- Project-to-deployment navigation

### Deployments

Application deployment management. The deployment engine can:

- Create deployment records
- Prepare application source
- Build Docker images
- Start containers
- Perform health checks
- Record deployment status
- Expose deployment telemetry

Deployment lifecycle:

```text
PENDING → BUILDING → DEPLOYING → SUCCESS
```

Failed deployments are recorded as `FAILED`.

### Infrastructure

Provides infrastructure telemetry including CPU utilization, memory utilization, disk usage, network statistics, and host information.

### Containers

Docker runtime management.

- Container listing
- Running/stopped status
- Image information
- CPU, memory, and network metrics
- Restart count
- Container logs
- Container actions

### Kubernetes

Kubernetes operational interface. Current capabilities:

- Cluster context
- Node, namespace, deployment, pod, and service monitoring
- Deployment scaling
- Pod restart

The test environment uses a local **kind** cluster.

### Logs

Centralized Docker container log viewer.

- Container selection
- Log retrieval
- Search
- Severity filtering (`INFO`, `WARN`, `ERROR`, `DEBUG`)
- Automatic refresh

### Incidents

Incident management and investigation.

```text
OPEN → INVESTIGATING → RESOLVED → CLOSED
```

Incident analysis can combine container state, Docker statistics, container logs, deployment information, infrastructure telemetry, and AI analysis.

### AI DevOps Copilot

NEXUS AI provides operational assistance based on actual platform telemetry.

Example questions:

- What is the current deployment status?
- Is the application container healthy?
- Why might this container be consuming resources?
- Are there active incidents?
- What should I investigate first?

The AI receives platform context and is instructed not to invent infrastructure information.

### Security Center

| Area | Checks |
|------|--------|
| **Runtime Security** | Privileged mode, host networking, host PID namespace, writable root filesystem, published ports |
| **Image Security** | Image user configuration, exposed ports, healthcheck availability, image metadata |
| **Dependency Security** | Vulnerable dependencies via `npm audit` |
| **Network Exposure** | Publicly bound ports, host networking, sensitive exposed ports |
| **Secrets & Environment** | Scans environment variable *names* for sensitive patterns (e.g. `PASSWORD`, `SECRET`, `TOKEN`, `API_KEY`, `PRIVATE_KEY`, `DATABASE_URL`, `CONNECTION_STRING`) without exposing values |

---

## Authentication & Authorization

NEXUS uses JWT-based authentication with role-based authorization enforced at the API level.

| Role | Purpose |
|------|---------|
| `OWNER` | Full platform ownership |
| `ADMIN` | Platform administration |
| `DEVOPS` | Infrastructure and deployment operations |
| `DEVELOPER` | Application development operations |
| `VIEWER` | Read-only access |

## Audit & Compliance

NEXUS records operational events through audit logs, including project creation, deployment operations, incident operations, AI Copilot queries, and security-related actions.

Each audit entry includes: **Action**, **User**, **Project**, **Timestamp**, and **Metadata**. This provides an operational history for troubleshooting and accountability.

## Database

NEXUS uses PostgreSQL through Prisma ORM.

Main entities: `User`, `Project`, `ProjectMember`, `Deployment`, `Incident`, `ContainerMetric`, `AiCopilotSession`, `AuditLog`.

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev
```

---

## Local Development

### Requirements

- Windows 10/11 or Linux
- Node.js 24+
- npm
- Docker Desktop
- kubectl
- kind
- PostgreSQL (via Docker)

### Install

```bash
git clone https://github.com/jeremytempest636-netizen/nexus-platform.git
cd nexus-platform
npm install
```

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="postgresql://nexus:nexus_dev_password@localhost:5433/nexus?schema=public"
JWT_SECRET="change-this-secret"
OPENROUTER_API_KEY="your-openrouter-api-key"
OPENROUTER_MODEL="openrouter/free"
```

> **Never commit `.env` or API keys to source control.**

### Start PostgreSQL

```bash
docker compose -f docker-compose.db.yml up -d
docker ps
```

### Generate Prisma Client

```bash
npx prisma generate
```

### Start Development Server

```bash
npm run dev -- --webpack
```

Open <http://localhost:3000>.

---

## Kubernetes Development Environment

```bash
# Create the local cluster
kind create cluster --name nexus-local

# Verify
kubectl get nodes

# Select context
kubectl config use-context kind-nexus-local

# Inspect workloads
kubectl get deployments -A
kubectl get pods -A
kubectl get services -A
```

---

## CI/CD

NEXUS includes GitHub Actions CI (`.github/workflows/ci.yml`).

```text
Push / Pull Request
        │
        ▼
Checkout → Install Dependencies → Prisma Generate → ESLint → Next.js Production Build
```

The CI pipeline validates the application before changes are merged.

## Quality Checks

```bash
npm run lint                # Lint
npm run build               # Production build
npm run dev -- --webpack    # Development server
```

---

## Security Notes

Before production deployment:

- Replace development JWT secrets
- Use production PostgreSQL credentials
- Store secrets in a secure secret manager
- Restrict Docker socket access
- Restrict Kubernetes credentials
- Review exposed ports
- Review `npm audit` findings
- Enable HTTPS and configure secure cookies
- Apply production RBAC policies
- Configure proper network segmentation
- Avoid exposing internal infrastructure APIs directly to the internet

The current repository is primarily a portfolio/development platform and should undergo additional hardening before production use.

---

## Project Structure

```text
nexus-platform/
│
├── src/
│   ├── app/
│   │   ├── api/
│   │   ├── applications/
│   │   ├── audit-logs/
│   │   ├── ai-copilot/
│   │   ├── containers/
│   │   ├── deployments/
│   │   ├── incidents/
│   │   ├── infrastructure/
│   │   ├── kubernetes/
│   │   ├── logs/
│   │   ├── security/
│   │   ├── settings/
│   │   └── page.tsx
│   │
│   ├── components/
│   └── lib/
│       ├── auth/
│       ├── docker/
│       ├── kubernetes/
│       └── prisma.ts
│
├── prisma/
│   └── schema.prisma
│
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── docker-compose.db.yml
├── next.config.ts
├── package.json
└── README.md
```

---

## Engineering Highlights

This project demonstrates practical experience across:

- Full-stack TypeScript development and Next.js application architecture
- REST API development
- PostgreSQL database design and Prisma ORM
- Authentication and RBAC
- Docker and Kubernetes API integration
- Container and infrastructure monitoring
- Deployment automation and CI/CD
- Security monitoring
- Incident management
- AI integration and LLM-based operational analysis
- Audit logging
- DevOps/SRE workflows

## Portfolio Positioning

NEXUS is designed as a practical demonstration of a modern DevOps/SRE platform rather than a simple CRUD application. It combines Software Engineering, DevOps, Cloud Native, Infrastructure, Security, and AI Operations.

This makes NEXUS suitable as a portfolio project for roles such as:

- Software Engineer
- Backend Developer
- DevOps Engineer / Junior DevOps Engineer
- Cloud Engineer
- Site Reliability Engineer
- Infrastructure Engineer
- Platform Engineer
- AI/Automation Engineer

## Author

**Enrogel Jeremi Sibarani**
D-III Computer Technology, Institut Teknologi Del

- GitHub: <https://github.com/jeremytempest636-netizen>
- Repository: <https://github.com/jeremytempest636-netizen/nexus-platform>

## License

This project is currently intended as a personal portfolio and engineering demonstration project.