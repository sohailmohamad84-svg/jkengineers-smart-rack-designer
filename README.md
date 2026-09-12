# JK Engineers Works — Smart Shop Rack Designer Platform

> **Commercial Retail Fixture Planning, 2D Floor Plan Engine, Dynamic Material Costing & CRM System**  
> Tailored for **JK Engineers Works**, Mumbai, Maharashtra, India.  
> Target Production Domain: `jkengineersworks.in`

---

## 1. Executive Summary & Product Vision

The **JK Engineers Works Smart Shop Rack Designer Platform** is a full-stack, production-ready retail store layout planner, structural fixture configurator, and customer lead management platform.

### Core Value Proposition
> *"Enter your shop dimensions. Choose your business. Set your budget. Get a customized rack layout with transparent material calculation and factory estimate."*

### Key Highlights
- **Deterministic Spatial Layout Engine**: Automatically segments perimeter walls, calculates door clearance safety buffers (300mm), avoids windows, prunes rack collisions around structural columns/pillars (AABB intersection math), and plans central double-sided Gondola rows with configurable walking aisles.
- **Strict Non-Degradation Principle (Rule 5 & 22)**: Customer budget optimizations adjust fixture counts, shelf tiers, and modular run lengths—**never** the grade or gauge of Tata/JSW prime steel or 7-tank epoxy polyester powder coating.
- **Dynamic Raw Material Price Versioning (Rule 20)**: Administrator updates to raw material rates (MS sheet, angle, pipe, powder coating, brackets, labor) create immutable historical pricing records in the database. Older customer quotations retain their original price snapshots.
- **Verified Site Measurement Workflow (Rule 36)**: Distinguishes between customer-entered dimensions and technician laser-verified measurements, enabling one-click design regeneration.
- **Clean Architecture & SOLID Compliance**: Clean separation of Domain Models, Domain Services, Use Cases, Ports, and Infrastructure Adapters with zero framework coupling in the domain layer.

---

## 2. System Architecture & SOLID Principles

The system is structured according to **Clean Architecture** and **Domain-Driven Design (DDD)**:

```
src/
├── domain/                      # PURE DOMAIN (Zero external dependencies)
│   ├── entities/                # Shop, Rack, Material, Design, Estimate, Customer
│   ├── value-objects/           # Dimensions, Canonical mm, BoundingBox2D
│   ├── services/
│   │   ├── MeasurementService.ts        # Unit conversion & geometry validation
│   │   ├── RackDesignEngine.ts          # Deterministic 2D layout generator
│   │   ├── PricingEngine.ts             # Itemized BOM & 18% GST calculator
│   │   └── BudgetOptimizationService.ts # Scaled configurations preserving quality
│   └── ports/                   # Interfaces (IRackRepository, IMaterialRepository, IOTPService, IAuditService)
├── application/                 # USE CASES
│   ├── auth/                    # SendCustomerOtpUseCase, VerifyCustomerOtpUseCase, AdminLoginUseCase
│   ├── designer/                # GenerateShopDesignUseCase
│   ├── pricing/                 # UpdateMaterialPriceUseCase
│   ├── projects/                # VerifySiteMeasurementUseCase
│   └── quotation/               # GenerateQuotationUseCase
├── infrastructure/              # ADAPTERS & IMPLEMENTATIONS
│   ├── db/                      # PrismaClient singleton
│   ├── auth/                    # Bcrypt PasswordService & JWT TokenService
│   ├── otp/                     # MockOTPService & OTPServiceFactory (Pluggable for MSG91/Twilio)
│   ├── repositories/            # PrismaRackRepository, PrismaMaterialRepository, PrismaAuditService
│   └── di/container.ts          # Composition Root (Dependency Inversion Container)
├── presentation/                # PRESENTATION & UI
│   ├── components/
│   │   ├── canvas/              # Interactive 2D SVG Floor Plan Canvas
│   │   ├── navigation/          # Navbar & Footer with statutory disclaimers
│   │   └── admin/               # AdminLayout, MetricCards, CustomerTable
├── app/                         # NEXT.JS APP ROUTER
│   ├── page.tsx                 # Public Landing Page & Product Showcase
│   ├── designer/page.tsx        # 7-Step Interactive Shop Rack Wizard
│   ├── customer/dashboard/      # Customer Project Dashboard
│   ├── customer/projects/[id]/  # Customer Project Details & 2D Layout
│   ├── admin/login/             # Admin Authentication
│   ├── admin/dashboard/         # Executive Dashboard & CRM Funnel
│   ├── admin/customers/         # Customer Directory & Call History
│   ├── admin/customers/[id]/    # Customer CRM, Notes & Site Verification
│   ├── admin/materials/         # Raw Material Management & Price History
│   ├── admin/racks/             # Rack Catalogue Specifications
│   ├── admin/audit-logs/        # System Audit Trails
│   └── api/                     # RESTful API Endpoints (Auth, Projects, Admin)
└── tests/                       # TEST SUITES
    ├── unit/                    # Domain unit tests (Geometry, Layout, Pricing, Quality)
    └── integration/             # End-to-end integration tests (OTP, Design, Price Versioning)
```

---

## 3. Database Schema (Prisma Relational Model)

The database schema is fully normalized across 24 relational models in `prisma/schema.prisma`:
- **Users & Authentication**: `users`, `customers`, `admins`, `otp_verifications`
- **Store Configuration**: `store_types`, `store_requirements`
- **Shop Geometry**: `projects`, `shops`, `shop_dimensions`, `shop_openings`, `shop_obstacles`
- **Rack Catalogue**: `rack_types` (Wall Racks, Gondolas, End Racks, Cash Counters, Medical Racks)
- **Raw Materials & Price History**: `materials`, `material_prices`, `material_price_history`
- **Designs & Spatial Layouts**: `designs`, `design_versions`, `design_racks`
- **Estimates & Commercial Quotations**: `estimates`, `estimate_items`, `quotations`
- **CRM & Governance**: `customer_notes`, `audit_logs`, `system_settings`

---

## 4. Environment Setup & Configuration

### Prerequisites
- Node.js `v18.x` to `v24.x`
- npm `v9+` or pnpm
- Git

### 1. Clone & Install
```bash
git clone <repository-url>
cd JKEngineer
npm install
```

### 2. Configure Environment Variables (`.env`)
Create a `.env` file based on `.env.example`:
```ini
# Local SQLite (Out of the box)
DATABASE_URL="file:./dev.db"

# Or Production PostgreSQL on jkengineersworks.in
# DATABASE_URL="postgresql://postgres:password@localhost:5432/jkengineers"

# Session & JWT
JWT_SECRET="jk-engineers-super-secure-jwt-secret-mumbai-2026-production"
JWT_EXPIRES_IN="7d"

# OTP Provider: "mock" (auto-prefills in dev) or "msg91" or "twilio"
OTP_PROVIDER="mock"

# Production SMS Gateway Credentials (optional in mock mode)
MSG91_AUTH_KEY=""
MSG91_TEMPLATE_ID=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""

# App URLs & Brand Metadata
PORT=3000
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_COMPANY_NAME="JK Engineers Works"
NEXT_PUBLIC_COMPANY_PHONE="+91 7942546295"
NEXT_PUBLIC_COMPANY_EMAIL="info@jkengineersworks.com"
NEXT_PUBLIC_COMPANY_LOCATION="Mumbai, Maharashtra, India"
```

### 3. Initialize Database & Seed Authentic Products
```bash
# Push Prisma schema to SQLite
npm run prisma:push

# Seed authentic JK Engineers Works products, materials & store configurations
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Automated Testing

Run the full automated unit and integration test suite:
```bash
npm test
```
Tests include:
- **Measurement Precision**: Millimeter conversions for feet, inches, meters, and compound `"12 ft 6 in"`.
- **Shop Geometry Validation**: Boundary checks, out-of-bounds opening detection.
- **Pricing Engine & Bill of Materials (BOM)**: Steel weight calculations, powder coating area, brackets, hardware, labor, and 18% GST.
- **Spatial Design Engine**: Door swing buffer clearance, window avoidance, and collision-free obstacle packing.
- **Rule 5 Compliance**: Low budget testing verifying that raw steel rates are never downgraded.
- **Price Versioning (Rule 20)**: Ensuring that updating raw material rates does **not** alter preexisting estimates.

---

## 6. Default Demo Credentials

### Customer Flow (Passwordless OTP)
1. Go to `/designer` and complete steps 1–6.
2. Enter any 10-digit Indian mobile number (e.g. `9820012345`).
3. Click **Send OTP**.
4. In demo mode (`OTP_PROVIDER="mock"`), the 6-digit OTP is automatically displayed on-screen and pre-filled.
5. Click **Verify OTP & Generate Layout**.

### Admin Management Portal
- URL: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)
- Username: `admin` (or `admin@jkengineersworks.com`)
- Password: `AdminJK@2026`

---

## 7. Production Deployment Guide (`jkengineersworks.in`)

### DNS Configuration
Set up the following DNS records on your domain registrar (GoDaddy / Cloudflare / Namecheap) for `jkengineersworks.in`:

| Type | Host / Name | Value / Destination | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` | `<YOUR_SERVER_PUBLIC_IP>` | Auto / 300 |
| **CNAME**| `www` | `jkengineersworks.in` | Auto / 300 |

### Ubuntu / Debian Production Setup with Systemd & Nginx
1. **Pull and Build on Production Server**:
   ```bash
   cd /var/www/jkengineers
   npm install --production=false
   npx prisma generate
   npx prisma db push
   npm run build
   ```

2. **Systemd Service (`/etc/systemd/system/jkengineer.service`)**:
   ```ini
   [Unit]
   Description=JK Engineers Works Next.js Server
   After=network.target

   [Service]
   Type=simple
   User=www-data
   WorkingDirectory=/var/www/jkengineers
   ExecStart=/usr/bin/npm start
   Restart=always
   Environment=NODE_ENV=production
   Environment=PORT=3000

   [Install]
   WantedBy=multi-user.target
   ```
   Enable and start:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable jkengineer
   sudo systemctl start jkengineer
   ```

3. **Nginx Reverse Proxy (`/etc/nginx/sites-available/jkengineersworks.in`)**:
   ```nginx
   server {
       listen 80;
       server_name jkengineersworks.in www.jkengineersworks.in;

       # Redirect HTTP to HTTPS
       return 301 https://$host$request_uri;
   }

   server {
       listen 443 ssl http2;
       server_name jkengineersworks.in www.jkengineersworks.in;

       ssl_certificate /etc/letsencrypt/live/jkengineersworks.in/fullchain.pem;
       ssl_certificate_key /etc/letsencrypt/live/jkengineersworks.in/privkey.pem;

       # Security Headers
       add_header X-Frame-Options "SAMEORIGIN";
       add_header X-XSS-Protection "1; mode=block";
       add_header X-Content-Type-Options "nosniff";

       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

4. **SSL with Let's Encrypt Certbot**:
   ```bash
   sudo certbot --nginx -d jkengineersworks.in -d www.jkengineersworks.in
   ```

---

## 8. License & Commercial Rights

Copyright © 2026 **JK Engineers Works**, Mumbai, Maharashtra, India.  
All proprietary commercial rights reserved.
