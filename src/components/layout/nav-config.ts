import {
  Compass,
  Route,
  BrainCircuit,
  MessagesSquare,
  MoreHorizontal,
  Target,
  Library,
  Flame,
  ClipboardCheck,
  GraduationCap,
  Building2,
  Search,
  CalendarDays,
  MessageSquare,
  Users,
  Calculator,
  Trophy,
  Landmark,
  FileText,
  BarChart3,
  Settings,
  Radio,
  type LucideIcon,
} from "lucide-react";

export type NavChild = {
  label: string;
  href: string;
  icon: LucideIcon;
  featureKey?: string;
  description?: string;
  primary?: boolean;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  items: NavChild[];
  extraActivePaths?: string[];
};

// Canonical student information architecture.
export const STUDENT_GROUPS: NavGroup[] = [
  {
    label: "Discover",
    icon: Compass,
    items: [
      {
        label: "Career Matches",
        href: "/career-matches",
        icon: Target,
        description: "Personalized careers based on your profile",
        primary: true,
      },
      {
        label: "Career Library",
        href: "/career-library",
        icon: Library,
        featureKey: "careerLibrary",
        description: "Explore all careers",
      },
      {
        label: "Trending Careers",
        href: "/career-library?tab=trending",
        icon: Flame,
        description: "Emerging and trending careers",
      },
    ],
  },
  {
    label: "Plan",
    icon: Route,
    extraActivePaths: ["/career-preferences"],
    items: [
      {
        label: "Career Profile",
        href: "/career-profile",
        icon: ClipboardCheck,
        description: "Understand your strengths and interests",
      },
      {
        label: "Education Pathways",
        href: "/education",
        icon: GraduationCap,
        description: "Explore degrees and specializations",
      },
      {
        label: "Universities",
        href: "/universities",
        icon: Building2,
        description: "Find institutions that fit your path",
      },
      {
        label: "College Finder",
        href: "/college-finder",
        icon: Search,
        featureKey: "collegeFinder",
        description: "Search institutions directly",
      },
    ],
  },
  {
    label: "Assess",
    icon: BrainCircuit,
    items: [
      {
        label: "Career Assessments",
        href: "/assessments",
        icon: ClipboardCheck,
        description: "Optional assessments that enrich recommendations",
      },
      {
        label: "Mock Tests",
        href: "/mock-tests",
        icon: FileText,
        featureKey: "mockTests",
        description: "Academic preparation",
      },
    ],
  },
  {
    label: "Connect",
    icon: MessagesSquare,
    items: [
      {
        label: "Appointments",
        href: "/appointments",
        icon: CalendarDays,
        featureKey: "appointments",
        description: "Book and manage sessions",
      },
      {
        label: "Messages",
        href: "/messages",
        icon: MessageSquare,
        description: "Chat with your counselor",
      },
      {
        label: "Discuss with Counselor",
        href: "/appointments",
        icon: Users,
        description: "Get a second opinion",
      },
    ],
  },
  {
    label: "More",
    icon: MoreHorizontal,
    items: [
      {
        label: "AI Odds Calculator",
        href: "/odds-calculator",
        icon: Calculator,
        featureKey: "aiOddsCalculator",
        description: "Estimate your admission chances",
      },
      {
        label: "Scholarships",
        href: "/scholarships",
        icon: Trophy,
        featureKey: "scholarshipHub",
        description: "Find funding opportunities",
      },
      {
        label: "Indian Colleges & Universities",
        href: "/indian-colleges",
        icon: Landmark,
        description: "Browse institutions across India",
      },
    ],
  },
];

// Grouped counselor information architecture. Only real, existing routes are
// referenced (no invented destinations). Items without a dedicated counselor
// page (e.g. "Student 360" which is /students/[id]) are intentionally omitted
// to avoid dead links; "My Students" (/students) is the canonical entry point.
export const COUNSELOR_GROUPS: NavGroup[] = [
  {
    label: "Students",
    icon: Users,
    items: [
      {
        label: "My Students",
        href: "/students",
        icon: Users,
        description: "Manage and review your students",
      },
    ],
  },
  {
    label: "Assessments",
    icon: ClipboardCheck,
    items: [
      {
        label: "Assign Assessments",
        href: "/tests/assign",
        icon: FileText,
        description: "Send psychometric and mock assessments",
      },
    ],
  },
  {
    label: "Resources",
    icon: Library,
    items: [
      {
        label: "Career Library",
        href: "/career-library",
        icon: Library,
        description: "Explore careers to guide students",
      },
      {
        label: "Universities",
        href: "/universities",
        icon: Building2,
        description: "Browse global universities",
      },
      {
        label: "Indian Colleges & Universities",
        href: "/indian-colleges",
        icon: Landmark,
        description: "Browse institutions across India",
      },
    ],
  },
  {
    label: "Connect",
    icon: MessagesSquare,
    items: [
      {
        label: "Calendar",
        href: "/calendar",
        icon: CalendarDays,
        description: "Schedule and join sessions",
      },
      {
        label: "Messages",
        href: "/messages",
        icon: MessageSquare,
        description: "Chat with students",
      },
    ],
  },
  {
    label: "Insights",
    icon: BarChart3,
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        description: "Engagement and outcome insights",
      },
    ],
  },
  {
    label: "More",
    icon: MoreHorizontal,
    extraActivePaths: ["/admin"],
    items: [
      {
        label: "Webinars",
        href: "/webinars",
        icon: Radio,
        description: "Host and join webinars",
      },
      {
        label: "Settings",
        href: "/settings",
        icon: Settings,
        description: "Account preferences",
      },
    ],
  },
];

// Super-admin gets the counselor groups plus admin tools (added at render time).
export const SUPER_ADMIN_EXTRA: NavChild[] = [
  { label: "Counselors", href: "/admin/counselors", icon: Users },
  { label: "University Admin", href: "/admin/universities", icon: Building2 },
];

// University-admin keeps its existing flat architecture.
export const UNIVERSITY_ADMIN_NAV_ITEMS: NavChild[] = [
  { label: "Universities", href: "/universities", icon: Building2 },
  { label: "Indian Colleges and Universities", href: "/indian-colleges", icon: Landmark },
];

/** A feature is visible whenever it exists; a false flag only marks it locked. */
export function canShowItem(flags: any, item: NavChild): boolean {
  if (!item.featureKey) return true;
  return flags?.[item.featureKey] === true;
}

/** True when the group contains (or is an extra-active parent of) the path. */
export function isGroupActive(group: NavGroup, pathname: string): boolean {
  const inItems = group.items.some((it) => {
    const base = it.href.split("?")[0];
    return pathname === base || pathname.startsWith(base + "/");
  });
  const inExtra = (group.extraActivePaths ?? []).some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  return inItems || inExtra;
}
