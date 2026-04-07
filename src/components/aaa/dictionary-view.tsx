'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import {
  Search,
  X,
  Copy,
  Check,
  BookOpen,
  Hash,
  Shield,
  Key,
  Receipt,
  Server,
  Plug,
  Star,
  Filter,
  ChevronDown,
  Info,
  ArrowUpDown,
  Tag,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ==================== Types ====================

interface RadiusAttribute {
  name: string
  number: number
  type: string
  description: string
  vendor: string
  category: CategoryKey
  commonlyUsed: boolean
  example?: string
}

type CategoryKey = 'authentication' | 'authorization' | 'accounting' | 'vendor' | 'coa'

interface CategoryInfo {
  key: CategoryKey
  label: string
  icon: React.ElementType
  color: string
  borderColor: string
  bgColor: string
  textColor: string
  badgeColor: string
}

// ==================== Data ====================

const CATEGORIES: CategoryInfo[] = [
  {
    key: 'authentication',
    label: 'Authentication',
    icon: Key,
    color: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-l-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  },
  {
    key: 'authorization',
    label: 'Authorization',
    icon: Shield,
    color: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-l-violet-500',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
    textColor: 'text-violet-700 dark:text-violet-300',
    badgeColor: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
  },
  {
    key: 'accounting',
    label: 'Accounting',
    icon: Receipt,
    color: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-l-amber-500',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    textColor: 'text-amber-700 dark:text-amber-300',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  },
  {
    key: 'vendor',
    label: 'Vendor-Specific',
    icon: Tag,
    color: 'text-rose-600 dark:text-rose-400',
    borderColor: 'border-l-rose-500',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
    textColor: 'text-rose-700 dark:text-rose-300',
    badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400',
  },
  {
    key: 'coa',
    label: 'CoA / Disconnect',
    icon: Zap,
    color: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-l-sky-500',
    bgColor: 'bg-sky-50 dark:bg-sky-950/30',
    textColor: 'text-sky-700 dark:text-sky-300',
    badgeColor: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-400',
  },
]

const TYPE_COLORS: Record<string, string> = {
  string: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  integer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  ipaddr: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
  date: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  octets: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  ipv6addr: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  ifid: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  abinary: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-400',
  comboip: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-400',
}

const VENDOR_COLORS: Record<string, string> = {
  RFC: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  MikroTik: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
  Cisco: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
  Huawei: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
  Juniper: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-400',
  Aruba: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  WISPr: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  CoovaChilli: 'bg-lime-100 text-lime-700 dark:bg-lime-900/40 dark:text-lime-400',
  'RFC 2865': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  'RFC 2866': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  'RFC 2869': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  'RFC 6585': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  'RFC 5176': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  'RFC 3162': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  'RFC 4372': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
  'RFC 6929': 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400',
}

const OPERATOR_DESCRIPTIONS = [
  { op: '=', desc: 'Set value (equal)' },
  { op: ':=', desc: 'Set value always (override)' },
  { op: '==', desc: 'Exact match (check only)' },
  { op: '+=', desc: 'Append value to list' },
  { op: '!=', desc: 'Not equal (check only)' },
  { op: '>', desc: 'Greater than' },
  { op: '<', desc: 'Less than' },
  { op: '>=', desc: 'Greater or equal' },
  { op: '<=', desc: 'Less or equal' },
  { op: '=~', desc: 'Regex match' },
  { op: '!~', desc: 'Regex not match' },
]

const RADIUS_ATTRIBUTES: RadiusAttribute[] = [
  // ====== Authentication ======
  {
    name: 'User-Name',
    number: 1,
    type: 'string',
    description: 'The name of the user being authenticated. This is the most fundamental attribute for user identification.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'User-Name = "john.doe"',
  },
  {
    name: 'User-Password',
    number: 2,
    type: 'string',
    description: 'The password of the user, encrypted with the shared secret using the method defined in RFC 2865.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'User-Password = "secret123"',
  },
  {
    name: 'CHAP-Password',
    number: 3,
    type: 'octets',
    description: 'The CHAP password response. Contains the CHAP ID, response value, and the cleartext password concatenated.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'CHAP-Password = 0x...',
  },
  {
    name: 'NAS-IP-Address',
    number: 4,
    type: 'ipaddr',
    description: 'The IP address of the NAS requesting authentication. Used to identify which NAS is sending the request.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'NAS-IP-Address = 192.168.1.1',
  },
  {
    name: 'NAS-Port',
    number: 5,
    type: 'integer',
    description: 'The physical or logical port number of the NAS that is authenticating the user.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: false,
    example: 'NAS-Port = 0',
  },
  {
    name: 'Service-Type',
    number: 6,
    type: 'integer',
    description: 'The type of service the user is requesting or being granted. Values include Login, Framed, Callback, etc.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Service-Type := Framed-User',
  },
  {
    name: 'Framed-Protocol',
    number: 7,
    type: 'integer',
    description: 'The framing protocol to be used for framed access. Common values: PPP, SLIP, ARAP.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Framed-Protocol := PPP',
  },
  {
    name: 'Framed-IP-Address',
    number: 8,
    type: 'ipaddr',
    description: 'The IP address to be configured for the user. Value 0xFFFFFFFF means the NAS should select an address.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Framed-IP-Address := 10.0.0.100',
  },
  {
    name: 'Framed-IP-Netmask',
    number: 9,
    type: 'ipaddr',
    description: 'The IP netmask to be used for the user\'s framed connection.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-IP-Netmask := 255.255.255.0',
  },
  {
    name: 'Framed-Routing',
    number: 10,
    type: 'integer',
    description: 'The routing method for the user\'s connection when the user is a router to a network.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-Routing := None',
  },
  {
    name: 'Filter-Id',
    number: 11,
    type: 'string',
    description: 'A filter list to be applied to the user\'s connection. References a named ACL on the NAS.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Filter-Id := "acl_vlan100"',
  },
  {
    name: 'Framed-MTU',
    number: 12,
    type: 'integer',
    description: 'The Maximum Transmission Unit to be configured for the user\'s connection.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-MTU := 1500',
  },
  {
    name: 'Framed-Compression',
    number: 13,
    type: 'integer',
    description: 'The compression protocol to be used for the framed link. Values: None, VJ-TCP/IP, IPX-Header-Compression.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-Compression := VJ-TCP/IP',
  },
  {
    name: 'Login-IP-Host',
    number: 14,
    type: 'ipaddr',
    description: 'The IP address of the host to which the user should be connected for login.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: false,
    example: 'Login-IP-Host := 10.0.0.1',
  },
  {
    name: 'Login-Service',
    number: 15,
    type: 'integer',
    description: 'The service to use to connect the user to the login host. Values: Telnet, Rlogin, TCP-Clear, etc.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Login-Service := Telnet',
  },
  {
    name: 'Login-TCP-Port',
    number: 16,
    type: 'integer',
    description: 'The TCP port to which the user should be connected on the login host.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Login-TCP-Port := 23',
  },
  {
    name: 'Reply-Message',
    number: 18,
    type: 'string',
    description: 'A message sent to the user in response to an Access-Request. Often used for login prompts or status.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'Reply-Message := "Welcome, you are now connected"',
  },
  {
    name: 'Callback-Number',
    number: 19,
    type: 'string',
    description: 'A dialing string to use for callback. The NAS will call the user back at this number.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Callback-Number = "5551234"',
  },
  {
    name: 'Callback-Id',
    number: 20,
    type: 'string',
    description: 'The name of a place to be called back. Used as an alternative to Callback-Number.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Callback-Id = "branch-office"',
  },
  {
    name: 'Framed-Route',
    number: 22,
    type: 'string',
    description: 'A route to be added to the routing table for the user\'s framed connection.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-Route += "10.10.0.0/16 0.0.0.0 1"',
  },
  {
    name: 'Framed-IPX-Network',
    number: 23,
    type: 'integer',
    description: 'The IPX network number to be configured for the user.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-IPX-Network := 0xABCDEF',
  },
  {
    name: 'State',
    number: 24,
    type: 'octets',
    description: 'Opaque data used by the server in a challenge-response mechanism. Sent back unchanged in reply.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: false,
    example: 'State = 0x...',
  },
  {
    name: 'Session-Timeout',
    number: 27,
    type: 'integer',
    description: 'The maximum number of seconds of service to be provided before termination. Zero means no limit.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Session-Timeout := 86400',
  },
  {
    name: 'Idle-Timeout',
    number: 28,
    type: 'integer',
    description: 'The maximum number of consecutive seconds of idle connection allowed before termination.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Idle-Timeout := 1800',
  },
  {
    name: 'Termination-Action',
    number: 29,
    type: 'integer',
    description: 'What action the NAS should take when the service is completed. Default or RADIUS-Request.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Termination-Action := RADIUS-Request',
  },
  {
    name: 'Called-Station-Id',
    number: 30,
    type: 'string',
    description: 'The station ID of the NAS that the user dialed into. Usually the MAC address or phone number.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'Called-Station-Id = "AA-BB-CC-DD-EE-FF"',
  },
  {
    name: 'Calling-Station-Id',
    number: 31,
    type: 'string',
    description: 'The station ID of the user\'s equipment. Usually the client MAC address or CLID.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'Calling-Station-Id = "11-22-33-44-55-66"',
  },
  {
    name: 'NAS-Identifier',
    number: 32,
    type: 'string',
    description: 'A string identifying the NAS originating the Access-Request.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'NAS-Identifier = "router-branch-1"',
  },
  {
    name: 'Proxy-State',
    number: 33,
    type: 'octets',
    description: 'Opaque data used by proxy servers. Not inspected or modified by proxies.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: false,
    example: 'Proxy-State = 0x...',
  },
  {
    name: 'Login-LAT-Service',
    number: 34,
    type: 'string',
    description: 'The LAT service to connect the user to. Used in Digital Equipment environments.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Login-LAT-Service = "LATSERVICE"',
  },
  {
    name: 'Login-LAT-Node',
    number: 35,
    type: 'string',
    description: 'The node with which the user is to be connected by LAT.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Login-LAT-Node = "LATNODE"',
  },
  {
    name: 'Login-LAT-Group',
    number: 36,
    type: 'string',
    description: 'The LAT group codes that this user is authorized to use.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Login-LAT-Group = "group1"',
  },
  {
    name: 'Framed-AppleTalk-Link',
    number: 37,
    type: 'integer',
    description: 'The AppleTalk link number to be used for the user\'s session.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-AppleTalk-Link := 0',
  },
  {
    name: 'Framed-AppleTalk-Network',
    number: 38,
    type: 'integer',
    description: 'The AppleTalk network number for the user\'s session.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-AppleTalk-Network := 0',
  },
  {
    name: 'Framed-AppleTalk-Zone',
    number: 39,
    type: 'string',
    description: 'The AppleTalk default zone for the user\'s session.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Framed-AppleTalk-Zone = "zone1"',
  },
  {
    name: 'CHAP-Challenge',
    number: 60,
    type: 'octets',
    description: 'The CHAP challenge sent by the NAS to the user in the Access-Challenge packet.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: false,
    example: 'CHAP-Challenge = 0x...',
  },
  {
    name: 'NAS-Port-Type',
    number: 61,
    type: 'integer',
    description: 'The type of physical port the NAS is using for the connection. Values: Async, ISDN, Virtual, etc.',
    vendor: 'RFC 2865',
    category: 'authentication',
    commonlyUsed: true,
    example: 'NAS-Port-Type = Virtual',
  },
  {
    name: 'Port-Limit',
    number: 62,
    type: 'integer',
    description: 'The maximum number of ports the NAS should provide to the user.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Port-Limit := 1',
  },
  {
    name: 'Login-LAT-Port',
    number: 63,
    type: 'string',
    description: 'The port with which the user is to be connected by LAT.',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Login-LAT-Port = "LATPORT"',
  },

  // ====== Authorization ======
  {
    name: 'Connect-Info',
    number: 77,
    type: 'string',
    description: 'Information about the type of connection the user is using (e.g., "57600 V.42bis").',
    vendor: 'RFC 2865',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Connect-Info = "57600 V.42bis"',
  },
  {
    name: 'EAP-Message',
    number: 79,
    type: 'string',
    description: 'Encapsulates EAP packets. Used to carry EAP authentication methods between the NAS and RADIUS server.',
    vendor: 'RFC 2869',
    category: 'authentication',
    commonlyUsed: true,
    example: 'EAP-Message = 0x...',
  },
  {
    name: 'Message-Authenticator',
    number: 80,
    type: 'octets',
    description: 'Contains an HMAC-MD5 message digest to authenticate RADIUS messages, especially with EAP.',
    vendor: 'RFC 2869',
    category: 'authentication',
    commonlyUsed: true,
    example: 'Message-Authenticator = 0x...',
  },
  {
    name: 'Tunnel-Type',
    number: 64,
    type: 'integer',
    description: 'The type of tunnel being established. Values: L2TP, PPTP, L2F, GRE, ESP, etc.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Tunnel-Type := L2TP',
  },
  {
    name: 'Tunnel-Medium-Type',
    number: 65,
    type: 'integer',
    description: 'The transport medium used for the tunnel. Values: IPv4, IPv6, NSAP, HDLC, BBN, IEEE-802, etc.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Tunnel-Medium-Type := IPv4',
  },
  {
    name: 'Tunnel-Client-Endpoint',
    number: 66,
    type: 'string',
    description: 'The address of the initiator end of the tunnel.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Tunnel-Client-Endpoint = "10.0.0.1"',
  },
  {
    name: 'Tunnel-Server-Endpoint',
    number: 67,
    type: 'string',
    description: 'The address of the server end of the tunnel.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Tunnel-Server-Endpoint = "10.0.0.2"',
  },
  {
    name: 'Tunnel-Password',
    number: 69,
    type: 'string',
    description: 'The password to use for authenticating the tunnel setup.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Tunnel-Password = "tunnel_secret"',
  },
  {
    name: 'Tunnel-Private-Group-ID',
    number: 81,
    type: 'string',
    description: 'The group ID for a particular tunneled session. Often used for VLAN assignment.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Tunnel-Private-Group-ID := "100"',
  },
  {
    name: 'Tunnel-Assignment-ID',
    number: 82,
    type: 'string',
    description: 'Identifies the tunnel to which a session is assigned when multiple tunnels exist.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Tunnel-Assignment-ID = "tunnel1"',
  },
  {
    name: 'Tunnel-Preference',
    number: 83,
    type: 'integer',
    description: 'Indicates the preference for the tunnel when multiple tunnels exist. Lower value = higher preference.',
    vendor: 'RFC 2868',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Tunnel-Preference := 0',
  },
  {
    name: 'ARAP-Challenge-Response',
    number: 84,
    type: 'octets',
    description: 'Contains the response to an Apple Remote Access Protocol (ARAP) challenge.',
    vendor: 'RFC 2869',
    category: 'authentication',
    commonlyUsed: false,
    example: 'ARAP-Challenge-Response = 0x...',
  },
  {
    name: 'ARAP-Password',
    number: 70,
    type: 'string',
    description: 'The user\'s ARAP password. Sent in an Access-Request.',
    vendor: 'RFC 2869',
    category: 'authentication',
    commonlyUsed: false,
    example: 'ARAP-Password = "secret"',
  },
  {
    name: 'Acct-Interim-Interval',
    number: 85,
    type: 'integer',
    description: 'The number of seconds between interim accounting updates for this session.',
    vendor: 'RFC 2869',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Acct-Interim-Interval := 300',
  },
  {
    name: 'NAS-Port-Id',
    number: 87,
    type: 'string',
    description: 'A text string identifying the physical port of the NAS (e.g., "S0", "Gi1/0/5").',
    vendor: 'RFC 2869',
    category: 'authentication',
    commonlyUsed: false,
    example: 'NAS-Port-Id = "Gi1/0/5"',
  },
  {
    name: 'Framed-Pool',
    number: 88,
    type: 'string',
    description: 'The name of an address pool from which the NAS should assign the user an IP address.',
    vendor: 'RFC 2869',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Framed-Pool := "pool_10_range"',
  },
  {
    name: 'Simultaneous-Use',
    number: 0,
    type: 'integer',
    description: 'Maximum number of concurrent sessions this user can have. Set in the users file or as check item.',
    vendor: 'RFC',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Simultaneous-Use := 1',
  },
  {
    name: 'Login-Time',
    number: 0,
    type: 'string',
    description: 'Time periods during which the user is allowed to log in. Uses a time-based syntax (e.g., "Mo-Fr0900-1700").',
    vendor: 'RFC',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Login-Time := "Mo-Fr0900-1700,Sa-Su0800-2000"',
  },
  {
    name: 'Max-Daily-Session',
    number: 0,
    type: 'integer',
    description: 'Maximum cumulative session time per day in seconds. Used for daily usage limits.',
    vendor: 'FreeRADIUS',
    category: 'authorization',
    commonlyUsed: true,
    example: 'Max-Daily-Session := 28800',
  },
  {
    name: 'Max-Monthly-Session',
    number: 0,
    type: 'integer',
    description: 'Maximum cumulative session time per month in seconds.',
    vendor: 'FreeRADIUS',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Max-Monthly-Session := 2592000',
  },
  {
    name: 'Unisphere-Service-Activation',
    number: 0,
    type: 'string',
    description: 'Juniper (Unisphere) service activation attribute for dynamic service provisioning.',
    vendor: 'Juniper',
    category: 'authorization',
    commonlyUsed: false,
    example: 'Unisphere-Service-Activation = "svc1"',
  },

  // ====== Accounting ======
  {
    name: 'Acct-Status-Type',
    number: 40,
    type: 'integer',
    description: 'Indicates whether this Accounting-Request marks the start, stop, interim update, or failed attempt.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Status-Type = Start',
  },
  {
    name: 'Acct-Delay-Time',
    number: 41,
    type: 'integer',
    description: 'Number of seconds the client has been trying to send this accounting request.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: false,
    example: 'Acct-Delay-Time = 0',
  },
  {
    name: 'Acct-Input-Octets',
    number: 42,
    type: 'integer',
    description: 'Number of octets received from the port over the course of this session.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Input-Octets = 1073741824',
  },
  {
    name: 'Acct-Output-Octets',
    number: 43,
    type: 'integer',
    description: 'Number of octets sent to the port over the course of this session.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Output-Octets = 5368709120',
  },
  {
    name: 'Acct-Session-Id',
    number: 44,
    type: 'string',
    description: 'A unique accounting identifier to make it easy to match start and stop records.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Session-Id = "55000001"',
  },
  {
    name: 'Acct-Authentic',
    number: 45,
    type: 'integer',
    description: 'How the user was authenticated: RADIUS, Local, TACACS+, or None.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: false,
    example: 'Acct-Authentic = RADIUS',
  },
  {
    name: 'Acct-Session-Time',
    number: 46,
    type: 'integer',
    description: 'Number of seconds the user has been receiving service (session duration).',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Session-Time = 3600',
  },
  {
    name: 'Acct-Input-Packets',
    number: 47,
    type: 'integer',
    description: 'Number of packets received from the port during this session.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Input-Packets = 120000',
  },
  {
    name: 'Acct-Output-Packets',
    number: 48,
    type: 'integer',
    description: 'Number of packets sent to the port during this session.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Output-Packets = 80000',
  },
  {
    name: 'Acct-Terminate-Cause',
    number: 49,
    type: 'integer',
    description: 'How the session was terminated: User-Request, Idle-Timeout, Session-Timeout, Admin-Reset, etc.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: true,
    example: 'Acct-Terminate-Cause = Idle-Timeout',
  },
  {
    name: 'Acct-Multi-Session-Id',
    number: 50,
    type: 'string',
    description: 'Links multiple related sessions together (e.g., multilink sessions).',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: false,
    example: 'Acct-Multi-Session-Id = "ml_55000001"',
  },
  {
    name: 'Acct-Link-Count',
    number: 51,
    type: 'integer',
    description: 'Count of links in a multilink session.',
    vendor: 'RFC 2866',
    category: 'accounting',
    commonlyUsed: false,
    example: 'Acct-Link-Count = 2',
  },
  {
    name: 'Acct-Input-Gigawords',
    number: 52,
    type: 'integer',
    description: 'High-order 32 bits of input octets. Combined with Acct-Input-Octets for 64-bit counter.',
    vendor: 'RFC 2869',
    category: 'accounting',
    commonlyUsed: false,
    example: 'Acct-Input-Gigawords = 5',
  },
  {
    name: 'Acct-Output-Gigawords',
    number: 53,
    type: 'integer',
    description: 'High-order 32 bits of output octets. Combined with Acct-Output-Octets for 64-bit counter.',
    vendor: 'RFC 2869',
    category: 'accounting',
    commonlyUsed: false,
    example: 'Acct-Output-Gigawords = 10',
  },
  {
    name: 'Event-Timestamp',
    number: 55,
    type: 'date',
    description: 'The date and time of the event that generated this accounting record.',
    vendor: 'RFC 2869',
    category: 'accounting',
    commonlyUsed: false,
    example: 'Event-Timestamp = "2024-03-15T10:30:00Z"',
  },

  // ====== Vendor-Specific ======
  // MikroTik
  {
    name: 'Mikrotik-Rate-Limit',
    number: 0,
    type: 'string',
    description: 'MikroTik rate limit string. Format: "rx/tx [burst-rx/burst-tx burst-time priority]"',
    vendor: 'MikroTik',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Mikrotik-Rate-Limit := "5M/2M 10M/5M 2s 0"',
  },
  {
    name: 'Mikrotik-Recv-Limit',
    number: 0,
    type: 'string',
    description: 'MikroTik receive (download) bandwidth limit in bytes per second.',
    vendor: 'MikroTik',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Mikrotik-Recv-Limit := "5242880"',
  },
  {
    name: 'Mikrotik-Xmit-Limit',
    number: 0,
    type: 'string',
    description: 'MikroTik transmit (upload) bandwidth limit in bytes per second.',
    vendor: 'MikroTik',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Mikrotik-Xmit-Limit := "2097152"',
  },
  {
    name: 'Mikrotik-Total-Limit',
    number: 0,
    type: 'string',
    description: 'MikroTik combined upload+download bandwidth limit in bytes per second.',
    vendor: 'MikroTik',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Mikrotik-Total-Limit := "10485760"',
  },
  {
    name: 'Mikrotik-Group-Key',
    number: 0,
    type: 'string',
    description: 'MikroTik group key for WPA key management. Sets the WPA group key for wireless users.',
    vendor: 'MikroTik',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Mikrotik-Group-Key := "sharedkey123"',
  },
  {
    name: 'Mikrotik-Wireless-Forwarding',
    number: 0,
    type: 'string',
    description: 'MikroTik wireless forwarding: "yes" or "no". Controls inter-client communication on AP.',
    vendor: 'MikroTik',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Mikrotik-Wireless-Forwarding := "yes"',
  },
  // Cisco
  {
    name: 'Cisco-AVPair',
    number: 0,
    type: 'string',
    description: 'Cisco vendor-specific attribute pair. Format: "attribute:value". Used for many Cisco-specific features.',
    vendor: 'Cisco',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Cisco-AVPair += "ip:inacl#1=permit tcp any any eq 22"',
  },
  {
    name: 'Cisco-NAS-Port',
    number: 0,
    type: 'string',
    description: 'Cisco NAS port description in extended format. Identifies the physical slot/port.',
    vendor: 'Cisco',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Cisco-NAS-Port = "shelf 1 slot 0 port 1"',
  },
  {
    name: 'Cisco-Service-Type',
    number: 0,
    type: 'integer',
    description: 'Cisco extended service type for specific services like outbound, shell, ppp, etc.',
    vendor: 'Cisco',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Cisco-Service-Type := Shell',
  },
  {
    name: 'Cisco-Multilink-ID',
    number: 0,
    type: 'integer',
    description: 'Cisco multilink bundle identifier for aggregated links.',
    vendor: 'Cisco',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Cisco-Multilink-ID := 1',
  },
  // Huawei
  {
    name: 'Huawei-Qos-Profile-Name',
    number: 0,
    type: 'string',
    description: 'Huawei QoS profile name. Applies a predefined QoS policy to the user session.',
    vendor: 'Huawei',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Huawei-Qos-Profile-Name := "bronze-qos"',
  },
  {
    name: 'Huawei-User-Group',
    number: 0,
    type: 'string',
    description: 'Huawei user group assignment. Assigns the user to a predefined group on Huawei NAS.',
    vendor: 'Huawei',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Huawei-User-Group := "guest-users"',
  },
  {
    name: 'Huawei-Input-Peak-Rate',
    number: 0,
    type: 'integer',
    description: 'Huawei input (upload) peak rate in bps.',
    vendor: 'Huawei',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Huawei-Input-Peak-Rate := 2097152',
  },
  {
    name: 'Huawei-Output-Peak-Rate',
    number: 0,
    type: 'integer',
    description: 'Huawei output (download) peak rate in bps.',
    vendor: 'Huawei',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Huawei-Output-Peak-Rate := 5242880',
  },
  {
    name: 'Huawei-Exec-Privilege',
    number: 0,
    type: 'integer',
    description: 'Huawei EXEC privilege level (0-15). Controls CLI access level.',
    vendor: 'Huawei',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Huawei-Exec-Privilege := 15',
  },
  // Juniper
  {
    name: 'Juniper-Local-User-Name',
    number: 0,
    type: 'string',
    description: 'Juniper local username mapping for template-based configuration.',
    vendor: 'Juniper',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Juniper-Local-User-Name = "user_template"',
  },
  {
    name: 'Juniper-Allow-Interfaces',
    number: 0,
    type: 'string',
    description: 'Juniper allowed interface pattern. Restricts user to specific interfaces.',
    vendor: 'Juniper',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Juniper-Allow-Interfaces = "ge-0/0/*"',
  },
  {
    name: 'Juniper- deny-Interfaces',
    number: 0,
    type: 'string',
    description: 'Juniper denied interface pattern. Blocks user from specific interfaces.',
    vendor: 'Juniper',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Juniper-Deny-Interfaces = "ge-0/0/5"',
  },
  // WISPr (Wireless ISP Roaming)
  {
    name: 'WISPr-Bandwidth-Max-Down',
    number: 0,
    type: 'integer',
    description: 'WISPr maximum download bandwidth in bits per second.',
    vendor: 'WISPr',
    category: 'vendor',
    commonlyUsed: true,
    example: 'WISPr-Bandwidth-Max-Down := 10485760',
  },
  {
    name: 'WISPr-Bandwidth-Max-Up',
    number: 0,
    type: 'integer',
    description: 'WISPr maximum upload bandwidth in bits per second.',
    vendor: 'WISPr',
    category: 'vendor',
    commonlyUsed: true,
    example: 'WISPr-Bandwidth-Max-Up := 5242880',
  },
  {
    name: 'WISPr-Session-Terminate-Time',
    number: 0,
    type: 'string',
    description: 'WISPr absolute session termination time. Session will be terminated at this time.',
    vendor: 'WISPr',
    category: 'vendor',
    commonlyUsed: true,
    example: 'WISPr-Session-Terminate-Time = "2024-12-31T23:59:59Z"',
  },
  {
    name: 'WISPr-Redirection-URL',
    number: 0,
    type: 'string',
    description: 'WISPr URL to redirect the user after successful authentication.',
    vendor: 'WISPr',
    category: 'vendor',
    commonlyUsed: false,
    example: 'WISPr-Redirection-URL = "https://portal.example.com/welcome"',
  },
  {
    name: 'WISPr-Bandwidth-Min-Down',
    number: 0,
    type: 'integer',
    description: 'WISPr minimum guaranteed download bandwidth in bits per second.',
    vendor: 'WISPr',
    category: 'vendor',
    commonlyUsed: false,
    example: 'WISPr-Bandwidth-Min-Down := 1048576',
  },
  {
    name: 'WISPr-Bandwidth-Min-Up',
    number: 0,
    type: 'integer',
    description: 'WISPr minimum guaranteed upload bandwidth in bits per second.',
    vendor: 'WISPr',
    category: 'vendor',
    commonlyUsed: false,
    example: 'WISPr-Bandwidth-Min-Up := 524288',
  },
  // CoovaChilli
  {
    name: 'ChilliSpot-Max-Total-Octets',
    number: 0,
    type: 'integer',
    description: 'CoovaChilli maximum total data usage (upload + download) in bytes.',
    vendor: 'CoovaChilli',
    category: 'vendor',
    commonlyUsed: true,
    example: 'ChilliSpot-Max-Total-Octets := 5368709120',
  },
  {
    name: 'ChilliSpot-Max-Total-Octets-Daily',
    number: 0,
    type: 'integer',
    description: 'CoovaChilli daily maximum total data usage in bytes.',
    vendor: 'CoovaChilli',
    category: 'vendor',
    commonlyUsed: true,
    example: 'ChilliSpot-Max-Total-Octets-Daily := 1073741824',
  },
  {
    name: 'ChilliSpot-Max-Bandwidth-Up',
    number: 0,
    type: 'integer',
    description: 'CoovaChilli maximum upload bandwidth in bytes per second.',
    vendor: 'CoovaChilli',
    category: 'vendor',
    commonlyUsed: false,
    example: 'ChilliSpot-Max-Bandwidth-Up := 524288',
  },
  {
    name: 'ChilliSpot-Max-Bandwidth-Down',
    number: 0,
    type: 'integer',
    description: 'CoovaChilli maximum download bandwidth in bytes per second.',
    vendor: 'CoovaChilli',
    category: 'vendor',
    commonlyUsed: false,
    example: 'ChilliSpot-Max-Bandwidth-Down := 1048576',
  },
  {
    name: 'ChilliSpot-Bandwidth-Max-Up',
    number: 0,
    type: 'integer',
    description: 'CoovaChilli (newer) maximum upload bandwidth in bps.',
    vendor: 'CoovaChilli',
    category: 'vendor',
    commonlyUsed: false,
    example: 'ChilliSpot-Bandwidth-Max-Up := 5242880',
  },
  {
    name: 'ChilliSpot-Bandwidth-Max-Down',
    number: 0,
    type: 'integer',
    description: 'CoovaChilli (newer) maximum download bandwidth in bps.',
    vendor: 'CoovaChilli',
    category: 'vendor',
    commonlyUsed: false,
    example: 'ChilliSpot-Bandwidth-Max-Down := 10485760',
  },
  // Aruba
  {
    name: 'Aruba-User-Role',
    number: 0,
    type: 'string',
    description: 'Aruba user role assignment. Assigns an Aruba-defined role to the user.',
    vendor: 'Aruba',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Aruba-User-Role := "authenticated-guest"',
  },
  {
    name: 'Aruba-Admin-Role',
    number: 0,
    type: 'string',
    description: 'Aruba admin role for management access. Controls CLI/UI access levels.',
    vendor: 'Aruba',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Aruba-Admin-Role := "read-only"',
  },
  {
    name: 'Aruba-AP-Group',
    number: 0,
    type: 'string',
    description: 'Aruba AP group assignment. Assigns the user to a specific AP group.',
    vendor: 'Aruba',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Aruba-AP-Group := "default"',
  },
  {
    name: 'Aruba-VLAN',
    number: 0,
    type: 'integer',
    description: 'Aruba VLAN assignment. Places the user on the specified VLAN.',
    vendor: 'Aruba',
    category: 'vendor',
    commonlyUsed: true,
    example: 'Aruba-VLAN := 200',
  },
  {
    name: 'Aruba-ESSID-Name',
    number: 0,
    type: 'string',
    description: 'Aruba ESSID name. Identifies the wireless network the user is connecting to.',
    vendor: 'Aruba',
    category: 'vendor',
    commonlyUsed: false,
    example: 'Aruba-ESSID-Name = "Corporate-WiFi"',
  },

  // ====== CoA / Disconnect ======
  {
    name: 'Packet-Type',
    number: 0,
    type: 'integer',
    description: 'RADIUS packet type identifier. Values: 1=Access-Request, 2=Access-Accept, 3=Access-Reject, 4=Accounting-Request, 40=Disconnect-Request, 43=CoA-Request.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: true,
    example: 'Packet-Type = CoA-Request',
  },
  {
    name: 'CoA-Request',
    number: 43,
    type: 'integer',
    description: 'RADIUS packet code 43. Sent by the server to dynamically change session parameters mid-session.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: true,
    example: 'Code 43 - CoA-Request',
  },
  {
    name: 'Disconnect-Request',
    number: 40,
    type: 'integer',
    description: 'RADIUS packet code 40. Sent by the server to forcibly terminate a user session.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: true,
    example: 'Code 40 - Disconnect-Request',
  },
  {
    name: 'Event-Timestamp (CoA)',
    number: 55,
    type: 'date',
    description: 'Timestamp of when the CoA or Disconnect message was generated.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: false,
    example: 'Event-Timestamp = "2024-03-15T10:30:00Z"',
  },
  {
    name: 'Session-ID (CoA)',
    number: 0,
    type: 'string',
    description: 'Session identifier used to target a specific session for CoA or Disconnect operations.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: true,
    example: 'Acct-Session-Id = "55000001"',
  },
  {
    name: 'CoA-Session-Timeout',
    number: 0,
    type: 'integer',
    description: 'Dynamically modify the session timeout via CoA request.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: false,
    example: 'Session-Timeout := 7200 (via CoA)',
  },
  {
    name: 'CoA-Filter-Id',
    number: 0,
    type: 'string',
    description: 'Dynamically modify or apply a filter/ACL via CoA request.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: false,
    example: 'Filter-Id := "acl_blocked" (via CoA)',
  },
  {
    name: 'CoA-Framed-Pool',
    number: 0,
    type: 'string',
    description: 'Dynamically change the IP address pool for a session via CoA.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: false,
    example: 'Framed-Pool := "restricted_pool" (via CoA)',
  },
  {
    name: 'CoA-Bandwidth-Change',
    number: 0,
    type: 'string',
    description: 'Dynamically change bandwidth limits for a session using CoA with vendor attributes.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: true,
    example: 'Mikrotik-Rate-Limit := "2M/1M" (via CoA)',
  },
  {
    name: 'NAS-IP-Address (CoA)',
    number: 4,
    type: 'ipaddr',
    description: 'The NAS IP address to target for CoA/Disconnect. Identifies which NAS the session is on.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: true,
    example: 'NAS-IP-Address = 192.168.1.1',
  },
  {
    name: 'NAS-Identifier (CoA)',
    number: 32,
    type: 'string',
    description: 'The NAS identifier to target for CoA/Disconnect. Alternative to NAS-IP-Address.',
    vendor: 'RFC 5176',
    category: 'coa',
    commonlyUsed: false,
    example: 'NAS-Identifier = "router-branch-1"',
  },
]

// ==================== Component ====================

function useDebouncedValue(value: string, delay: number): string {
  const [debounced, setDebounced] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(value), delay)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [value, delay])

  return debounced
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard', {
        description: text,
        duration: 2000,
      })
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }, [text])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}

function AttributeRow({ attr }: { attr: RadiusAttribute }) {
  const categoryInfo = CATEGORIES.find(c => c.key === attr.category) || CATEGORIES[0]
  const [detailOpen, setDetailOpen] = useState(false)
  const typeColor = TYPE_COLORS[attr.type] || TYPE_COLORS.string
  const vendorColor = VENDOR_COLORS[attr.vendor] || VENDOR_COLORS['RFC']

  return (
    <>
      <div
        className="group flex items-start gap-3 p-3 rounded-lg border border-l-4 hover:bg-muted/50 transition-colors cursor-pointer"
        style={{ borderLeftColor: `var(--color-${attr.category === 'authentication' ? 'emerald' : attr.category === 'authorization' ? 'violet' : attr.category === 'accounting' ? 'amber' : attr.category === 'vendor' ? 'rose' : 'sky'}-500)` }}
        onClick={() => setDetailOpen(true)}
      >
        {/* Category icon + border color indicator */}
        <div className={`hidden sm:flex items-center justify-center h-8 w-8 rounded-md shrink-0 ${categoryInfo.bgColor}`}>
          <categoryInfo.icon className={`h-4 w-4 ${categoryInfo.color}`} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-semibold">{attr.name}</span>
            {attr.commonlyUsed && (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
                  </TooltipTrigger>
                  <TooltipContent>Commonly Used</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <CopyButton text={attr.name} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{attr.description}</p>
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border-0 font-mono ${typeColor}`}>
              {attr.type}
            </Badge>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-5 border-0 ${vendorColor}`}>
              {attr.vendor}
            </Badge>
            {attr.number > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-muted-foreground border-0 font-mono">
                #{attr.number}
              </Badge>
            )}
          </div>
        </div>

        {/* Arrow to indicate expandable */}
        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className={`flex items-center justify-center h-9 w-9 rounded-lg ${categoryInfo.bgColor}`}>
                <categoryInfo.icon className={`h-4.5 w-4.5 ${categoryInfo.color}`} />
              </div>
              <div>
                <DialogTitle className="font-mono">{attr.name}</DialogTitle>
                <DialogDescription className="mt-0.5">{categoryInfo.label} Attribute</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Description</h4>
              <p className="text-sm leading-relaxed">{attr.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Attribute Number</h4>
                <p className="text-sm font-mono">{attr.number > 0 ? attr.number : 'N/A (Vendor)'}</p>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Data Type</h4>
                <Badge variant="outline" className={`text-xs px-2 py-0.5 border-0 font-mono ${typeColor}`}>
                  {attr.type}
                </Badge>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Vendor</h4>
                <Badge variant="outline" className={`text-xs px-2 py-0.5 border-0 ${vendorColor}`}>
                  {attr.vendor}
                </Badge>
              </div>
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Commonly Used</h4>
                <p className="text-sm">{attr.commonlyUsed ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {attr.example && (
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Usage Example</h4>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs font-mono border">{attr.example}</code>
                  <CopyButton text={attr.example} />
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function DictionaryView() {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [vendorFilter, setVendorFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'name' | 'number'>('name')
  const debouncedSearch = useDebouncedValue(search, 250)

  // Get unique vendors and types for filters
  const vendors = useMemo(() => {
    const vendorSet = new Set(RADIUS_ATTRIBUTES.map(a => a.vendor))
    return Array.from(vendorSet).sort()
  }, [])

  const types = useMemo(() => {
    const typeSet = new Set(RADIUS_ATTRIBUTES.map(a => a.type))
    return Array.from(typeSet).sort()
  }, [])

  // Filter and sort attributes
  const filteredAttributes = useMemo(() => {
    let result = [...RADIUS_ATTRIBUTES]

    // Tab filter
    if (activeTab !== 'all') {
      result = result.filter(a => a.category === activeTab)
    } else if (activeTab === 'common') {
      result = result.filter(a => a.commonlyUsed)
    }

    // Search filter
    if (debouncedSearch) {
      const query = debouncedSearch.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(query) ||
        a.description.toLowerCase().includes(query) ||
        a.vendor.toLowerCase().includes(query) ||
        String(a.number).includes(query)
      )
    }

    // Type filter
    if (typeFilter !== 'all') {
      result = result.filter(a => a.type === typeFilter)
    }

    // Vendor filter
    if (vendorFilter !== 'all') {
      result = result.filter(a => a.vendor === vendorFilter)
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'name') {
        return a.name.localeCompare(b.name)
      }
      return (a.number || 999) - (b.number || 999)
    })

    return result
  }, [debouncedSearch, activeTab, typeFilter, vendorFilter, sortOrder])

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: RADIUS_ATTRIBUTES.length,
      common: RADIUS_ATTRIBUTES.filter(a => a.commonlyUsed).length,
    }
    for (const cat of CATEGORIES) {
      counts[cat.key] = RADIUS_ATTRIBUTES.filter(a => a.category === cat.key).length
    }
    return counts
  }, [])

  const hasFilters = search || typeFilter !== 'all' || vendorFilter !== 'all'

  // Commonly used attributes for the quick section
  const commonAttributes = useMemo(() => {
    return RADIUS_ATTRIBUTES.filter(a => a.commonlyUsed)
  }, [])

  return (
    <TooltipProvider delayDuration={0}>
      <div className="space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Attributes</p>
                  <p className="text-2xl font-bold">{RADIUS_ATTRIBUTES.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Commonly Used</p>
                  <p className="text-2xl font-bold">{commonAttributes.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center">
                  <Star className="h-5 w-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vendors</p>
                  <p className="text-2xl font-bold">{vendors.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950 flex items-center justify-center">
                  <Tag className="h-5 w-5 text-rose-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Data Types</p>
                  <p className="text-2xl font-bold">{types.length}</p>
                </div>
                <div className="h-10 w-10 rounded-lg bg-violet-50 dark:bg-violet-950 flex items-center justify-center">
                  <Hash className="h-5 w-5 text-violet-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Filter className="h-4 w-4" />
                  Filters
                </div>
                {hasFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setSearch(''); setTypeFilter('all'); setVendorFilter('all') }}
                    className="text-xs gap-1 h-7"
                  >
                    <X className="h-3 w-3" />
                    Clear All
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search attributes, descriptions..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-9"
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {types.map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Vendor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map(v => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2"
                  onClick={() => setSortOrder(sortOrder === 'name' ? 'number' : 'name')}
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  Sort: {sortOrder === 'name' ? 'Name' : 'Number'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs + Attribute List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-4 mb-4">
            <TabsList className="flex-wrap h-auto gap-1 p-1">
              <TabsTrigger value="all" className="text-xs gap-1.5 px-3 h-8">
                <BookOpen className="h-3.5 w-3.5" />
                All
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 min-w-4 justify-center">
                  {categoryCounts.all}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="common" className="text-xs gap-1.5 px-3 h-8">
                <Star className="h-3.5 w-3.5" />
                Common
                <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 min-w-4 justify-center">
                  {categoryCounts.common}
                </Badge>
              </TabsTrigger>
              {CATEGORIES.map(cat => (
                <TabsTrigger key={cat.key} value={cat.key} className="text-xs gap-1.5 px-3 h-8">
                  <cat.icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{cat.label}</span>
                  <span className="sm:hidden">{cat.label.slice(0, 4)}</span>
                  <Badge variant="secondary" className="ml-1 text-[10px] h-4 px-1 min-w-4 justify-center">
                    {categoryCounts[cat.key]}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* All tabs share the same filtered list */}
          {['all', 'common', ...CATEGORIES.map(c => c.key)].map(tab => (
            <TabsContent key={tab} value={tab} className="mt-0">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{filteredAttributes.length}</span> attributes
                      </p>
                      {hasFilters && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <Filter className="h-2.5 w-2.5" />
                          Filtered
                        </Badge>
                      )}
                    </div>
                    <div className="hidden md:flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Info className="h-3 w-3" />
                      Click on an attribute for details
                    </div>
                  </div>

                  {filteredAttributes.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Search className="h-8 w-8 opacity-30 mb-2" />
                      <p className="text-sm">No attributes found</p>
                      {hasFilters && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2"
                          onClick={() => { setSearch(''); setTypeFilter('all'); setVendorFilter('all') }}
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                      {filteredAttributes.map(attr => (
                        <AttributeRow key={attr.name} attr={attr} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Commonly Used Quick Reference */}
        {activeTab !== 'common' && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <Star className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold">Quick Reference — Most Commonly Used Attributes</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {commonAttributes.slice(0, 12).map(attr => {
                  const catInfo = CATEGORIES.find(c => c.key === attr.category) || CATEGORIES[0]
                  return (
                    <div
                      key={attr.name}
                      className={`flex items-center gap-2.5 p-2.5 rounded-lg border-l-3 ${catInfo.borderColor} bg-muted/30 hover:bg-muted/60 transition-colors group cursor-pointer`}
                      onClick={() => {
                        setActiveTab('common')
                        setSearch(attr.name)
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs font-semibold block truncate">{attr.name}</span>
                        <span className="text-[10px] text-muted-foreground block truncate">{attr.description.slice(0, 60)}...</span>
                      </div>
                      <CopyButton text={attr.name} />
                    </div>
                  )
                })}
              </div>
              <div className="mt-3 text-center">
                <Button
                  variant="link"
                  size="sm"
                  className="text-xs"
                  onClick={() => setActiveTab('common')}
                >
                  View all {commonAttributes.length} commonly used attributes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Operators Reference */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Info className="h-4 w-4 text-sky-500" />
              <h3 className="text-sm font-semibold">RADIUS Operators Reference</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {OPERATOR_DESCRIPTIONS.map(({ op, desc }) => (
                <div key={op} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30">
                  <code className="font-mono text-sm font-bold px-2 py-0.5 rounded bg-background border min-w-[40px] text-center">
                    {op}
                  </code>
                  <span className="text-xs text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

export default DictionaryView
