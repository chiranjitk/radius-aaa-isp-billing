import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    // =============================================
    // STEP 1: Clear all existing data (FK-safe order)
    // =============================================
    await db.payment.deleteMany();
    await db.invoice.deleteMany();
    await db.subscription.deleteMany();
    await db.planPolicyGroup.deleteMany();
    await db.policyRule.deleteMany();
    await db.radAcct.deleteMany();
    await db.radPostAuth.deleteMany();
    await db.radUserGroup.deleteMany();
    await db.radCheck.deleteMany();
    await db.radReply.deleteMany();
    await db.radGroupReply.deleteMany();
    await db.radGroupCheck.deleteMany();
    await db.radUser.deleteMany();
    await db.radGroup.deleteMany();
    await db.nas.deleteMany();
    await db.plan.deleteMany();
    await db.policy.deleteMany();
    await db.vendorAttribute.deleteMany();
    await db.vendor.deleteMany();
    await db.auditLog.deleteMany();
    await db.systemSetting.deleteMany();

    // =============================================
    // STEP 2: Create RADIUS groups
    // =============================================
    const groups = await db.radGroup.createMany({
      data: [
        { name: "vip-users", description: "VIP users with premium bandwidth and no restrictions", priority: 10 },
        { name: "premium-users", description: "Premium users with high bandwidth allowances", priority: 8 },
        { name: "standard-users", description: "Standard users with moderate bandwidth", priority: 5 },
        { name: "guest-users", description: "Guest users with limited access", priority: 2 },
        { name: "trial-users", description: "Trial users with temporary access", priority: 1 },
        { name: "admin-users", description: "Administrative users with full access", priority: 20 },
      ],
    });

    // =============================================
    // STEP 3: Create group check/reply attributes
    // =============================================
    await db.radGroupCheck.createMany({
      data: [
        // vip-users
        { groupName: "vip-users", attribute: "Simultaneous-Use", op: ":=", value: "5" },
        // premium-users
        { groupName: "premium-users", attribute: "Simultaneous-Use", op: ":=", value: "3" },
        // standard-users
        { groupName: "standard-users", attribute: "Simultaneous-Use", op: ":=", value: "2" },
        // guest-users
        { groupName: "guest-users", attribute: "Simultaneous-Use", op: ":=", value: "1" },
        { groupName: "guest-users", attribute: "Login-Time", op: ":=", value: "Wk0800-2200" },
        // trial-users
        { groupName: "trial-users", attribute: "Simultaneous-Use", op: ":=", value: "1" },
        { groupName: "trial-users", attribute: "Login-Time", op: ":=", value: "Any" },
        // admin-users
        { groupName: "admin-users", attribute: "Simultaneous-Use", op: ":=", value: "10" },
        { groupName: "admin-users", attribute: "Auth-Type", op: ":=", value: "MS-CHAPv2" },
      ],
    });

    await db.radGroupReply.createMany({
      data: [
        // vip-users
        { groupName: "vip-users", attribute: "Mikrotik-Rate-Limit", op: "=", value: "500M/500M" },
        { groupName: "vip-users", attribute: "Session-Timeout", op: "=", value: "86400" },
        { groupName: "vip-users", attribute: "Idle-Timeout", op: "=", value: "3600" },
        { groupName: "vip-users", attribute: "WISPr-Bandwidth-Max-Down", op: "=", value: "524288000" },
        { groupName: "vip-users", attribute: "WISPr-Bandwidth-Max-Up", op: "=", value: "524288000" },
        // premium-users
        { groupName: "premium-users", attribute: "Mikrotik-Rate-Limit", op: "=", value: "100M/50M" },
        { groupName: "premium-users", attribute: "Session-Timeout", op: "=", value: "43200" },
        { groupName: "premium-users", attribute: "Idle-Timeout", op: "=", value: "1800" },
        { groupName: "premium-users", attribute: "WISPr-Bandwidth-Max-Down", op: "=", value: "104857600" },
        { groupName: "premium-users", attribute: "WISPr-Bandwidth-Max-Up", op: "=", value: "52428800" },
        // standard-users
        { groupName: "standard-users", attribute: "Mikrotik-Rate-Limit", op: "=", value: "50M/25M" },
        { groupName: "standard-users", attribute: "Session-Timeout", op: "=", value: "28800" },
        { groupName: "standard-users", attribute: "Idle-Timeout", op: "=", value: "900" },
        { groupName: "standard-users", attribute: "WISPr-Bandwidth-Max-Down", op: "=", value: "52428800" },
        { groupName: "standard-users", attribute: "WISPr-Bandwidth-Max-Up", op: "=", value: "26214400" },
        // guest-users
        { groupName: "guest-users", attribute: "Mikrotik-Rate-Limit", op: "=", value: "10M/5M" },
        { groupName: "guest-users", attribute: "Session-Timeout", op: "=", value: "3600" },
        { groupName: "guest-users", attribute: "Idle-Timeout", op: "=", value: "300" },
        { groupName: "guest-users", attribute: "WISPr-Bandwidth-Max-Down", op: "=", value: "10485760" },
        { groupName: "guest-users", attribute: "WISPr-Bandwidth-Max-Up", op: "=", value: "5242880" },
        // trial-users
        { groupName: "trial-users", attribute: "Mikrotik-Rate-Limit", op: "=", value: "20M/10M" },
        { groupName: "trial-users", attribute: "Session-Timeout", op: "=", value: "7200" },
        { groupName: "trial-users", attribute: "Idle-Timeout", op: "=", value: "600" },
        { groupName: "trial-users", attribute: "WISPr-Bandwidth-Max-Down", op: "=", value: "20971520" },
        { groupName: "trial-users", attribute: "WISPr-Bandwidth-Max-Up", op: "=", value: "10485760" },
        // admin-users
        { groupName: "admin-users", attribute: "Mikrotik-Rate-Limit", op: "=", value: "1G/1G" },
        { groupName: "admin-users", attribute: "Session-Timeout", op: "=", value: "0" },
        { groupName: "admin-users", attribute: "Idle-Timeout", op: "=", value: "0" },
        { groupName: "admin-users", attribute: "WISPr-Bandwidth-Max-Down", op: "=", value: "1073741824" },
        { groupName: "admin-users", attribute: "WISPr-Bandwidth-Max-Up", op: "=", value: "1073741824" },
      ],
    });

    // =============================================
    // STEP 4: Create RADIUS users (25+)
    // =============================================
    const usersData = [
      // VIP users (3)
      { username: "james.mitchell", password: "SecureP@ss2024!", fullName: "James Mitchell", email: "james.mitchell@techcorp.com", phone: "+1-555-0101", company: "TechCorp Industries", status: "active", authType: "MS-CHAPv2", simultaneous: 5 },
      { username: "sarah.chen", password: "Ch3nSecur3!", fullName: "Sarah Chen", email: "sarah.chen@globalnet.com", phone: "+1-555-0102", company: "GlobalNet Solutions", status: "active", authType: "MS-CHAPv2", simultaneous: 5 },
      { username: "michael.rodriguez", password: "M!k3yR2024", fullName: "Michael Rodriguez", email: "m.rodriguez@financex.com", phone: "+1-555-0103", company: "FinanceX Holdings", status: "active", authType: "EAP", simultaneous: 5 },

      // Premium users (5)
      { username: "emily.watson", password: "W@tsonE2024", fullName: "Emily Watson", email: "emily.watson@designlab.io", phone: "+1-555-0201", company: "DesignLab Creative", status: "active", authType: "MS-CHAPv2", simultaneous: 3 },
      { username: "david.kim", password: "D@vidK!m24", fullName: "David Kim", email: "david.kim@cloudbase.io", phone: "+1-555-0202", company: "CloudBase Inc.", status: "active", authType: "MS-CHAPv2", simultaneous: 3 },
      { username: "anna.petrova", password: "P3tr0v@2024", fullName: "Anna Petrova", email: "a.petrova@euroweb.de", phone: "+49-555-0203", company: "EuroWeb GmbH", status: "active", authType: "PAP", simultaneous: 3 },
      { username: "robert.taylor", password: "R0b3rtT24!", fullName: "Robert Taylor", email: "r.taylor@mediasync.com", phone: "+1-555-0204", company: "MediaSync LLC", status: "active", authType: "MS-CHAPv2", simultaneous: 3 },
      { username: "lisa.nakamura", password: "N@k@muraL!", fullName: "Lisa Nakamura", email: "l.nakamura@tokyotech.jp", phone: "+81-555-0205", company: "TokyoTech Solutions", status: "active", authType: "EAP", simultaneous: 3 },

      // Standard users (7)
      { username: "john.smith", password: "J0hnS!2024", fullName: "John Smith", email: "john.smith@acme.co", phone: "+1-555-0301", company: "Acme Corporation", status: "active", authType: "PAP", simultaneous: 2 },
      { username: "maria.garcia", password: "G@rc1aM24!", fullName: "Maria Garcia", email: "m.garcia@latamnet.mx", phone: "+52-555-0302", company: "LatamNet SA", status: "active", authType: "PAP", simultaneous: 2 },
      { username: "ahmed.hassan", password: "H@ss@nA2024", fullName: "Ahmed Hassan", email: "a.hassan@mideasttel.ae", phone: "+971-555-0303", company: "MiddleEast Telecom", status: "active", authType: "CHAP", simultaneous: 2 },
      { username: "claire.dubois", password: "Dub0!sC2024", fullName: "Claire Dubois", email: "c.dubois@parisian.fr", phone: "+33-555-0304", company: "Parisian Networks", status: "active", authType: "PAP", simultaneous: 2 },
      { username: "thomas.andersen", password: "And3rsenT!", fullName: "Thomas Andersen", email: "t.andersen@nordicnet.dk", phone: "+45-555-0305", company: "NordicNet A/S", status: "active", authType: "MS-CHAPv2", simultaneous: 2 },
      { username: "priya.sharma", password: "Sh@rm@P2024", fullName: "Priya Sharma", email: "p.sharma@indiatech.in", phone: "+91-555-0306", company: "IndiaTech Services", status: "active", authType: "PAP", simultaneous: 2 },
      { username: "kevin.obrien", password: "0Br1enK2024", fullName: "Kevin O'Brien", email: "k.obrien@celticnet.ie", phone: "+353-555-0307", company: "CelticNet Ltd.", status: "active", authType: "CHAP", simultaneous: 2 },

      // Guest users (5)
      { username: "guest.reception", password: "Guest@01", fullName: "Lobby Guest Terminal", email: "", phone: "", company: "", status: "active", authType: "PAP", simultaneous: 1 },
      { username: "guest.confroom", password: "Guest@02", fullName: "Conference Room A", email: "", phone: "", company: "", status: "active", authType: "PAP", simultaneous: 1 },
      { username: "guest.warehouse", password: "Guest@03", fullName: "Warehouse Terminal", email: "", phone: "", company: "", status: "active", authType: "PAP", simultaneous: 1 },
      { username: "visitor.yang", password: "Y@ngV!s1t", fullName: "Wei Yang (Visitor)", email: "wei.yang@external.cn", phone: "+86-555-0401", company: "External Partner", status: "active", authType: "PAP", simultaneous: 1 },
      { username: "visitor.okafor", password: "Ok4f0rV!24", fullName: "Chidi Okafor (Visitor)", email: "c.okafor@external.ng", phone: "+234-555-0402", company: "External Partner", status: "active", authType: "PAP", simultaneous: 1 },

      // Trial users (3)
      { username: "trial.jones", password: "Tr14lJ!24", fullName: "Alex Jones", email: "a.jones@startupco.com", phone: "+1-555-0501", company: "StartupCo", status: "active", authType: "PAP", simultaneous: 1, expiryDate: new Date("2024-04-15T23:59:59Z") },
      { username: "trial.martinez", password: "Tr14lM!24", fullName: "Carlos Martinez", email: "c.martinez@freelance.ar", phone: "+54-555-0502", company: "Freelance", status: "active", authType: "PAP", simultaneous: 1, expiryDate: new Date("2024-04-10T23:59:59Z") },
      { username: "trial.mueller", password: "Tr14lMu24", fullName: "Felix Mueller", email: "f.mueller@berlin.dev", phone: "+49-555-0503", company: "Independent", status: "active", authType: "PAP", simultaneous: 1, expiryDate: new Date("2024-03-30T23:59:59Z") },

      // Admin users (2)
      { username: "admin.root", password: "Adm1nR00t!", fullName: "System Administrator", email: "admin@radius.local", phone: "+1-555-0001", company: "IT Department", status: "active", authType: "MS-CHAPv2", simultaneous: 10 },
      { username: "admin.ops", password: "0ps@dmin24", fullName: "Operations Admin", email: "ops@radius.local", phone: "+1-555-0002", company: "IT Department", status: "active", authType: "MS-CHAPv2", simultaneous: 10 },
    ];

    await db.radUser.createMany({ data: usersData });

    // =============================================
    // STEP 5: Create user-group mappings
    // =============================================
    await db.radUserGroup.createMany({
      data: [
        // VIP users -> vip-users
        { username: "james.mitchell", groupName: "vip-users", priority: 1 },
        { username: "sarah.chen", groupName: "vip-users", priority: 1 },
        { username: "michael.rodriguez", groupName: "vip-users", priority: 1 },
        // Premium users -> premium-users
        { username: "emily.watson", groupName: "premium-users", priority: 1 },
        { username: "david.kim", groupName: "premium-users", priority: 1 },
        { username: "anna.petrova", groupName: "premium-users", priority: 1 },
        { username: "robert.taylor", groupName: "premium-users", priority: 1 },
        { username: "lisa.nakamura", groupName: "premium-users", priority: 1 },
        // Standard users -> standard-users
        { username: "john.smith", groupName: "standard-users", priority: 1 },
        { username: "maria.garcia", groupName: "standard-users", priority: 1 },
        { username: "ahmed.hassan", groupName: "standard-users", priority: 1 },
        { username: "claire.dubois", groupName: "standard-users", priority: 1 },
        { username: "thomas.andersen", groupName: "standard-users", priority: 1 },
        { username: "priya.sharma", groupName: "standard-users", priority: 1 },
        { username: "kevin.obrien", groupName: "standard-users", priority: 1 },
        // Guest users -> guest-users
        { username: "guest.reception", groupName: "guest-users", priority: 1 },
        { username: "guest.confroom", groupName: "guest-users", priority: 1 },
        { username: "guest.warehouse", groupName: "guest-users", priority: 1 },
        { username: "visitor.yang", groupName: "guest-users", priority: 1 },
        { username: "visitor.okafor", groupName: "guest-users", priority: 1 },
        // Trial users -> trial-users
        { username: "trial.jones", groupName: "trial-users", priority: 1 },
        { username: "trial.martinez", groupName: "trial-users", priority: 1 },
        { username: "trial.mueller", groupName: "trial-users", priority: 1 },
        // Admin users -> admin-users
        { username: "admin.root", groupName: "admin-users", priority: 1 },
        { username: "admin.ops", groupName: "admin-users", priority: 1 },
      ],
    });

    // =============================================
    // STEP 6: Create per-user check attributes (Cleartext-Password)
    // =============================================
    const userCheckData = usersData.map((u) => ({
      username: u.username,
      attribute: "Cleartext-Password",
      op: ":=",
      value: u.password,
    }));
    await db.radCheck.createMany({ data: userCheckData });

    // Add extra check attributes for some users
    await db.radCheck.createMany({
      data: [
        { username: "admin.root", attribute: "Service-Type", op: ":=", value: "Administrative-User" },
        { username: "admin.root", attribute: "Login-Time", op: ":=", value: "Any" },
        { username: "admin.ops", attribute: "Service-Type", op: ":=", value: "Administrative-User" },
        { username: "james.mitchell", attribute: "Service-Type", op: ":=", value: "Framed-User" },
        { username: "sarah.chen", attribute: "Service-Type", op: ":=", value: "Framed-User" },
        { username: "michael.rodriguez", attribute: "Service-Type", op: ":=", value: "VoIP-User" },
      ],
    });

    // =============================================
    // STEP 7: Create NAS devices (8+)
    // =============================================
    const nasDevices = [
      { nasName: "DC1-CORE-01", shortName: "dc1-core", nasType: "cisco", ipAddress: "10.0.1.1", ports: 48, secret: "c1sc0S3cr3tDc1!", server: "10.0.1.254", community: "ciscoRO", description: "Primary data center core switch", status: "up", lastAlive: new Date("2024-03-25T14:30:00Z"), vendor: "Cisco Systems", model: "Catalyst 9300-48T", location: "US-East Data Center 1, Rack A12", contact: "netops@company.com" },
      { nasName: "DC2-CORE-01", shortName: "dc2-core", nasType: "cisco", ipAddress: "10.0.2.1", ports: 48, secret: "c1sc0S3cr3tDc2!", server: "10.0.2.254", community: "ciscoRO", description: "Secondary data center core switch", status: "up", lastAlive: new Date("2024-03-25T14:28:00Z"), vendor: "Cisco Systems", model: "Catalyst 9300-48P", location: "US-West Data Center 2, Rack B07", contact: "netops@company.com" },
      { nasName: "BRANCH-NY-01", shortName: "ny-branch", nasType: "cisco", ipAddress: "192.168.10.1", ports: 24, secret: "c1sc0BranchNY!", server: "10.0.1.254", community: "ciscoRO", description: "New York branch office router", status: "up", lastAlive: new Date("2024-03-25T14:25:00Z"), vendor: "Cisco Systems", model: "ISR 4331", location: "New York Office, Floor 3, MDF Room", contact: "ny-it@company.com" },
      { nasName: "HQ-CORE-JN-01", shortName: "hq-juniper", nasType: "juniper", ipAddress: "10.0.0.1", ports: 48, secret: "jun1p3rHQ01!", server: "10.0.0.254", community: "juniperRO", description: "HQ core switch (Juniper)", status: "up", lastAlive: new Date("2024-03-25T14:32:00Z"), vendor: "Juniper Networks", model: "EX4300-48T", location: "HQ Building, Floor 1, Main IDF", contact: "hq-netops@company.com" },
      { nasName: "DC1-EDGE-JN-01", shortName: "dc1-juniper", nasType: "juniper", ipAddress: "10.0.1.2", ports: 24, secret: "jun1p3rDc1!", server: "10.0.1.254", community: "juniperRO", description: "DC1 edge access switch", status: "up", lastAlive: new Date("2024-03-25T14:29:00Z"), vendor: "Juniper Networks", model: "EX2300-24P", location: "US-East Data Center 1, Rack C03", contact: "netops@company.com" },
      { nasName: "SITE-MIKRO-01", shortName: "site-mikro1", nasType: "mikrotik", ipAddress: "192.168.50.1", ports: 10, secret: "m1kr0t1kS1t3!", server: "10.0.1.254", community: "mikroRO", description: "Remote site CCR router", status: "up", lastAlive: new Date("2024-03-25T14:20:00Z"), vendor: "MikroTik", model: "CCR2004-1G-12S+2XS", location: "Remote Site Alpha, Network Closet", contact: "remote-it@company.com" },
      { nasName: "WISP-MIKRO-02", shortName: "wisp-mikro", nasType: "mikrotik", ipAddress: "192.168.60.1", ports: 5, secret: "m1kr0t1kW!sp!", server: "10.0.1.254", community: "mikroRO", description: "WISP access point controller", status: "up", lastAlive: new Date("2024-03-25T14:15:00Z"), vendor: "MikroTik", model: "hAP ax3", location: "WISP Tower Site B, Outdoor Cabinet", contact: "wisp-ops@company.com" },
      { nasName: "DC2-HUAWEI-01", shortName: "dc2-huawei", nasType: "huawei", ipAddress: "10.0.2.2", ports: 48, secret: "huaw3iDc2!01", server: "10.0.2.254", community: "huaweiRO", description: "DC2 aggregation switch", status: "up", lastAlive: new Date("2024-03-25T14:27:00Z"), vendor: "Huawei", model: "S5735-L48T4X-A", location: "US-West Data Center 2, Rack D15", contact: "dc2-ops@company.com" },
      { nasName: "HQ-ARUBA-01", shortName: "hq-aruba", nasType: "aruba", ipAddress: "10.0.0.2", ports: 0, secret: "arub@HQ01!24", server: "10.0.0.254", community: "arubaRO", description: "HQ wireless controller", status: "up", lastAlive: new Date("2024-03-25T14:31:00Z"), vendor: "Aruba Networks", model: "Aruba 7205", location: "HQ Building, Floor 2, Server Room", contact: "wifi-admin@company.com" },
    ];
    await db.nas.createMany({ data: nasDevices });

    // =============================================
    // STEP 8: Create billing plans (8)
    // =============================================
    const plansData = [
      { name: "Enterprise Dedicated", description: "Dedicated enterprise fiber connection with SLA guarantees", planType: "flat-rate", billingCycle: "monthly", price: 499.99, currency: "USD", dataLimit: 0, timeLimit: 0, speedDown: 500000, speedUp: 500000, simultaneous: 5, priority: 10, status: "active", isActive: true, trialDays: 0, gracePeriodDays: 15 },
      { name: "Premium Business", description: "High-speed business plan with generous data allowances", planType: "flat-rate", billingCycle: "monthly", price: 149.99, currency: "USD", dataLimit: 0, timeLimit: 0, speedDown: 100000, speedUp: 50000, simultaneous: 3, priority: 8, status: "active", isActive: true, trialDays: 7, gracePeriodDays: 10 },
      { name: "Standard Office", description: "Standard business connectivity for offices", planType: "flat-rate", billingCycle: "monthly", price: 79.99, currency: "USD", dataLimit: 0, timeLimit: 0, speedDown: 50000, speedUp: 25000, simultaneous: 2, priority: 5, status: "active", isActive: true, trialDays: 7, gracePeriodDays: 7 },
      { name: "Pay As You Go - Data", description: "Pay per GB of data consumed", planType: "data-based", billingCycle: "monthly", price: 0, currency: "USD", dataLimit: 10240, timeLimit: 0, speedDown: 25000, speedUp: 10000, simultaneous: 1, priority: 3, status: "active", isActive: true, trialDays: 3, gracePeriodDays: 5 },
      { name: "Hotspot Hourly", description: "Hourly access for guest hotspots", planType: "time-based", billingCycle: "daily", price: 5.99, currency: "USD", dataLimit: 5120, timeLimit: 60, speedDown: 10240, speedUp: 5120, simultaneous: 1, priority: 2, status: "active", isActive: true, trialDays: 0, gracePeriodDays: 0 },
      { name: "Data + Time Hybrid", description: "Balanced hybrid plan with data and time limits", planType: "hybrid", billingCycle: "monthly", price: 39.99, currency: "USD", dataLimit: 51200, timeLimit: 43200, speedDown: 20000, speedUp: 10000, simultaneous: 1, priority: 4, status: "active", isActive: true, trialDays: 14, gracePeriodDays: 7 },
      { name: "Trial Starter", description: "Free trial plan for new users", planType: "data-based", billingCycle: "monthly", price: 0, currency: "USD", dataLimit: 2048, timeLimit: 720, speedDown: 20000, speedUp: 10000, simultaneous: 1, priority: 1, status: "active", isActive: true, trialDays: 14, gracePeriodDays: 0 },
      { name: "Annual Enterprise", description: "Annual commitment plan with volume discount", planType: "flat-rate", billingCycle: "yearly", price: 4999.99, currency: "USD", dataLimit: 0, timeLimit: 0, speedDown: 1000000, speedUp: 500000, simultaneous: 10, priority: 15, status: "active", isActive: true, trialDays: 30, gracePeriodDays: 30 },
    ];
    await db.plan.createMany({ data: plansData });

    // Fetch plans for referencing in subscriptions and invoices
    const plans = await db.plan.findMany();
    const planMap = new Map(plans.map((p) => [p.name, p.id]));

    // =============================================
    // STEP 9: Create policies with rules (5+)
    // =============================================
    const policies = await db.policy.createMany({
      data: [
        { name: "Enterprise Bandwidth Policy", description: "Bandwidth allocation rules for enterprise customers", type: "bandwidth", status: "active", priority: 10 },
        { name: "Business Hours Restriction", description: "Time-based access restrictions for guest users", type: "time", status: "active", priority: 5 },
        { name: "Data Cap Enforcement", description: "Monthly data usage limits by plan tier", type: "data", status: "active", priority: 8 },
        { name: "Network Access Control", description: "ACL-based access control for different user classes", type: "access", status: "active", priority: 9 },
        { name: "Security Firewall Policy", description: "Firewall rules to block malicious traffic patterns", type: "firewall", status: "active", priority: 15 },
      ],
    });

    const policyRows = await db.policy.findMany();
    const policyMap = new Map(policyRows.map((p) => [p.name, p.id]));

    await db.policyRule.createMany({
      data: [
        // Enterprise Bandwidth Policy rules
        { policyId: policyMap.get("Enterprise Bandwidth Policy")!, name: "VIP Download Limit", attribute: "Mikrotik-Rate-Limit", operator: "=", value: "500M/500M", description: "VIP users get symmetric 500Mbps", priority: 10 },
        { policyId: policyMap.get("Enterprise Bandwidth Policy")!, name: "Premium Download Limit", attribute: "Mikrotik-Rate-Limit", operator: "=", value: "100M/50M", description: "Premium users get 100/50Mbps", priority: 8 },
        { policyId: policyMap.get("Enterprise Bandwidth Policy")!, name: "Standard Download Limit", attribute: "Mikrotik-Rate-Limit", operator: "=", value: "50M/25M", description: "Standard users get 50/25Mbps", priority: 5 },
        { policyId: policyMap.get("Enterprise Bandwidth Policy")!, name: "Guest Throttle", attribute: "Mikrotik-Rate-Limit", operator: "=", value: "10M/5M", description: "Guest users are throttled to 10/5Mbps", priority: 2 },

        // Business Hours Restriction rules
        { policyId: policyMap.get("Business Hours Restriction")!, name: "Guest Weekday Access", attribute: "Login-Time", operator: ":=", value: "Wk0800-2200", description: "Guests can only connect on weekdays 8am-10pm", priority: 5 },
        { policyId: policyMap.get("Business Hours Restriction")!, name: "Guest Weekend Access", attribute: "Login-Time", operator: ":=", value: "Wk0900-1800", description: "Guests can only connect on weekends 9am-6pm", priority: 4 },
        { policyId: policyMap.get("Business Hours Restriction")!, name: "Session Duration Limit", attribute: "Session-Timeout", operator: ":=", value: "3600", description: "Max 1 hour per guest session", priority: 3 },

        // Data Cap Enforcement rules
        { policyId: policyMap.get("Data Cap Enforcement")!, name: "Monthly Data Cap 10GB", attribute: "ChilliSpot-Max-Total-Octets", operator: ":=", value: "10737418240", description: "10GB monthly data cap for standard users", priority: 5 },
        { policyId: policyMap.get("Data Cap Enforcement")!, name: "Monthly Data Cap 50GB", attribute: "ChilliSpot-Max-Total-Octets", operator: ":=", value: "53687091200", description: "50GB monthly data cap for premium users", priority: 8 },
        { policyId: policyMap.get("Data Cap Enforcement")!, name: "Monthly Data Cap Unlimited", attribute: "ChilliSpot-Max-Total-Octets", operator: ":=", value: "0", description: "No data cap for VIP and enterprise users", priority: 10 },

        // Network Access Control rules
        { policyId: policyMap.get("Network Access Control")!, name: "Allow Management VLAN", attribute: "Tunnel-Type", operator: ":=", value: "13", description: "Admin users can access management VLAN", priority: 10 },
        { policyId: policyMap.get("Network Access Control")!, name: "Restrict Guest VLAN", attribute: "Tunnel-Private-Group-ID", operator: ":=", value: "100", description: "Guest users assigned to VLAN 100", priority: 3 },
        { policyId: policyMap.get("Network Access Control")!, name: "Block Insecure Protocols", attribute: "Filter-Id", operator: ":=", value: "secure-only", description: "Apply security filter to all non-admin users", priority: 7 },

        // Security Firewall Policy rules
        { policyId: policyMap.get("Security Firewall Policy")!, name: "Block Known Bad IPs", attribute: "Framed-Filter-Id", operator: ":=", value: "block-malicious", description: "Block traffic to/from known malicious IPs", priority: 15 },
        { policyId: policyMap.get("Security Firewall Policy")!, name: "Rate Limit Auth Attempts", attribute: "CoovaChilli-Max-Total-Octets", operator: "<=", value: "1048576", description: "Limit authentication-related traffic", priority: 12 },
        { policyId: policyMap.get("Security Firewall Policy")!, name: "MAC Authentication Required", attribute: "Calling-Station-Id", operator: "!=", value: "", description: "Require valid MAC address for all connections", priority: 14 },
      ],
    });

    // Map plans to policies
    await db.planPolicyGroup.createMany({
      data: [
        { planId: planMap.get("Enterprise Dedicated")!, policyId: policyMap.get("Enterprise Bandwidth Policy")! },
        { planId: planMap.get("Premium Business")!, policyId: policyMap.get("Enterprise Bandwidth Policy")! },
        { planId: planMap.get("Standard Office")!, policyId: policyMap.get("Enterprise Bandwidth Policy")! },
        { planId: planMap.get("Pay As You Go - Data")!, policyId: policyMap.get("Data Cap Enforcement")! },
        { planId: planMap.get("Data + Time Hybrid")!, policyId: policyMap.get("Data Cap Enforcement")! },
        { planId: planMap.get("Data + Time Hybrid")!, policyId: policyMap.get("Business Hours Restriction")! },
        { planId: planMap.get("Hotspot Hourly")!, policyId: policyMap.get("Business Hours Restriction")! },
        { planId: planMap.get("Trial Starter")!, policyId: policyMap.get("Data Cap Enforcement")! },
        { planId: planMap.get("Enterprise Dedicated")!, policyId: policyMap.get("Security Firewall Policy")! },
        { planId: planMap.get("Annual Enterprise")!, policyId: policyMap.get("Security Firewall Policy")! },
        { planId: planMap.get("Standard Office")!, policyId: policyMap.get("Network Access Control")! },
      ],
    });

    // =============================================
    // STEP 10: Create subscriptions
    // =============================================
    const subsData = [
      // VIP users -> Enterprise Dedicated
      { username: "james.mitchell", planId: planMap.get("Enterprise Dedicated")!, status: "active", startDate: new Date("2024-01-01T00:00:00Z"), expiryDate: new Date("2024-12-31T23:59:59Z"), nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "sarah.chen", planId: planMap.get("Enterprise Dedicated")!, status: "active", startDate: new Date("2024-01-15T00:00:00Z"), expiryDate: new Date("2024-12-31T23:59:59Z"), nextBilling: new Date("2024-04-15T00:00:00Z"), autoRenew: true },
      { username: "michael.rodriguez", planId: planMap.get("Annual Enterprise")!, status: "active", startDate: new Date("2024-02-01T00:00:00Z"), expiryDate: new Date("2025-01-31T23:59:59Z"), nextBilling: new Date("2025-02-01T00:00:00Z"), autoRenew: true },

      // Premium users -> Premium Business
      { username: "emily.watson", planId: planMap.get("Premium Business")!, status: "active", startDate: new Date("2024-01-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "david.kim", planId: planMap.get("Premium Business")!, status: "active", startDate: new Date("2024-02-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "anna.petrova", planId: planMap.get("Premium Business")!, status: "active", startDate: new Date("2023-11-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "robert.taylor", planId: planMap.get("Premium Business")!, status: "active", startDate: new Date("2024-03-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "lisa.nakamura", planId: planMap.get("Premium Business")!, status: "active", startDate: new Date("2024-01-10T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-10T00:00:00Z"), autoRenew: true },

      // Standard users -> Standard Office
      { username: "john.smith", planId: planMap.get("Standard Office")!, status: "active", startDate: new Date("2024-01-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "maria.garcia", planId: planMap.get("Standard Office")!, status: "active", startDate: new Date("2023-10-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "ahmed.hassan", planId: planMap.get("Standard Office")!, status: "active", startDate: new Date("2024-02-15T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-15T00:00:00Z"), autoRenew: true },
      { username: "claire.dubois", planId: planMap.get("Standard Office")!, status: "active", startDate: new Date("2024-01-20T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-20T00:00:00Z"), autoRenew: true },
      { username: "thomas.andersen", planId: planMap.get("Data + Time Hybrid")!, status: "active", startDate: new Date("2024-03-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "priya.sharma", planId: planMap.get("Data + Time Hybrid")!, status: "active", startDate: new Date("2024-02-01T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-01T00:00:00Z"), autoRenew: true },
      { username: "kevin.obrien", planId: planMap.get("Standard Office")!, status: "active", startDate: new Date("2024-01-05T00:00:00Z"), expiryDate: null, nextBilling: new Date("2024-04-05T00:00:00Z"), autoRenew: true },

      // Trial users -> Trial Starter
      { username: "trial.jones", planId: planMap.get("Trial Starter")!, status: "active", startDate: new Date("2024-03-15T00:00:00Z"), expiryDate: new Date("2024-04-14T23:59:59Z"), nextBilling: null, autoRenew: false },
      { username: "trial.martinez", planId: planMap.get("Trial Starter")!, status: "active", startDate: new Date("2024-03-20T00:00:00Z"), expiryDate: new Date("2024-04-19T23:59:59Z"), nextBilling: null, autoRenew: false },
      { username: "trial.mueller", planId: planMap.get("Trial Starter")!, status: "expired", startDate: new Date("2024-02-01T00:00:00Z"), expiryDate: new Date("2024-02-28T23:59:59Z"), nextBilling: null, autoRenew: false },
    ];
    await db.subscription.createMany({ data: subsData });

    // Fetch subscriptions for referencing in invoices
    const subs = await db.subscription.findMany();
    const subMap = new Map(subs.map((s) => [s.username, s.id]));

    // =============================================
    // STEP 11: Create invoices (mix of paid, pending, overdue)
    // =============================================
    const invoicesData = [
      // Paid invoices (past months)
      { invoiceNo: "INV-2024-001", username: "james.mitchell", planId: planMap.get("Enterprise Dedicated")!, subscriptionId: subMap.get("james.mitchell"), amount: 499.99, tax: 49.99, total: 549.98, status: "paid", dueDate: new Date("2024-02-01T00:00:00Z"), paidDate: new Date("2024-01-28T10:30:00Z"), notes: "January billing - Enterprise Dedicated" },
      { invoiceNo: "INV-2024-002", username: "james.mitchell", planId: planMap.get("Enterprise Dedicated")!, subscriptionId: subMap.get("james.mitchell"), amount: 499.99, tax: 49.99, total: 549.98, status: "paid", dueDate: new Date("2024-03-01T00:00:00Z"), paidDate: new Date("2024-02-27T14:15:00Z"), notes: "February billing - Enterprise Dedicated" },
      { invoiceNo: "INV-2024-003", username: "sarah.chen", planId: planMap.get("Enterprise Dedicated")!, subscriptionId: subMap.get("sarah.chen"), amount: 499.99, tax: 49.99, total: 549.98, status: "paid", dueDate: new Date("2024-02-15T00:00:00Z"), paidDate: new Date("2024-02-10T09:00:00Z"), notes: "January pro-rated billing" },
      { invoiceNo: "INV-2024-004", username: "emily.watson", planId: planMap.get("Premium Business")!, subscriptionId: subMap.get("emily.watson"), amount: 149.99, tax: 15.00, total: 164.99, status: "paid", dueDate: new Date("2024-02-01T00:00:00Z"), paidDate: new Date("2024-01-30T08:45:00Z"), notes: "January billing - Premium Business" },
      { invoiceNo: "INV-2024-005", username: "emily.watson", planId: planMap.get("Premium Business")!, subscriptionId: subMap.get("emily.watson"), amount: 149.99, tax: 15.00, total: 164.99, status: "paid", dueDate: new Date("2024-03-01T00:00:00Z"), paidDate: new Date("2024-02-28T16:20:00Z"), notes: "February billing - Premium Business" },
      { invoiceNo: "INV-2024-006", username: "john.smith", planId: planMap.get("Standard Office")!, subscriptionId: subMap.get("john.smith"), amount: 79.99, tax: 8.00, total: 87.99, status: "paid", dueDate: new Date("2024-02-01T00:00:00Z"), paidDate: new Date("2024-01-31T11:00:00Z"), notes: "January billing - Standard Office" },
      { invoiceNo: "INV-2024-007", username: "maria.garcia", planId: planMap.get("Standard Office")!, subscriptionId: subMap.get("maria.garcia"), amount: 79.99, tax: 8.00, total: 87.99, status: "paid", dueDate: new Date("2024-02-01T00:00:00Z"), paidDate: new Date("2024-02-01T09:30:00Z"), notes: "January billing - Standard Office" },

      // Pending invoices (current month)
      { invoiceNo: "INV-2024-008", username: "james.mitchell", planId: planMap.get("Enterprise Dedicated")!, subscriptionId: subMap.get("james.mitchell"), amount: 499.99, tax: 49.99, total: 549.98, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Enterprise Dedicated" },
      { invoiceNo: "INV-2024-009", username: "sarah.chen", planId: planMap.get("Enterprise Dedicated")!, subscriptionId: subMap.get("sarah.chen"), amount: 499.99, tax: 49.99, total: 549.98, status: "pending", dueDate: new Date("2024-04-15T00:00:00Z"), paidDate: null, notes: "March billing - Enterprise Dedicated" },
      { invoiceNo: "INV-2024-010", username: "emily.watson", planId: planMap.get("Premium Business")!, subscriptionId: subMap.get("emily.watson"), amount: 149.99, tax: 15.00, total: 164.99, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Premium Business" },
      { invoiceNo: "INV-2024-011", username: "david.kim", planId: planMap.get("Premium Business")!, subscriptionId: subMap.get("david.kim"), amount: 149.99, tax: 15.00, total: 164.99, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Premium Business" },
      { invoiceNo: "INV-2024-012", username: "anna.petrova", planId: planMap.get("Premium Business")!, subscriptionId: subMap.get("anna.petrova"), amount: 149.99, tax: 15.00, total: 164.99, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Premium Business" },
      { invoiceNo: "INV-2024-013", username: "john.smith", planId: planMap.get("Standard Office")!, subscriptionId: subMap.get("john.smith"), amount: 79.99, tax: 8.00, total: 87.99, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Standard Office" },
      { invoiceNo: "INV-2024-014", username: "maria.garcia", planId: planMap.get("Standard Office")!, subscriptionId: subMap.get("maria.garcia"), amount: 79.99, tax: 8.00, total: 87.99, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Standard Office" },
      { invoiceNo: "INV-2024-015", username: "ahmed.hassan", planId: planMap.get("Standard Office")!, subscriptionId: subMap.get("ahmed.hassan"), amount: 79.99, tax: 8.00, total: 87.99, status: "pending", dueDate: new Date("2024-04-15T00:00:00Z"), paidDate: null, notes: "March pro-rated billing - Standard Office" },
      { invoiceNo: "INV-2024-016", username: "thomas.andersen", planId: planMap.get("Data + Time Hybrid")!, subscriptionId: subMap.get("thomas.andersen"), amount: 39.99, tax: 4.00, total: 43.99, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Data + Time Hybrid" },
      { invoiceNo: "INV-2024-017", username: "priya.sharma", planId: planMap.get("Data + Time Hybrid")!, subscriptionId: subMap.get("priya.sharma"), amount: 39.99, tax: 4.00, total: 43.99, status: "pending", dueDate: new Date("2024-04-01T00:00:00Z"), paidDate: null, notes: "March billing - Data + Time Hybrid" },
      { invoiceNo: "INV-2024-018", username: "michael.rodriguez", planId: planMap.get("Annual Enterprise")!, subscriptionId: subMap.get("michael.rodriguez"), amount: 4999.99, tax: 500.00, total: 5499.99, status: "paid", dueDate: new Date("2024-02-01T00:00:00Z"), paidDate: new Date("2024-01-25T10:00:00Z"), notes: "Annual Enterprise - Full year payment" },

      // Overdue invoices
      { invoiceNo: "INV-2024-019", username: "robert.taylor", planId: planMap.get("Premium Business")!, subscriptionId: subMap.get("robert.taylor"), amount: 149.99, tax: 15.00, total: 164.99, status: "overdue", dueDate: new Date("2024-03-01T00:00:00Z"), paidDate: null, notes: "February billing - OVERDUE - 2nd reminder sent" },
      { invoiceNo: "INV-2024-020", username: "claire.dubois", planId: planMap.get("Standard Office")!, subscriptionId: subMap.get("claire.dubois"), amount: 79.99, tax: 8.00, total: 87.99, status: "overdue", dueDate: new Date("2024-03-20T00:00:00Z"), paidDate: null, notes: "February pro-rated billing - OVERDUE" },
      { invoiceNo: "INV-2024-021", username: "lisa.nakamura", planId: planMap.get("Premium Business")!, subscriptionId: subMap.get("lisa.nakamura"), amount: 149.99, tax: 15.00, total: 164.99, status: "overdue", dueDate: new Date("2024-03-10T00:00:00Z"), paidDate: null, notes: "February billing - OVERDUE - support ticket #4521" },

      // Cancelled invoice
      { invoiceNo: "INV-2024-022", username: "trial.mueller", planId: planMap.get("Trial Starter")!, subscriptionId: subMap.get("trial.mueller"), amount: 0, tax: 0, total: 0, status: "cancelled", dueDate: new Date("2024-03-01T00:00:00Z"), paidDate: null, notes: "Trial cancelled - user did not convert" },
    ];
    await db.invoice.createMany({ data: invoicesData });

    // Fetch invoices for referencing in payments
    const invoices = await db.invoice.findMany();
    const invoiceMap = new Map(invoices.map((i) => [i.invoiceNo, i.id]));

    // =============================================
    // STEP 12: Create payments
    // =============================================
    await db.payment.createMany({
      data: [
        { paymentNo: "PAY-2024-001", username: "james.mitchell", invoiceId: invoiceMap.get("INV-2024-001")!, amount: 549.98, method: "bank_transfer", gateway: "SWIFT", transactionId: "TXN-SWIFT-20240128-001", status: "completed", paidAt: new Date("2024-01-28T10:30:00Z") },
        { paymentNo: "PAY-2024-002", username: "james.mitchell", invoiceId: invoiceMap.get("INV-2024-002")!, amount: 549.98, method: "bank_transfer", gateway: "SWIFT", transactionId: "TXN-SWIFT-20240227-002", status: "completed", paidAt: new Date("2024-02-27T14:15:00Z") },
        { paymentNo: "PAY-2024-003", username: "sarah.chen", invoiceId: invoiceMap.get("INV-2024-003")!, amount: 549.98, method: "card", gateway: "Stripe", transactionId: "TXN-STR-20240210-003", status: "completed", paidAt: new Date("2024-02-10T09:00:00Z") },
        { paymentNo: "PAY-2024-004", username: "emily.watson", invoiceId: invoiceMap.get("INV-2024-004")!, amount: 164.99, method: "card", gateway: "Stripe", transactionId: "TXN-STR-20240130-004", status: "completed", paidAt: new Date("2024-01-30T08:45:00Z") },
        { paymentNo: "PAY-2024-005", username: "emily.watson", invoiceId: invoiceMap.get("INV-2024-005")!, amount: 164.99, method: "card", gateway: "Stripe", transactionId: "TXN-STR-20240228-005", status: "completed", paidAt: new Date("2024-02-28T16:20:00Z") },
        { paymentNo: "PAY-2024-006", username: "john.smith", invoiceId: invoiceMap.get("INV-2024-006")!, amount: 87.99, method: "online", gateway: "PayPal", transactionId: "TXN-PPL-20240131-006", status: "completed", paidAt: new Date("2024-01-31T11:00:00Z") },
        { paymentNo: "PAY-2024-007", username: "maria.garcia", invoiceId: invoiceMap.get("INV-2024-007")!, amount: 87.99, method: "online", gateway: "PayPal", transactionId: "TXN-PPL-20240201-007", status: "completed", paidAt: new Date("2024-02-01T09:30:00Z") },
        { paymentNo: "PAY-2024-008", username: "michael.rodriguez", invoiceId: invoiceMap.get("INV-2024-018")!, amount: 5499.99, method: "bank_transfer", gateway: "Wire Transfer", transactionId: "TXN-WIRE-20240125-008", status: "completed", paidAt: new Date("2024-01-25T10:00:00Z") },
        { paymentNo: "PAY-2024-009", username: "robert.taylor", invoiceId: invoiceMap.get("INV-2024-019")!, amount: 164.99, method: "card", gateway: "Stripe", transactionId: "TXN-STR-20240215-009", status: "failed", paidAt: new Date("2024-02-15T13:00:00Z") },
      ],
    });

    // =============================================
    // STEP 13: Create accounting sessions (active + completed)
    // =============================================
    await db.radAcct.createMany({
      data: [
        // Active sessions
        {
          sessionId: "sess-2024-0301-001", username: "james.mitchell", nasIpAddress: "10.0.1.1", nasPortId: "GigabitEthernet1/0/1", nasPortType: "Ethernet",
          acctSessionId: "5a3f2b1c-8e4d-4a6b-9c7d-2e1f3a4b5c6d", acctStartTime: new Date("2024-03-25T08:30:00Z"), acctStopTime: null,
          acctSessionTime: 21600, acctAuthentic: "RADIUS", acctInputOctets: 524288000, acctOutputOctets: 314572800,
          acctInputPackets: 327680, acctOutputPackets: 196608, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "DC1-CORE-01", callingStationId: "AA:BB:CC:11:22:33", connectInfo: "500 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.1.100", framedNetmask: "255.255.255.0", assignIpType: "static",
          nasId: "DC1-CORE-01", nasPort: 1, serviceType: "Framed-User", terminateCause: null, updateCount: 12,
          status: "active",
        },
        {
          sessionId: "sess-2024-0301-002", username: "sarah.chen", nasIpAddress: "10.0.0.1", nasPortId: "ge-0/0/1", nasPortType: "Ethernet",
          acctSessionId: "7b4e3c2d-9f5e-4b7c-ad8e-3f2a4b5c6d7e", acctStartTime: new Date("2024-03-25T09:15:00Z"), acctStopTime: null,
          acctSessionTime: 18900, acctAuthentic: "RADIUS", acctInputOctets: 209715200, acctOutputOctets: 104857600,
          acctInputPackets: 163840, acctOutputPackets: 81920, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "HQ-CORE-JN-01", callingStationId: "DD:EE:FF:44:55:66", connectInfo: "1 Gbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.2.50", framedNetmask: "255.255.255.0", assignIpType: "static",
          nasId: "HQ-CORE-JN-01", nasPort: 1, serviceType: "Framed-User", terminateCause: null, updateCount: 9,
          status: "active",
        },
        {
          sessionId: "sess-2024-0301-003", username: "david.kim", nasIpAddress: "192.168.10.1", nasPortId: "GigabitEthernet0/0/0.100", nasPortType: "VLAN",
          acctSessionId: "8c5f4d3e-a06f-4c8d-be9f-4a3b5c6d7e8f", acctStartTime: new Date("2024-03-25T10:00:00Z"), acctStopTime: null,
          acctSessionTime: 16200, acctAuthentic: "RADIUS", acctInputOctets: 83886080, acctOutputOctets: 41943040,
          acctInputPackets: 98304, acctOutputPackets: 49152, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "BRANCH-NY-01", callingStationId: "11:22:33:AA:BB:CC", connectInfo: "100 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "172.16.10.25", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "BRANCH-NY-01", nasPort: 100, serviceType: "Framed-User", terminateCause: null, updateCount: 7,
          status: "active",
        },
        {
          sessionId: "sess-2024-0301-004", username: "admin.root", nasIpAddress: "10.0.0.1", nasPortId: "ge-0/0/0", nasPortType: "Ethernet",
          acctSessionId: "9d6e5f4f-b170-4d9e-cf0a-5b4c6d7e8f9a", acctStartTime: new Date("2024-03-25T07:00:00Z"), acctStopTime: null,
          acctSessionTime: 27000, acctAuthentic: "Local", acctInputOctets: 104857600, acctOutputOctets: 52428800,
          acctInputPackets: 131072, acctOutputPackets: 65536, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "HQ-CORE-JN-01", callingStationId: "00:11:22:33:44:55", connectInfo: "1 Gbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.0.1", framedNetmask: "255.255.255.0", assignIpType: "static",
          nasId: "HQ-CORE-JN-01", nasPort: 0, serviceType: "Administrative-User", terminateCause: null, updateCount: 15,
          status: "active",
        },
        {
          sessionId: "sess-2024-0301-005", username: "john.smith", nasIpAddress: "10.0.0.2", nasPortId: "wlan0", nasPortType: "Wireless-802.11",
          acctSessionId: "ae7f6050-c281-4eaf-d01b-6c5d7e8f9a0b", acctStartTime: new Date("2024-03-25T11:30:00Z"), acctStopTime: null,
          acctSessionTime: 10800, acctAuthentic: "RADIUS", acctInputOctets: 31457280, acctOutputOctets: 15728640,
          acctInputPackets: 40960, acctOutputPackets: 20480, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "HQ-ARUBA-01", callingStationId: "66:77:88:99:AA:BB", connectInfo: "WiFi 6 - 50 Mbps",
          framedProtocol: "PPP", framedIpAddress: "10.10.5.120", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "HQ-ARUBA-01", nasPort: 0, serviceType: "Framed-User", terminateCause: null, updateCount: 4,
          status: "active",
        },

        // Completed sessions
        {
          sessionId: "sess-2024-0225-001", username: "emily.watson", nasIpAddress: "10.0.1.1", nasPortId: "GigabitEthernet1/0/5", nasPortType: "Ethernet",
          acctSessionId: "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d", acctStartTime: new Date("2024-03-25T06:00:00Z"), acctStopTime: new Date("2024-03-25T08:00:00Z"),
          acctSessionTime: 7200, acctAuthentic: "RADIUS", acctInputOctets: 104857600, acctOutputOctets: 52428800,
          acctInputPackets: 81920, acctOutputPackets: 40960, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "DC1-CORE-01", callingStationId: "22:33:44:55:66:77", connectInfo: "100 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.1.55", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "DC1-CORE-01", nasPort: 5, serviceType: "Framed-User", terminateCause: "User-Request", updateCount: 6,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0225-002", username: "michael.rodriguez", nasIpAddress: "10.0.2.1", nasPortId: "GigabitEthernet1/0/10", nasPortType: "Ethernet",
          acctSessionId: "2b3c4d5e-6f7a-4b8c-9d0e-1f2a3b4c5d6e", acctStartTime: new Date("2024-03-24T09:00:00Z"), acctStopTime: new Date("2024-03-24T17:00:00Z"),
          acctSessionTime: 28800, acctAuthentic: "RADIUS", acctInputOctets: 2147483648, acctOutputOctets: 1073741824,
          acctInputPackets: 1310720, acctOutputPackets: 655360, acctInputGigawords: 1, acctOutputGigawords: 0,
          calledStationId: "DC2-CORE-01", callingStationId: "33:44:55:66:77:88", connectInfo: "1 Gbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.3.10", framedNetmask: "255.255.255.0", assignIpType: "static",
          nasId: "DC2-CORE-01", nasPort: 10, serviceType: "VoIP-User", terminateCause: "Admin-Reset", updateCount: 20,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0225-003", username: "maria.garcia", nasIpAddress: "192.168.50.1", nasPortId: "ether1", nasPortType: "Ethernet",
          acctSessionId: "3c4d5e6f-7a8b-4c9d-ae0f-2a3b4c5d6e7f", acctStartTime: new Date("2024-03-24T10:00:00Z"), acctStopTime: new Date("2024-03-24T14:30:00Z"),
          acctSessionTime: 16200, acctAuthentic: "RADIUS", acctInputOctets: 41943040, acctOutputOctets: 20971520,
          acctInputPackets: 49152, acctOutputPackets: 24576, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "SITE-MIKRO-01", callingStationId: "44:55:66:77:88:99", connectInfo: "50 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "192.168.50.100", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "SITE-MIKRO-01", nasPort: 1, serviceType: "Framed-User", terminateCause: "Session-Timeout", updateCount: 10,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0225-004", username: "anna.petrova", nasIpAddress: "10.0.1.2", nasPortId: "ge-0/0/5", nasPortType: "Ethernet",
          acctSessionId: "4d5e6f7a-8b9c-4dae-bf10-3b4c5d6e7f80", acctStartTime: new Date("2024-03-25T07:30:00Z"), acctStopTime: new Date("2024-03-25T10:45:00Z"),
          acctSessionTime: 11700, acctAuthentic: "RADIUS", acctInputOctets: 73400320, acctOutputOctets: 36700160,
          acctInputPackets: 57344, acctOutputPackets: 28672, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "DC1-EDGE-JN-01", callingStationId: "55:66:77:88:99:AA", connectInfo: "100 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.4.30", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "DC1-EDGE-JN-01", nasPort: 5, serviceType: "Framed-User", terminateCause: "User-Request", updateCount: 8,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0224-001", username: "thomas.andersen", nasIpAddress: "10.0.2.2", nasPortId: "GigabitEthernet0/0/1", nasPortType: "Ethernet",
          acctSessionId: "5e6f7a8b-9c0d-4ebf-c021-4c5d6e7f8091", acctStartTime: new Date("2024-03-24T08:00:00Z"), acctStopTime: new Date("2024-03-24T12:00:00Z"),
          acctSessionTime: 14400, acctAuthentic: "RADIUS", acctInputOctets: 52428800, acctOutputOctets: 26214400,
          acctInputPackets: 45056, acctOutputPackets: 22528, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "DC2-HUAWEI-01", callingStationId: "AA:11:BB:22:CC:33", connectInfo: "50 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.6.15", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "DC2-HUAWEI-01", nasPort: 1, serviceType: "Framed-User", terminateCause: "Idle-Timeout", updateCount: 9,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0224-002", username: "guest.reception", nasIpAddress: "10.0.0.2", nasPortId: "wlan1", nasPortType: "Wireless-802.11",
          acctSessionId: "6f7a8b9c-0d1e-4fc0-d132-5d6e7f8091a2", acctStartTime: new Date("2024-03-24T09:00:00Z"), acctStopTime: new Date("2024-03-24T10:00:00Z"),
          acctSessionTime: 3600, acctAuthentic: "RADIUS", acctInputOctets: 10485760, acctOutputOctets: 5242880,
          acctInputPackets: 16384, acctOutputPackets: 8192, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "HQ-ARUBA-01", callingStationId: "DD:EE:11:22:33:44", connectInfo: "WiFi 5 - 10 Mbps",
          framedProtocol: "PPP", framedIpAddress: "10.10.5.200", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "HQ-ARUBA-01", nasPort: 1, serviceType: "Framed-User", terminateCause: "Session-Timeout", updateCount: 4,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0223-001", username: "priya.sharma", nasIpAddress: "192.168.60.1", nasPortId: "wlan2", nasPortType: "Wireless-802.11",
          acctSessionId: "7a8b9c0d-1e2f-4ad1-e243-6e7f8091a2b3", acctStartTime: new Date("2024-03-23T14:00:00Z"), acctStopTime: new Date("2024-03-23T16:30:00Z"),
          acctSessionTime: 9000, acctAuthentic: "RADIUS", acctInputOctets: 31457280, acctOutputOctets: 15728640,
          acctInputPackets: 24576, acctOutputPackets: 12288, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "WISP-MIKRO-02", callingStationId: "EE:FF:00:11:22:33", connectInfo: "WiFi 5 - 20 Mbps",
          framedProtocol: "PPP", framedIpAddress: "192.168.60.50", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "WISP-MIKRO-02", nasPort: 2, serviceType: "Framed-User", terminateCause: "User-Request", updateCount: 6,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0222-001", username: "kevin.obrien", nasIpAddress: "192.168.10.1", nasPortId: "GigabitEthernet0/0/0.200", nasPortType: "VLAN",
          acctSessionId: "8b9c0d1e-2f3a-4be2-f354-7f8091a2b3c4", acctStartTime: new Date("2024-03-22T09:00:00Z"), acctStopTime: new Date("2024-03-22T17:00:00Z"),
          acctSessionTime: 28800, acctAuthentic: "RADIUS", acctInputOctets: 62914560, acctOutputOctets: 31457280,
          acctInputPackets: 49152, acctOutputPackets: 24576, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "BRANCH-NY-01", callingStationId: "FF:00:11:22:33:44", connectInfo: "50 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "172.16.10.80", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "BRANCH-NY-01", nasPort: 200, serviceType: "Framed-User", terminateCause: "Admin-Reset", updateCount: 16,
          status: "stopped",
        },
        {
          sessionId: "sess-2024-0220-001", username: "robert.taylor", nasIpAddress: "10.0.0.1", nasPortId: "ge-0/0/10", nasPortType: "Ethernet",
          acctSessionId: "9c0d1e2f-3a4b-4cf3-0465-8091a2b3c4d5", acctStartTime: new Date("2024-03-20T10:00:00Z"), acctStopTime: new Date("2024-03-20T15:00:00Z"),
          acctSessionTime: 18000, acctAuthentic: "RADIUS", acctInputOctets: 94371840, acctOutputOctets: 47185920,
          acctInputPackets: 73728, acctOutputPackets: 36864, acctInputGigawords: 0, acctOutputGigawords: 0,
          calledStationId: "HQ-CORE-JN-01", callingStationId: "00:AA:BB:CC:DD:EE", connectInfo: "100 Mbps Full Duplex",
          framedProtocol: "PPP", framedIpAddress: "10.10.7.40", framedNetmask: "255.255.255.0", assignIpType: "dynamic",
          nasId: "HQ-CORE-JN-01", nasPort: 10, serviceType: "Framed-User", terminateCause: "User-Request", updateCount: 12,
          status: "stopped",
        },
      ],
    });

    // =============================================
    // STEP 14: Create post-auth records
    // =============================================
    await db.radPostAuth.createMany({
      data: [
        { username: "james.mitchell", pass: "SecureP@ss2024!", reply: "Access-Accept", authType: "MS-CHAPv2", clientIp: "10.0.1.1", calledStationId: "DC1-CORE-01", callingStationId: "AA:BB:CC:11:22:33", timestamp: new Date("2024-03-25T08:30:00Z") },
        { username: "sarah.chen", pass: "Ch3nSecur3!", reply: "Access-Accept", authType: "MS-CHAPv2", clientIp: "10.0.0.1", calledStationId: "HQ-CORE-JN-01", callingStationId: "DD:EE:FF:44:55:66", timestamp: new Date("2024-03-25T09:15:00Z") },
        { username: "david.kim", pass: "D@vidK!m24", reply: "Access-Accept", authType: "MS-CHAPv2", clientIp: "192.168.10.1", calledStationId: "BRANCH-NY-01", callingStationId: "11:22:33:AA:BB:CC", timestamp: new Date("2024-03-25T10:00:00Z") },
        { username: "admin.root", pass: "Adm1nR00t!", reply: "Access-Accept", authType: "MS-CHAPv2", clientIp: "10.0.0.1", calledStationId: "HQ-CORE-JN-01", callingStationId: "00:11:22:33:44:55", timestamp: new Date("2024-03-25T07:00:00Z") },
        { username: "john.smith", pass: "J0hnS!2024", reply: "Access-Accept", authType: "PAP", clientIp: "10.0.0.2", calledStationId: "HQ-ARUBA-01", callingStationId: "66:77:88:99:AA:BB", timestamp: new Date("2024-03-25T11:30:00Z") },
        { username: "emily.watson", pass: "W@tsonE2024", reply: "Access-Accept", authType: "MS-CHAPv2", clientIp: "10.0.1.1", calledStationId: "DC1-CORE-01", callingStationId: "22:33:44:55:66:77", timestamp: new Date("2024-03-25T06:00:00Z") },
        { username: "michael.rodriguez", pass: "M!k3yR2024", reply: "Access-Accept", authType: "EAP", clientIp: "10.0.2.1", calledStationId: "DC2-CORE-01", callingStationId: "33:44:55:66:77:88", timestamp: new Date("2024-03-24T09:00:00Z") },
        { username: "maria.garcia", pass: "G@rc1aM24!", reply: "Access-Accept", authType: "PAP", clientIp: "192.168.50.1", calledStationId: "SITE-MIKRO-01", callingStationId: "44:55:66:77:88:99", timestamp: new Date("2024-03-24T10:00:00Z") },
        { username: "unknown.user", pass: "wrongpass", reply: "Access-Reject", authType: "PAP", clientIp: "10.0.1.1", calledStationId: "DC1-CORE-01", callingStationId: "99:AA:BB:CC:DD:EE", timestamp: new Date("2024-03-25T12:00:00Z") },
        { username: "guest.reception", pass: "wrong", reply: "Access-Reject", authType: "PAP", clientIp: "10.0.0.2", calledStationId: "HQ-ARUBA-01", callingStationId: "AA:BB:CC:DD:EE:FF", timestamp: new Date("2024-03-25T11:00:00Z") },
      ],
    });

    // =============================================
    // STEP 15: Create vendor entries with attributes
    // =============================================
    const vendors = await db.vendor.createMany({
      data: [
        { name: "Cisco Systems", shortName: "Cisco", description: "Cisco Systems, Inc. - Enterprise networking equipment vendor" },
        { name: "Juniper Networks", shortName: "Juniper", description: "Juniper Networks, Inc. - High-performance network infrastructure" },
        { name: "MikroTik", shortName: "MikroTik", description: "MikroTikls SIA - RouterOS based networking equipment" },
        { name: "Huawei", shortName: "Huawei", description: "Huawei Technologies Co., Ltd. - Global ICT infrastructure provider" },
        { name: "Aruba Networks", shortName: "Aruba", description: "Aruba Networks (HPE) - Wireless and edge networking solutions" },
      ],
    });

    const vendorRows = await db.vendor.findMany();
    const vendorMap = new Map(vendorRows.map((v) => [v.name, v.id]));

    await db.vendorAttribute.createMany({
      data: [
        // Cisco attributes
        { vendorId: vendorMap.get("Cisco Systems")!, name: "Cisco-AVPair", oid: "1.3.6.1.4.1.9.1.1", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Cisco Systems")!, name: "Cisco-NAS-Port", oid: "1.3.6.1.4.1.9.1.2", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Cisco Systems")!, name: "h323-return-code", oid: "1.3.6.1.4.1.9.1.3", type: "integer", flags: "", value: "" },
        { vendorId: vendorMap.get("Cisco Systems")!, name: "Cisco-Multilink-ID", oid: "1.3.6.1.4.1.9.1.4", type: "integer", flags: "", value: "" },

        // Juniper attributes
        { vendorId: vendorMap.get("Juniper Networks")!, name: "Juniper-Local-User-Name", oid: "2636.1.1.1.1", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Juniper Networks")!, name: "Juniper-Allow-Interfaces", oid: "2636.1.1.1.2", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Juniper Networks")!, name: "Juniper-Deny-Interfaces", oid: "2636.1.1.1.3", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Juniper Networks")!, name: "Juniper-Interface-Description", oid: "2636.1.1.1.4", type: "string", flags: "", value: "" },

        // MikroTik attributes
        { vendorId: vendorMap.get("MikroTik")!, name: "Mikrotik-Rate-Limit", oid: "14988.1", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("MikroTik")!, name: "Mikrotik-Recv-Limit", oid: "14988.2", type: "integer", flags: "", value: "" },
        { vendorId: vendorMap.get("MikroTik")!, name: "Mikrotik-Xmit-Limit", oid: "14988.3", type: "integer", flags: "", value: "" },
        { vendorId: vendorMap.get("MikroTik")!, name: "Mikrotik-Group-Key", oid: "14988.4", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("MikroTik")!, name: "Mikrotik-Wireless-Forward", oid: "14988.5", type: "integer", flags: "", value: "" },

        // Huawei attributes
        { vendorId: vendorMap.get("Huawei")!, name: "Huawei-Input-Octets-Gigawords", oid: "2011.1", type: "integer", flags: "", value: "" },
        { vendorId: vendorMap.get("Huawei")!, name: "Huawei-Output-Octets-Gigawords", oid: "2011.2", type: "integer", flags: "", value: "" },
        { vendorId: vendorMap.get("Huawei")!, name: "Huawei-Input-Packets-Gigawords", oid: "2011.3", type: "integer", flags: "", value: "" },
        { vendorId: vendorMap.get("Huawei")!, name: "Huawei-IPv6-Input-Octets", oid: "2011.4", type: "integer", flags: "", value: "" },

        // Aruba attributes
        { vendorId: vendorMap.get("Aruba Networks")!, name: "Aruba-User-Role", oid: "14823.1", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Aruba Networks")!, name: "Aruba-AP-Group", oid: "14823.2", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Aruba Networks")!, name: "Aruba-Port-Role", oid: "14823.3", type: "string", flags: "", value: "" },
        { vendorId: vendorMap.get("Aruba Networks")!, name: "Aruba-VLAN", oid: "14823.4", type: "integer", flags: "", value: "" },
        { vendorId: vendorMap.get("Aruba Networks")!, name: "Aruba-Essid-Name", oid: "14823.5", type: "string", flags: "", value: "" },
      ],
    });

    // =============================================
    // STEP 16: Create system settings
    // =============================================
    await db.systemSetting.createMany({
      data: [
        // General settings
        { key: "system.name", value: "FreeRADIUS AAA Manager", type: "string", group: "general", description: "System display name" },
        { key: "system.version", value: "1.0.0", type: "string", group: "general", description: "Application version" },
        { key: "system.locale", value: "en-US", type: "string", group: "general", description: "Default locale" },
        { key: "system.timezone", value: "UTC", type: "string", group: "general", description: "System timezone" },
        { key: "system.maintenance_mode", value: "false", type: "boolean", group: "general", description: "Enable maintenance mode" },

        // RADIUS settings
        { key: "radius.auth.port", value: "1812", type: "number", group: "radius", description: "RADIUS authentication port" },
        { key: "radius.acct.port", value: "1813", type: "number", group: "radius", description: "RADIUS accounting port" },
        { key: "radius.secret", value: "r@d1usS3cr3t!", type: "string", group: "radius", description: "Default RADIUS shared secret" },
        { key: "radius.max_retries", value: "3", type: "number", group: "radius", description: "Max authentication retries" },
        { key: "radius.timeout", value: "30", type: "number", group: "radius", description: "Request timeout in seconds" },
        { key: "radius.coa_enabled", value: "true", type: "boolean", group: "radius", description: "Enable Change of Authorization" },
        { key: "radius.coa.port", value: "3799", type: "number", group: "radius", description: "CoA/Disconnect port" },

        // Billing settings
        { key: "billing.currency", value: "USD", type: "string", group: "billing", description: "Default billing currency" },
        { key: "billing.tax_rate", value: "0.10", type: "number", group: "billing", description: "Default tax rate (10%)" },
        { key: "billing.invoice_prefix", value: "INV", type: "string", group: "billing", description: "Invoice number prefix" },
        { key: "billing.payment_methods", value: '["cash","card","bank_transfer","online","wallet"]', type: "json", group: "billing", description: "Available payment methods" },
        { key: "billing.auto_invoice", value: "true", type: "boolean", group: "billing", description: "Auto-generate invoices" },
        { key: "billing.overdue_days", value: "30", type: "number", group: "billing", description: "Days before invoice marked overdue" },

        // Email settings
        { key: "email.smtp_host", value: "smtp.company.com", type: "string", group: "email", description: "SMTP server hostname" },
        { key: "email.smtp_port", value: "587", type: "number", group: "email", description: "SMTP server port" },
        { key: "email.smtp_tls", value: "true", type: "boolean", group: "email", description: "Enable TLS for SMTP" },
        { key: "email.from_address", value: "noreply@radius.company.com", type: "string", group: "email", description: "Sender email address" },
        { key: "email.invoice_notify", value: "true", type: "boolean", group: "email", description: "Send invoice notifications" },

        // SMS settings
        { key: "sms.enabled", value: "false", type: "boolean", group: "sms", description: "Enable SMS notifications" },
        { key: "sms.provider", value: "twilio", type: "string", group: "sms", description: "SMS service provider" },
        { key: "sms.from_number", value: "+1555000000", type: "string", group: "sms", description: "SMS sender number" },
      ],
    });

    // =============================================
    // STEP 17: Create audit logs
    // =============================================
    await db.auditLog.createMany({
      data: [
        { userId: "sys-001", username: "admin.root", action: "login", module: "auth", details: "Admin login from 10.0.0.50", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T07:00:00Z") },
        { userId: "sys-001", username: "admin.root", action: "create", module: "users", details: "Created user james.mitchell with group vip-users", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T07:15:00Z") },
        { userId: "sys-001", username: "admin.root", action: "create", module: "users", details: "Created user sarah.chen with group vip-users", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T07:16:00Z") },
        { userId: "sys-001", username: "admin.root", action: "update", module: "nas", details: "Updated NAS DC1-CORE-01 status to up", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T08:00:00Z") },
        { userId: "sys-002", username: "admin.ops", action: "login", module: "auth", details: "Ops admin login from 10.0.0.75", ipAddress: "10.0.0.75", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/123.0.0.0", timestamp: new Date("2024-03-25T08:30:00Z") },
        { userId: "sys-002", username: "admin.ops", action: "create", module: "plans", details: "Created billing plan 'Enterprise Dedicated'", ipAddress: "10.0.0.75", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/123.0.0.0", timestamp: new Date("2024-03-25T08:45:00Z") },
        { userId: "sys-002", username: "admin.ops", action: "update", module: "policies", details: "Updated policy 'Enterprise Bandwidth Policy' rules", ipAddress: "10.0.0.75", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/123.0.0.0", timestamp: new Date("2024-03-25T09:00:00Z") },
        { userId: "sys-001", username: "admin.root", action: "create", module: "invoices", details: "Generated invoice INV-2024-008 for james.mitchell", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T09:30:00Z") },
        { userId: "sys-001", username: "admin.root", action: "export", module: "sessions", details: "Exported active session report (CSV)", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T10:00:00Z") },
        { userId: "sys-002", username: "admin.ops", action: "delete", module: "users", details: "Disabled user trial.mueller (expired trial)", ipAddress: "10.0.0.75", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/123.0.0.0", timestamp: new Date("2024-03-25T10:30:00Z") },
        { userId: "sys-001", username: "admin.root", action: "update", module: "users", details: "Updated user robert.taylor status to suspended (overdue invoice)", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T11:00:00Z") },
        { userId: "sys-001", username: "admin.root", action: "create", module: "nas", details: "Added new NAS device HQ-ARUBA-01 (Aruba 7205)", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T11:30:00Z") },
        { userId: "sys-002", username: "admin.ops", action: "update", module: "billing", details: "Recorded payment PAY-2024-001 for INV-2024-001", ipAddress: "10.0.0.75", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/123.0.0.0", timestamp: new Date("2024-03-25T12:00:00Z") },
        { userId: "sys-001", username: "admin.root", action: "update", module: "settings", details: "Updated RADIUS timeout to 30 seconds", ipAddress: "10.0.0.50", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0", timestamp: new Date("2024-03-25T12:30:00Z") },
        { userId: "sys-002", username: "admin.ops", action: "login", module: "auth", details: "Ops admin login from 10.0.0.75", ipAddress: "10.0.0.75", userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Firefox/123.0.0.0", timestamp: new Date("2024-03-26T08:00:00Z") },
      ],
    });

    // =============================================
    // Return summary
    // =============================================
    const summary = {
      groups: 6,
      groupCheckAttrs: 9,
      groupReplyAttrs: 24,
      users: usersData.length,
      userGroups: usersData.length,
      userCheckAttrs: userCheckData.length + 6, // passwords + extra attrs
      nasDevices: nasDevices.length,
      plans: plansData.length,
      policies: 5,
      policyRules: 16,
      planPolicyGroups: 11,
      subscriptions: subsData.length,
      invoices: invoicesData.length,
      payments: 9,
      accountingSessions: 12,
      postAuthRecords: 10,
      vendors: 5,
      vendorAttributes: 22,
      systemSettings: 24,
      auditLogs: 15,
    };

    return NextResponse.json({
      success: true,
      message: "Seed data created successfully",
      summary,
    });
  } catch (error: unknown) {
    console.error("Seed error:", error);

    const message =
      error instanceof Prisma.PrismaClientKnownRequestError
        ? `Database error: ${error.message} (code: ${error.code})`
        : error instanceof Error
          ? error.message
          : "Unknown error occurred";

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: "Send a POST request to seed the database with demo data",
    usage: "POST /api/seed",
  });
}
