# 🔴 AAA/RADIUS ISP Billing Solution — Comprehensive Feature Gap Analysis

**Product Version:** v2.9.0  
**Date:** 2025-04-08  
**Market Competitors Analyzed:** Splynx, 24online, Powercode, daloRADIUS, pfSense, MikroTik User Manager, UniFi ISP, Sonar, Splynx, OpenNDS, Wifidog, Cloudtrax, Tarana, Cambium cnMaestro

---

## 📊 CURRENT INVENTORY — What You HAVE (v2.9.0)

### ✅ Implemented Features (29 Components, 27 DB Models, 17 APIs)

| # | Module | Status | Details |
|---|--------|--------|---------|
| 1 | Dashboard | ✅ Complete | Stats cards, system health, online users panel, live activity feed, charts |
| 2 | RADIUS User Management | ✅ Complete | CRUD, search/filter, bulk operations, CSV import, RADIUS check/reply attrs |
| 3 | NAS Device Management | ✅ Complete | Multi-vendor (Cisco/Juniper/MikroTik/Huawei/Aruba), CRUD, templates |
| 4 | Billing Plans | ✅ Complete | Flat-rate/time-based/data-based/hybrid, comparison tool, CRUD |
| 5 | Policy Engine | ✅ Complete | Bandwidth/time/data/access/ACL/firewall rules, templates, priority |
| 6 | Session Monitoring | ✅ Complete | Live duration, bandwidth, disconnect, batch disconnect |
| 7 | Billing & Invoices | ✅ Complete | Invoice CRUD, payments, auto-generate, revenue tracking |
| 8 | Reports & Analytics | ✅ Complete | Usage, revenue, session reports with charts |
| 9 | System Settings | ✅ Complete | RADIUS config, audit logs, system health |
| 10 | RADIUS Dictionary | ✅ Complete | 90+ attributes, vendor attrs, search, categories |
| 11 | IP Pool Management | ✅ Complete | Static/dynamic/pool, ranges, reservations, assignments |
| 12 | User Registrations | ✅ Complete | Registration requests, approve/reject workflow |
| 13 | Self-Care Portal | ✅ UI Only | 6-tab portal (registration, account, KYC, services, billing, support) |
| 14 | Network Topology | ✅ UI Only | Visual network map with device connections |
| 15 | Bandwidth Analytics | ✅ Complete | Per-user bandwidth, daily trends, top users, data cap utilization |
| 16 | Ticket System | ✅ Complete | Support tickets, status workflow, priorities, categories |
| 17 | Authentication | ✅ Basic | Login page, Zustand auth state, demo login |
| 18 | CSV Import/Export | ✅ Complete | Bulk user import, CSV/JSON export on all tables |
| 19 | Command Palette | ✅ Complete | Cmd+K keyboard navigation |
| 20 | Notification Center | ✅ UI Only | Static notifications (not live) |
| 21 | Live RADIUS Events | ✅ UI Only | Simulated event stream |
| 22 | Plan Comparison | ✅ Complete | Side-by-side plan comparison matrix |
| 23 | Activity Dashboard | ✅ Complete | System activity and audit trail |
| 24 | RADIUS Test Dialog | ✅ Simulated | Auth test, CoA, disconnect simulation |
| 25 | KYC Verification | ✅ UI Only | Document upload UI (no backend file storage) |

---

## 🔴 CRITICAL MISSING FEATURES — Must-Have for Production ISP

### 1. 🔐 RADIUS AUTHENTICATION ENGINE (CORE — NOT FUNCTIONAL)

**What competitors have:**  
Your product MANAGES RADIUS data but does NOT actually AUTHENTICATE users. The entire point of an AAA system is to process RADIUS Access-Request, return Access-Accept/Reject, and handle Accounting-Request.

| Sub-Feature | Priority | Details |
|-------------|----------|---------|
| **RADIUS Server Integration** | 🔴 CRITICAL | Actual RADIUS server (FreeRADIUS rlm_sql/rlm_rest) that reads from your DB and authenticates users in real-time |
| **Access-Request Handler** | 🔴 CRITICAL | Process PAP/CHAP/MS-CHAPv2/EAP authentication requests, validate password (Cleartext-Password, NT-Password, MD5-Password) |
| **Access-Accept with Reply Attributes** | 🔴 CRITICAL | Return Framed-IP-Address, Session-Timeout, Idle-Timeout, bandwidth limits (WISPr, Mikrotik-Rate-Limit), Filter-Id on auth success |
| **Access-Reject Handler** | 🔴 CRITICAL | Return proper reject with Reply-Message explaining reason |
| **Accounting-Request Handler** | 🔴 CRITICAL | Start/Interim-Update/Stop accounting → write to RadAcct table with real session data |
| **CoA (Change of Authorization)** | 🔴 CRITICAL | RFC 5177 — disconnect users, change session parameters mid-session, reassign bandwidth |
| **PoD (Packet of Disconnect)** | 🔴 CRITICAL | RFC 3576 — forced disconnect from RADIUS server |
| **Post-Auth Processing** | 🔴 CRITICAL | Execute rules after auth (log to RadPostAuth, apply policies, trigger notifications) |
| **Simultaneous-Use Enforcement** | 🔴 CRITICAL | Check active sessions before auth, reject if user exceeds max simultaneous limit |
| **User Expiry Enforcement** | 🔴 CRITICAL | Check expiryDate before auth, reject expired users with message |
| **Group-Based Auth** | 🔴 CRITICAL | Inherit check/reply attributes from RadGroupCheck/RadGroupReply |
| **Huntgroup Support** | 🔴 CRITICAL | Match NAS IP → huntgroup → apply group-specific attributes |
| **Unlang (FreeRADIUS) Rules** | 🟡 High | Conditional attribute assignment based on request contents |

**FreeRADIUS Integration Pattern:**
```
Your App (DB) ←→ FreeRADIUS (rlm_rest or rlm_sql) ←→ NAS Devices
                ↑ Read users, groups, check/reply attrs
                ↑ Write accounting records to RadAcct
                ↑ Read Simultaneous-Use from active sessions
```

---

### 2. 💰 BILLING & PAYMENT ENGINE (CORE — MOSTLY UI ONLY)

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Real Payment Gateway Integration** | 🔴 CRITICAL | Stripe, PayPal, Razorpay, PhonePe integration — actual payment processing, not just UI | Splynx, 24online, Powercode |
| **Auto-Invoice Generation** | 🔴 CRITICAL | Cron-based: auto-generate invoices at billing cycle start (monthly/weekly/daily) | Splynx, Powercode |
| **Pro-Rated Billing** | 🔴 CRITICAL | Charge partial month when user changes plan mid-cycle | Splynx, Powercode |
| **Grace Period** | 🔴 CRITICAL | Allow X days after due date before suspension, with warning emails | Splynx, 24online |
| **Auto-Suspend on Non-Payment** | 🔴 CRITICAL | Automatically disable RADIUS user after grace period expires | Splynx, Powercode |
| **Auto-Reconnect on Payment** | 🔴 CRITICAL | Re-enable RADIUS user and send CoA to reconnect | Splynx |
| **Payment Receipt Generation** | 🔴 CRITICAL | PDF receipt with transaction details | All competitors |
| **Invoice PDF Generation** | 🔴 CRITICAL | Professional PDF invoice with company logo, tax breakdown, payment QR | All competitors |
| **Tax Management** | 🔴 CRITICAL | GST/VAT/TAX configuration per plan, per location, compound tax support | Splynx, Powercode |
| **Discount & Coupons** | 🔴 CRITICAL | Percentage/flat discount codes, promo campaigns, one-time/recurring | Splynx, 24online |
| **Refund Processing** | 🟡 High | Partial/full refund workflow, credit note generation | Splynx, Powercode |
| **Deposit/Wallet System** | 🟡 High | Prepaid wallet balance, top-up, auto-deduction | Splynx, 24online |
| **Prepaid Balance Tracking** | 🔴 CRITICAL | Real-time balance check via RADIUS, block when depleted | 24online, MikroTik User Manager |
| **Postpaid Credit Limit** | 🔴 CRITICAL | Allow usage up to credit limit, then disconnect | Splynx, Powercode |
| **Plan Change Mid-Cycle** | 🔴 CRITICAL | Change plan with proration, immediate or next-bill effect | Splynx |
| **Trial Period** | 🟡 High | Free trial days on signup, auto-convert to paid | Splynx, Powercode |
| **Payment Reminders** | 🔴 CRITICAL | Automated email/SMS reminders: 3 days before, on due date, 3 days after, 7 days after | Splynx, 24online |

---

### 3. 📡 HOTSPOT / CAPTIVE PORTAL ENGINE

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Captive Portal Page Generator** | 🔴 CRITICAL | Customizable hotspot login page (branding, logo, terms of service) | 24online, pfSense, UniFi |
| **Hotspot Authentication Methods** | 🔴 CRITICAL | Username/Password, Voucher/Code, MAC authentication, Social login (Facebook/Google), SMS OTP | 24online, UniFi, pfSense |
| **Voucher/Prepaid Code System** | 🔴 CRITICAL | Generate batch vouchers, time/data-based, QR codes, bulk print | 24online, pfSense, UniFi, Wifidog |
| **MAC Authentication** | 🔴 CRITICAL | Auto-authenticate known MAC addresses (permanent or time-limited) | pfSense, MikroTik, UniFi |
| **Bandwidth Packages for Hotspot** | 🔴 CRITICAL | Tiered plans (Free 1hr/100MB, Premium 4hrs/5GB, Unlimited) | 24online, UniFi |
| **Session Timeout for Hotspot** | 🔴 CRITICAL | Max session time, idle timeout, daily quota, reset at midnight | 24online, pfSense |
| **Walled Garden** | 🟡 High | Allow access to specific sites (banking, ISP portal) without authentication | pfSense, 24online |
| **Multi-Location Hotspot** | 🔴 CRITICAL | Same user across multiple hotspot locations, roaming | 24online, Splynx, UniFi |
| **Passpoint/HS2.0 Support** | 🟡 Medium | WPA3-Enterprise, seamless roaming (802.11u) | Enterprise solutions |
| **Splash Page Analytics** | 🟡 High | Page views, conversion rate, login method distribution | 24online |

---

### 4. 👤 CUSTOMER SELF-CARE PORTAL (CURRENTLY UI ONLY — NO BACKEND)

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Real User Authentication** | 🔴 CRITICAL | Actual login via RADIUS credentials (not just Zustand state) | All competitors |
| **Real-Time Usage Display** | 🔴 CRITICAL | Current session data usage (upload/download), time remaining | 24online, Splynx, UniFi |
| **Plan Upgrade/Downgrade** | 🔴 CRITICAL | User can change their own plan with proration | Splynx, 24online |
| **Online Payment** | 🔴 CRITICAL | Pay invoices online via payment gateway | Splynx, 24online, Powercode |
| **View/Pay Invoices** | 🔴 CRITICAL | Invoice history, PDF download, pay button | All |
| **View Session History** | 🔴 CRITICAL | Past sessions with duration, bandwidth, dates | All |
| **Service Request/Ticket** | 🔴 CRITICAL | Create support tickets, track status | Splynx, 24online |
| **Profile Update** | 🔴 CRITICAL | Update name, email, phone, password, address | All |
| **Change Password** | 🔴 CRITICAL | Self-service password change (hash update in DB) | All |
| **Multi-Device Management** | 🟡 High | View connected devices, disconnect unwanted sessions | Splynx, 24online |
| **Data Top-Up** | 🟡 High | Purchase additional data quota mid-cycle | 24online |
| **Auto-Pay Setup** | 🟡 High | Recurring payment registration (credit card/bank) | Splynx, Powercode |
| **Notification Preferences** | 🟡 High | Email/SMS preferences for billing, outages, marketing | Splynx |
| **Referral Program** | 🟡 Medium | Referral code, earn credit for referrals | Splynx, 24online |

---

### 5. 📡 NAS & NETWORK MANAGEMENT (ENHANCEMENTS NEEDED)

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Real NAS Status Polling** | 🔴 CRITICAL | SNMP polling of NAS devices — CPU, memory, uptime, interface status, active sessions | Splynx, Powercode, MikroTik |
| **SNMP Trap Handling** | 🔴 CRITICAL | Receive and display NAS alerts (link down, high CPU, BGP flap) | Splynx, Powercode |
| **NAS Configuration Backup** | 🟡 High | Auto-backup MikroTik/Cisco/Juniper configs, version history | Splynx |
| **NAS Bulk Configuration** | 🟡 High | Push RADIUS server config to multiple NAS devices via API/SSH | Splynx |
| **TR-069 (CWMP) Support** | 🟡 High | Auto-provision CPE routers, firmware update, status monitoring | Splynx, Powercode |
| **PPPoE Server Integration** | 🔴 CRITICAL | PPPoE user management, session control via RADIUS | MikroTik, 24online |
| **VLAN Management** | 🟡 High | Assign VLANs per user/plan/zone, QoS per VLAN | Splynx, Powercode |
| **MPLS/VPLS Support** | 🟡 Medium | Enterprise L2/L3 VPN circuit management | Enterprise ISP solutions |
| **Network Weathermap** | 🟡 Medium | Visual link utilization with color-coded bandwidth | Cacti, LibreNMS integration |

---

### 6. 📊 REPORTING & ANALYTICS (MAJOR GAPS)

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Real-Time Dashboard** | 🔴 CRITICAL | Live: active sessions, bandwidth usage, NAS status, revenue today (via WebSocket) | Splynx, Powercode |
| **User-wise Usage Reports** | 🔴 CRITICAL | Per-user detailed: daily/weekly/monthly data, time, sessions | All |
| **Revenue Reports** | 🔴 CRITICAL | Daily/weekly/monthly revenue, MRR, churn rate, ARPU, LTV | Splynx, Powercode |
| **Collection Report** | 🔴 CRITICAL | Outstanding, collected, overdue aging (30/60/90 days) | Splynx, 24online |
| **Bandwidth Utilization** | 🔴 CRITICAL | Per-NAS, per-plan, per-user bandwidth over time | All |
| **Session Analytics** | 🔴 CRITICAL | Avg session duration, peak concurrent, disconnect reasons | All |
| **User Acquisition Report** | 🟡 High | New users per period, churn, retention rate, activation rate | Splynx |
| **Plan Popularity Report** | 🟡 High | Subscriptions per plan, upgrades/downgrades, revenue per plan | Splynx |
| **NAS Performance Report** | 🔴 CRITICAL | Per-NAS: sessions, bandwidth, uptime, error rates | All |
| **Tax Report** | 🔴 CRITICAL | Tax collected per period, per tax rate, export for filing | Splynx, Powercode |
| **SLA Monitoring Report** | 🟡 High | Uptime percentage, MTTR, response time per customer | Enterprise solutions |
| **Custom Report Builder** | 🟡 High | User-configurable report with column/row/filter selection | Splynx, Powercode |
| **Scheduled Report Email** | 🟡 High | Auto-email daily/weekly/monthly reports to admin email | Splynx |
| **API Usage Report** | 🟡 Medium | Rate limiting, API call counts per customer | API-heavy ISPs |

---

### 7. 🔔 NOTIFICATION & ALERTING ENGINE

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Email Notification System** | 🔴 CRITICAL | SMTP integration: send emails for signup, payment, invoice, suspension, alerts | All |
| **SMS Notification (OTP/Billing)** | 🔴 CRITICAL | Twilio/MSG91/Vonage: OTP for login, payment reminders, outage alerts | Splynx, 24online |
| **WhatsApp Notification** | 🟡 High | WhatsApp Business API: billing, alerts, support | 24online (India) |
| **Push Notification** | 🟡 Medium | Browser/mobile push for real-time alerts | Modern solutions |
| **Escalation Rules** | 🟡 High | Auto-escalate alerts: critical → SMS admin, warning → email | Splynx, Powercode |
| **Event-Triggered Notifications** | 🔴 CRITICAL | Auto-notify on: NAS down, user quota exceeded, payment received, new registration, password change | All |
| **Notification Templates** | 🟡 High | Editable email/SMS templates with variables | Splynx, Powercode |
| **Notification Log** | 🟡 High | History of all sent notifications with status (delivered/failed) | Splynx |

---

### 8. 🔒 SECURITY & ACCESS CONTROL

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **RBAC (Role-Based Access)** | 🔴 CRITICAL | Admin/Operator/Viewer with per-module permissions (partially done) | All |
| **Multi-Tenant / Reseller Support** | 🔴 CRITICAL | Sub-ISP/reseller management, branded portals, separate billing | Splynx, Powercode |
| **Two-Factor Auth (2FA)** | 🔴 CRITICAL | TOTP (Google Authenticator) for admin login | All enterprise |
| **Password Policy** | 🟡 High | Min length, complexity, rotation, history | Enterprise |
| **Login Attempt Lockout** | 🔴 CRITICAL | Lock after N failed attempts, auto-unlock after X minutes | All |
| **Session Timeout** | 🔴 CRITICAL | Admin web session timeout, auto-logout | All |
| **IP Whitelist for Admin** | 🟡 High | Restrict admin access to specific IPs | Enterprise |
| **Audit Trail (Enhanced)** | 🟡 High | Log every action: who, what, when, from where (IP/UA) | All enterprise |
| **API Key Management** | 🟡 High | API keys for third-party integration, rate limiting | Splynx, Powercode |
| **RADIUS Secret Rotation** | 🟡 High | Scheduled NAS secret rotation with zero-downtime | Enterprise |
| **Data Encryption at Rest** | 🟡 Medium | Encrypt sensitive fields (passwords, payment data) in DB | Enterprise |
| **GDPR/Privacy Compliance** | 🟡 Medium | Data export, right to deletion, consent management | European ISPs |

---

### 9. 🏢 MULTI-TENANT / RESELLER / WHOLESALE

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Reseller Hierarchy** | 🔴 CRITICAL | Master ISP → Reseller → Sub-Reseller, each with own users, plans, billing | Splynx, Powercode |
| **Reseller Portal** | 🔴 CRITICAL | Separate branded portal for resellers | Splynx, 24online |
| **Reseller Balance Management** | 🔴 CRITICAL | Prepaid balance for resellers, auto-deduct on user activation | Splynx, 24online |
| **Reseller Commission** | 🟡 High | Commission on new users, revenue sharing percentage | Splynx |
| **White-Label Branding** | 🟡 High | Custom logo, colors, domain for each reseller | Splynx, Powercode |
| **Wholesale IP Pool** | 🟡 High | Allocate IP pools to resellers | Splynx |
| **Reseller API** | 🟡 Medium | API for resellers to integrate into their own systems | Splynx |

---

### 10. 📱 MOBILE APP

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Admin Mobile App** | 🟡 High | Android/iOS: manage users, view sessions, alerts | Splynx, Powercode |
| **Customer Mobile App** | 🟡 High | Android/iOS: self-care, pay bills, check usage, support | Splynx, 24online |
| **PWA Support** | 🟡 Medium | Progressive Web App for self-care (installable) | Modern solutions |

---

### 11. 🔌 API & INTEGRATIONS

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Public REST API** | 🔴 CRITICAL | Full CRUD API with authentication (OAuth2/API key), rate limiting, docs | Splynx, Powercode |
| **Webhook System** | 🔴 CRITICAL | Event webhooks: user.created, invoice.paid, session.start, nas.down | Splynx, Powercode |
| **FreeRADIUS Integration** | 🔴 CRITICAL | rlm_rest or rlm_sql config that talks to your DB | daloRADIUS, your product |
| **MikroTik API Integration** | 🟡 High | Direct API for user management, queue, firewall, PPPoE | 24online, Splynx |
| **Cisco ACS Integration** | 🟡 Medium | External RADIUS server config for Cisco devices | Enterprise |
| **Payment Gateway APIs** | 🔴 CRITICAL | Stripe, Razorpay, PayPal, PhonePe, local bank UPI | All |
| **SMS Gateway APIs** | 🔴 CRITICAL | Twilio, MSG91, Vonage, local SMS gateways | All |
| **Email Service APIs** | 🔴 CRITICAL | SendGrid, Amazon SES, SMTP relay | All |
| **LDAP/AD Integration** | 🟡 Medium | Authenticate admin against LDAP/Active Directory | Enterprise |
| **SSO (SAML/OAuth2)** | 🟡 Medium | Single sign-on for admin login | Enterprise |
| **Accounting Export** | 🟡 High | Export accounting data to external systems (CRM, ERP) | Splynx |

---

### 12. ⚙️ SYSTEM & OPERATIONS

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Backup & Restore** | 🔴 CRITICAL | DB backup, config backup, scheduled auto-backup, one-click restore | All |
| **Database Migration Tool** | 🟡 High | Schema versioning, migration scripts | Enterprise |
| **System Update Mechanism** | 🟡 High | One-click update, rollback, changelog | Splynx |
| **High Availability (HA)** | 🟡 Medium | Active-passive RADIUS servers, DB replication | Enterprise |
| **Load Balancing** | 🟡 Medium | Multiple RADIUS servers behind load balancer | Enterprise |
| **Cron Job Manager** | 🔴 CRITICAL | UI-managed cron jobs: billing cycles, reports, cleanups, backups | Splynx |
| **Data Cleanup** | 🔴 CRITICAL | Auto-purge old sessions (configurable retention), archive invoices | All |
| **System Health Dashboard** | 🔴 CRITICAL | DB size, RADIUS server status, queue depth, error rates | Splynx |
| **Log Management** | 🟡 High | Centralized logs, search, export, retention policies | Enterprise |
| **White-Label Configuration** | 🟡 High | Company name, logo, colors, email templates, invoice template | Splynx, Powercode |

---

### 13. 🌐 ADVANCED RADIUS FEATURES

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **EAP-TLS/EAP-PEAP/EAP-TTLS** | 🔴 CRITICAL | Enterprise WiFi authentication with certificates | Enterprise WPA2/3 |
| **802.1X Port-Based Auth** | 🟡 High | Wired network access control | Enterprise |
| **Dynamic VLAN Assignment** | 🔴 CRITICAL | Assign VLAN based on user/group/plan in RADIUS reply | MikroTik, Cisco, 24online |
| **Framed-Route Injection** | 🟡 High | Push routes to NAS per-user (site-to-site) | Enterprise |
| **Bandwidth Shaping via RADIUS** | 🔴 CRITICAL | Mikrotik-Rate-Limit, WISPr-Bandwidth, CoovaChilli attributes | All |
| **Data Quota via RADIUS** | 🔴 CRITICAL | ChilliSpot-Max-Total-Octets, per-session/per-daily/monthly | 24online, MikroTik |
| **Time-Based Access** | 🔴 CRITICAL | Login-Time attribute: restrict access to specific hours/days | FreeRADIUS |
| **RADIUS Proxy** | 🟡 Medium | Forward requests to upstream RADIUS based on realm | Enterprise |
| **Realm-Based Routing** | 🟡 Medium | @realm suffix routing to different RADIUS servers | Enterprise ISP |
| **Load Balancing RADIUS** | 🟡 Medium | Distribute auth requests across multiple backends | Enterprise |

---

### 14. 🏦 ADVANCED BILLING

| Sub-Feature | Priority | Details | Who Has It |
|-------------|----------|---------|------------|
| **Usage-Based Billing (UBB)** | 🔴 CRITICAL | Bill per MB/GB used, per hour/minute connected | 24online, Splynx, Powercode |
| **Burst Billing** | 🟡 High | Charge extra for bandwidth bursts above plan limit | Enterprise |
| **Tiered Pricing** | 🟡 High | First 10GB at rate X, next 50GB at rate Y, beyond at rate Z | Splynx |
| **Contract/Bond Period** | 🟡 High | Minimum commitment period, early termination fee | Splynx, Powercode |
| **Advance vs Postpaid** | 🔴 CRITICAL | Prepaid (balance-based) and postpaid (monthly invoice) modes | All |
| **Multi-Currency** | 🟡 Medium | Support multiple currencies, exchange rates | Multi-country ISPs |
| **Tax Zones** | 🟡 High | Different tax rates by state/region/country | Splynx |
| **Invoice Numbering** | 🟡 High | Sequential, financial year-based, configurable prefix | All |
| **Credit Notes** | 🟡 High | Issue credit note, apply to future invoices | Splynx, Powercode |
| **Late Fee Automation** | 🟡 High | Auto-add late fee percentage after due date | Splynx |
| **Payment Method Management** | 🟡 High | Store multiple payment methods, set default | Splynx |

---

## 📋 PRIORITIZED IMPLEMENTATION ROADMAP

### Phase 1: CORE AAA ENGINE (Week 1-2) — 🔴 CRITICAL
1. FreeRADIUS rlm_rest integration — actual RADIUS auth/accounting
2. Real-time session accounting from FreeRADIUS → RadAcct
3. Simultaneous-Use enforcement
4. User expiry enforcement
5. CoA/PoD disconnect functionality (real, not simulated)
6. Prepaid balance check during auth
7. Post-auth logging

### Phase 2: BILLING AUTOMATION (Week 3-4) — 🔴 CRITICAL
1. Auto-invoice generation (cron)
2. Payment gateway (Stripe/Razorpay)
3. Grace period & auto-suspend
4. Invoice PDF generation
5. Tax management
6. Coupon/discount system
7. Payment reminders (email)
8. Pro-rated billing

### Phase 3: SELF-CARE PORTAL (REAL BACKEND) (Week 5-6) — 🔴 CRITICAL
1. Real RADIUS credential login
2. Live usage display (from accounting)
3. Online payment
4. Password change
5. Plan change request
6. Invoice viewing
7. Ticket creation

### Phase 4: HOTSPOT ENGINE (Week 7-8) — 🔴 CRITICAL FOR WISP
1. Captive portal page generator
2. Voucher/prepaid code system
3. MAC authentication
4. Bandwidth packages for hotspot
5. Multi-location support

### Phase 5: NOTIFICATIONS & ALERTS (Week 9) — 🔴 HIGH
1. Email notification system (SMTP)
2. SMS notification (Twilio/MSG91)
3. Event-triggered notifications
4. Notification templates
5. NAS monitoring alerts (SNMP)

### Phase 6: ADVANCED FEATURES (Week 10-12) — 🟡 HIGH
1. Reseller/multi-tenant
2. SNMP monitoring
3. Custom report builder
4. RBAC enhancement
5. 2FA for admin
6. API key management
7. Webhook system

### Phase 7: ENTERPRISE (Month 4+) — 🟡 MEDIUM
1. EAP-TLS certificate management
2. RADIUS proxy
3. TR-069 CPE provisioning
4. Mobile app (PWA first)
5. High availability
6. LDAP/SSO integration

---

## 📈 FEATURE COVERAGE SCORE vs COMPETITORS

| Feature Category | Your Product v2.9 | Splynx | 24online | Powercode | daloRADIUS |
|-----------------|-------------------|--------|----------|-----------|------------|
| **RADIUS Auth Engine** | 10% (UI only) | 100% | 100% | 100% | 100% |
| **User Management** | 90% | 100% | 95% | 100% | 85% |
| **NAS Management** | 75% | 95% | 90% | 90% | 80% |
| **Billing Engine** | 30% (UI only) | 100% | 95% | 100% | 40% |
| **Payment Processing** | 0% | 100% | 90% | 100% | 20% |
| **Self-Care Portal** | 20% (UI only) | 100% | 100% | 95% | 30% |
| **Hotspot/Captive Portal** | 0% | 80% | 100% | 70% | 60% |
| **Reporting** | 60% | 95% | 80% | 90% | 50% |
| **Notifications** | 10% (static) | 100% | 90% | 95% | 20% |
| **Security/RBAC** | 40% | 95% | 80% | 90% | 40% |
| **Reseller/Multi-Tenant** | 0% | 100% | 90% | 100% | 0% |
| **API/Integrations** | 50% | 100% | 80% | 95% | 60% |
| **Mobile App** | 0% | 80% | 60% | 70% | 0% |
| **IP Pool Management** | 85% | 90% | 100% | 85% | 70% |
| **Network Topology** | 40% (visual only) | 60% | 50% | 50% | 20% |
| **Ticket System** | 70% | 90% | 80% | 85% | 30% |
| **Bandwidth Analytics** | 75% | 95% | 85% | 90% | 50% |

**Overall Score: ~35% of Production ISP Feature Set**

---

## 🎯 SUMMARY — Top 10 Gaps to Close FIRST

| Rank | Feature | Impact | Effort |
|------|---------|--------|--------|
| 1 | **Real RADIUS Authentication** | Without this, it's NOT an AAA system — just a UI | Medium |
| 2 | **Real Accounting from FreeRADIUS** | No live session data without this | Medium |
| 3 | **Payment Gateway Integration** | Can't collect money = can't operate | Medium |
| 4 | **Auto-Invoice Generation** | Manual billing doesn't scale | Medium |
| 5 | **Self-Care Portal Backend** | Customers can't self-serve | Medium |
| 6 | **Email/SMS Notifications** | No customer communication = churn | Low |
| 7 | **Grace Period + Auto-Suspend** | Revenue leakage without this | Low |
| 8 | **Voucher/Hotspot System** | Critical for WISP/hotspot operators | Medium |
| 9 | **Invoice PDF Generation** | Professional requirement | Low |
| 10 | **Prepaid Balance System** | Many ISPs run on prepaid model | Medium |

---

*Analysis generated from deep market research of Splynx, 24online, Powercode, daloRADIUS, pfSense, MikroTik User Manager, UniFi ISP, and other ISP billing platforms.*
EOF
echo "Feature gap analysis written successfully"
wc -l /home/z/my-project/FEATURE_GAP_ANALYSIS.md