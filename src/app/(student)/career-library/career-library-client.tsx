"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Sparkles,
  Briefcase,
  ArrowRight,
  Compass,
  Flame,
  Building2,
} from "lucide-react";
import {
  FaChartBar,
  FaMicrochip,
  FaBullseye,
  FaChartLine,
  FaBolt,
  FaBuilding,
  FaBriefcase,
  FaUsers,
  FaGlobe,
  FaLayerGroup,
  FaPlayCircle,
  FaCheckCircle,
  FaYoutube,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaVolumeUp,
  FaGraduationCap,
  FaMagic,
} from "react-icons/fa";
import type { IconType } from "react-icons";

const ICONS: Record<string, IconType> = {
  barChart: FaChartBar,
  cpu: FaMicrochip,
  target: FaBullseye,
  trendingUp: FaChartLine,
  zap: FaBolt,
  building: FaBuilding,
  briefcase: FaBriefcase,
  users: FaUsers,
  globe: FaGlobe,
  generic: FaLayerGroup,
  playCircle: FaPlayCircle,
  checkCircle: FaCheckCircle,
  youtube: FaYoutube,
  calendar: FaCalendarAlt,
  mapPin: FaMapMarkerAlt,
  volumeHigh: FaVolumeUp,
  gradHat: FaGraduationCap,
  sparkles: FaMagic,
};

const GRADIENTS: Record<string, string> = {
  barChart: "from-blue-500 to-blue-600",
  cpu: "from-blue-500 to-blue-600",
  target: "from-blue-500 to-blue-600",
  trendingUp: "from-blue-500 to-blue-600",
  zap: "from-blue-500 to-blue-600",
  building: "from-blue-500 to-blue-600",
  briefcase: "from-blue-500 to-blue-600",
  users: "from-blue-500 to-blue-600",
  globe: "from-blue-500 to-blue-600",
  generic: "from-blue-500 to-blue-600",
  playCircle: "from-blue-500 to-blue-600",
  checkCircle: "from-blue-500 to-blue-600",
  youtube: "from-blue-500 to-blue-600",
  calendar: "from-blue-500 to-blue-600",
  mapPin: "from-blue-500 to-blue-600",
  volumeHigh: "from-blue-500 to-blue-600",
  gradHat: "from-blue-500 to-blue-600",
  sparkles: "from-blue-500 to-blue-600",
};

// Original page styling per career (icon + color)
const CAREER_STYLES: Record<string, { iconType: string; bg: string; text: string }> = {
  "Data Science": { iconType: "barChart", bg: "bg-blue-100", text: "text-blue-600" },
  "Software Engineering": { iconType: "cpu", bg: "bg-blue-100", text: "text-blue-600" },
  "Product Management": { iconType: "target", bg: "bg-rose-100", text: "text-rose-600" },
  "Digital Marketing": { iconType: "trendingUp", bg: "bg-emerald-100", text: "text-emerald-600" },
  "User Experience Design UX": { iconType: "zap", bg: "bg-blue-100", text: "text-blue-600" },
  "Civil Services": { iconType: "building", bg: "bg-orange-100", text: "text-orange-600" },
  "Investment Banking": { iconType: "briefcase", bg: "bg-slate-200", text: "text-slate-700" },
  "Medicine": { iconType: "users", bg: "bg-red-100", text: "text-red-600" },
  "Law": { iconType: "briefcase", bg: "bg-amber-100", text: "text-amber-600" },
  "Architecture": { iconType: "building", bg: "bg-teal-100", text: "text-teal-600" },
  "Aviation": { iconType: "globe", bg: "bg-sky-100", text: "text-sky-600" },
  "Culinary Arts": { iconType: "generic", bg: "bg-yellow-100", text: "text-yellow-600" },
  "Psychology": { iconType: "users", bg: "bg-pink-100", text: "text-pink-600" },
  "Cyber Security": { iconType: "zap", bg: "bg-green-100", text: "text-green-600" },
  "Artificial Intelligence": { iconType: "cpu", bg: "bg-blue-100", text: "text-blue-600" },
  "Blockchain Technology": { iconType: "generic", bg: "bg-gray-100", text: "text-gray-700" },
  "Cloud Computing": { iconType: "globe", bg: "bg-cyan-100", text: "text-cyan-600" },
  "Robotics Engineering": { iconType: "cpu", bg: "bg-red-50", text: "text-red-700" },
  "Sustainability": { iconType: "globe", bg: "bg-green-50", text: "text-green-700" },
  "Drone Technology": { iconType: "zap", bg: "bg-blue-50", text: "text-blue-700" },
  "Ethical Hacking": { iconType: "zap", bg: "bg-black/10", text: "text-black" },
  "Full Stack Development": { iconType: "cpu", bg: "bg-blue-50", text: "text-blue-700" },
  "DevOps": { iconType: "generic", bg: "bg-orange-50", text: "text-orange-700" },
  "Game Development": { iconType: "playCircle", bg: "bg-blue-50", text: "text-blue-700" },
  "Bioinformatics": { iconType: "users", bg: "bg-teal-50", text: "text-teal-700" },
  "Content Creation": { iconType: "youtube", bg: "bg-rose-50", text: "text-rose-700" },
  "Social Media Management": { iconType: "users", bg: "bg-pink-50", text: "text-pink-700" },
  "Financial Analysis": { iconType: "trendingUp", bg: "bg-yellow-50", text: "text-yellow-700" },
  "Interior Design": { iconType: "building", bg: "bg-amber-50", text: "text-amber-700" },
  "Event Management": { iconType: "calendar", bg: "bg-blue-50", text: "text-blue-700" },
  "Fashion Design": { iconType: "generic", bg: "bg-rose-100", text: "text-rose-800" },
  "Journalism": { iconType: "generic", bg: "bg-slate-100", text: "text-slate-800" },
  "Veterinary Science": { iconType: "users", bg: "bg-emerald-100", text: "text-emerald-800" },
  "Nutrition and Dietetics": { iconType: "users", bg: "bg-lime-100", text: "text-lime-800" },
  "Sports Management": { iconType: "trendingUp", bg: "bg-blue-100", text: "text-blue-800" },
  "Supply Chain Management": { iconType: "mapPin", bg: "bg-orange-100", text: "text-orange-800" },
  "Human Resource Management": { iconType: "users", bg: "bg-blue-100", text: "text-blue-800" },
  "Sales Management": { iconType: "trendingUp", bg: "bg-red-100", text: "text-red-800" },
  "Actuarial Science": { iconType: "barChart", bg: "bg-cyan-100", text: "text-cyan-800" },
  "Renewable Energy Engineering": { iconType: "zap", bg: "bg-green-100", text: "text-green-800" },
  "Internet of Things": { iconType: "cpu", bg: "bg-blue-100", text: "text-blue-600" },
  "Mobile Application Development": { iconType: "cpu", bg: "bg-blue-100", text: "text-blue-600" },
  "Software Testing and Quality Assurance": { iconType: "checkCircle", bg: "bg-emerald-100", text: "text-emerald-600" },
  "Hardware and Networking": { iconType: "cpu", bg: "bg-slate-100", text: "text-slate-600" },
  "Information Technology Business Analysis": { iconType: "barChart", bg: "bg-blue-100", text: "text-blue-600" },
  "User Interface Design": { iconType: "sparkles", bg: "bg-pink-100", text: "text-pink-600" },
  "Graphic Design": { iconType: "sparkles", bg: "bg-rose-100", text: "text-rose-600" },
  "Product Design": { iconType: "sparkles", bg: "bg-orange-100", text: "text-orange-600" },
  "Industrial Design": { iconType: "building", bg: "bg-amber-100", text: "text-amber-600" },
  "Visual Merchandising": { iconType: "sparkles", bg: "bg-yellow-100", text: "text-yellow-600" },
  "Animation": { iconType: "playCircle", bg: "bg-lime-100", text: "text-lime-600" },
  "Multimedia and Gaming": { iconType: "playCircle", bg: "bg-green-100", text: "text-green-600" },
  "Photography": { iconType: "generic", bg: "bg-teal-100", text: "text-teal-600" },
  "Sound Engineering": { iconType: "volumeHigh", bg: "bg-cyan-100", text: "text-cyan-600" },
  "Image Consulting": { iconType: "users", bg: "bg-sky-100", text: "text-sky-600" },
  "Fine Arts": { iconType: "sparkles", bg: "bg-blue-100", text: "text-blue-600" },
  "Performing Arts": { iconType: "sparkles", bg: "bg-blue-100", text: "text-blue-600" },
  "Public Relations": { iconType: "users", bg: "bg-blue-100", text: "text-blue-600" },
  "Advertising": { iconType: "trendingUp", bg: "bg-blue-100", text: "text-blue-600" },
  "Corporate Communication": { iconType: "briefcase", bg: "bg-blue-100", text: "text-blue-600" },
  "Creative Writing": { iconType: "generic", bg: "bg-pink-100", text: "text-pink-600" },
  "Interpretation and Translation": { iconType: "globe", bg: "bg-rose-100", text: "text-rose-600" },
  "Business Management": { iconType: "briefcase", bg: "bg-red-100", text: "text-red-600" },
  "Entrepreneurship": { iconType: "trendingUp", bg: "bg-orange-100", text: "text-orange-600" },
  "Strategy Consulting": { iconType: "target", bg: "bg-amber-100", text: "text-amber-600" },
  "Project Management": { iconType: "checkCircle", bg: "bg-yellow-100", text: "text-yellow-600" },
  "Operations Management": { iconType: "briefcase", bg: "bg-lime-100", text: "text-lime-600" },
  "Retail Management": { iconType: "briefcase", bg: "bg-green-100", text: "text-green-600" },
  "Growth Marketing": { iconType: "trendingUp", bg: "bg-emerald-100", text: "text-emerald-600" },
  "Performance Marketing": { iconType: "trendingUp", bg: "bg-teal-100", text: "text-teal-600" },
  "Brand Management": { iconType: "sparkles", bg: "bg-cyan-100", text: "text-cyan-600" },
  "Chartered Accountancy": { iconType: "barChart", bg: "bg-sky-100", text: "text-sky-600" },
  "Cost and Management Accounting": { iconType: "barChart", bg: "bg-blue-100", text: "text-blue-600" },
  "Company Secretaryship": { iconType: "briefcase", bg: "bg-blue-100", text: "text-blue-600" },
  "Financial Planning": { iconType: "barChart", bg: "bg-blue-100", text: "text-blue-600" },
  "Risk Management": { iconType: "target", bg: "bg-blue-100", text: "text-blue-600" },
  "Economics": { iconType: "globe", bg: "bg-blue-100", text: "text-blue-600" },
  "Biotechnology Research": { iconType: "globe", bg: "bg-pink-100", text: "text-pink-600" },
  "Clinical Research": { iconType: "users", bg: "bg-rose-100", text: "text-rose-600" },
  "Biomedical Engineering": { iconType: "generic", bg: "bg-red-100", text: "text-red-600" },
  "Pharmacology": { iconType: "generic", bg: "bg-orange-100", text: "text-orange-600" },
  "Genetics": { iconType: "generic", bg: "bg-amber-100", text: "text-amber-600" },
  "Environmental Science": { iconType: "globe", bg: "bg-yellow-100", text: "text-yellow-600" },
  "Nanotechnology": { iconType: "cpu", bg: "bg-lime-100", text: "text-lime-600" },
  "Dentistry": { iconType: "users", bg: "bg-green-100", text: "text-green-600" },
  "Physiotherapy": { iconType: "users", bg: "bg-emerald-100", text: "text-emerald-600" },
  "Sports Physiotherapy": { iconType: "users", bg: "bg-teal-100", text: "text-teal-600" },
  "Optometry": { iconType: "users", bg: "bg-cyan-100", text: "text-cyan-600" },
  "Audiology": { iconType: "volumeHigh", bg: "bg-sky-100", text: "text-sky-600" },
  "Medical Laboratory Sciences": { iconType: "generic", bg: "bg-blue-100", text: "text-blue-600" },
  "Radiology Technology": { iconType: "zap", bg: "bg-blue-100", text: "text-blue-600" },
  "Nursing": { iconType: "users", bg: "bg-blue-100", text: "text-blue-600" },
  "Occupational Therapy": { iconType: "users", bg: "bg-blue-100", text: "text-blue-600" },
  "Mechanical Engineering": { iconType: "building", bg: "bg-blue-100", text: "text-blue-600" },
  "Civil Engineering": { iconType: "building", bg: "bg-pink-100", text: "text-pink-600" },
  "Electrical Engineering": { iconType: "zap", bg: "bg-rose-100", text: "text-rose-600" },
  "Electronics Engineering": { iconType: "cpu", bg: "bg-red-100", text: "text-red-600" },
  "Aerospace Engineering": { iconType: "globe", bg: "bg-orange-100", text: "text-orange-600" },
  "Chemical Engineering": { iconType: "generic", bg: "bg-amber-100", text: "text-amber-600" },
  "Industrial Quality Engineering": { iconType: "checkCircle", bg: "bg-yellow-100", text: "text-yellow-600" },
  "Urban Planning": { iconType: "building", bg: "bg-lime-100", text: "text-lime-600" },
  "Construction Management": { iconType: "building", bg: "bg-green-100", text: "text-green-600" },
  "Landscape Design": { iconType: "building", bg: "bg-emerald-100", text: "text-emerald-600" },
  "Climate Science": { iconType: "globe", bg: "bg-teal-100", text: "text-teal-600" },
  "Agricultural Engineering": { iconType: "generic", bg: "bg-cyan-100", text: "text-cyan-600" },
  "Agri Business Management": { iconType: "briefcase", bg: "bg-sky-100", text: "text-sky-600" },
  "Food Technology": { iconType: "generic", bg: "bg-blue-100", text: "text-blue-600" },
  "Dairy Technology": { iconType: "generic", bg: "bg-blue-100", text: "text-blue-600" },
  "Forestry": { iconType: "globe", bg: "bg-blue-100", text: "text-blue-600" },
  "Wildlife Biology": { iconType: "globe", bg: "bg-blue-100", text: "text-blue-600" },
  "Air Traffic Management": { iconType: "globe", bg: "bg-blue-100", text: "text-blue-600" },
  "Cabin Services": { iconType: "users", bg: "bg-pink-100", text: "text-pink-600" },
  "Maritime Studies": { iconType: "globe", bg: "bg-rose-100", text: "text-rose-600" },
  "Logistics and Transportation Management": { iconType: "mapPin", bg: "bg-red-100", text: "text-red-600" },
  "Hotel Management": { iconType: "building", bg: "bg-orange-100", text: "text-orange-600" },
  "Travel and Tourism Management": { iconType: "globe", bg: "bg-amber-100", text: "text-amber-600" },
  "Sports Coaching": { iconType: "users", bg: "bg-yellow-100", text: "text-yellow-600" },
  "Professional Sports": { iconType: "users", bg: "bg-lime-100", text: "text-lime-600" },
  "Physical Training": { iconType: "users", bg: "bg-green-100", text: "text-green-600" },
  "School Education": { iconType: "gradHat", bg: "bg-emerald-100", text: "text-emerald-600" },
  "Higher Education and Academia": { iconType: "gradHat", bg: "bg-teal-100", text: "text-teal-600" },
  "Corporate Training": { iconType: "users", bg: "bg-cyan-100", text: "text-cyan-600" },
  "Education Administration": { iconType: "briefcase", bg: "bg-sky-100", text: "text-sky-600" },
  "Library Sciences": { iconType: "gradHat", bg: "bg-blue-100", text: "text-blue-600" },
  "Career Counselling": { iconType: "users", bg: "bg-blue-100", text: "text-blue-600" },
  "Mentoring and Coaching": { iconType: "users", bg: "bg-blue-100", text: "text-blue-600" },
  "Forensic Science": { iconType: "generic", bg: "bg-blue-100", text: "text-blue-600" },
  "Law Enforcement Studies": { iconType: "target", bg: "bg-blue-100", text: "text-blue-600" },
  "Disaster Management": { iconType: "target", bg: "bg-pink-100", text: "text-pink-600" },
  "Defence Services": { iconType: "target", bg: "bg-rose-100", text: "text-rose-600" },
  "Economic Services": { iconType: "barChart", bg: "bg-red-100", text: "text-red-600" },
  "Staff Selection Services": { iconType: "users", bg: "bg-orange-100", text: "text-orange-600" },
  "Investment Advisory": { iconType: "trendingUp", bg: "bg-amber-100", text: "text-amber-600" },
  "Sustainability Analytics": { iconType: "barChart", bg: "bg-yellow-100", text: "text-yellow-600" },
  "Health Informatics": { iconType: "cpu", bg: "bg-lime-100", text: "text-lime-600" },
  "Agriculture Research": { iconType: "globe", bg: "bg-lime-100", text: "text-lime-700" },
  "Pilot": { iconType: "globe", bg: "bg-sky-100", text: "text-sky-600" },
  "Airforce": { iconType: "target", bg: "bg-blue-200", text: "text-blue-800" },
};

const TRENDING_BADGES = [
  { label: "In Demand", icon: "🔥", color: "bg-rose-100 text-rose-700 border-rose-200" },
  { label: "New Age", icon: "✨", color: "bg-blue-100 text-blue-700 border-blue-200" },
  { label: "High Pay", icon: "💰", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
];

const STAT_CARDS = [
  { icon: Compass, label: "Careers Explored", grad: "from-blue-500 to-blue-600" },
  { icon: Flame, label: "High Demand", grad: "from-blue-500 to-blue-600" },
  { icon: Building2, label: "Industry Sectors", grad: "from-blue-500 to-blue-600" },
];

// Original page order of all careers (badges cycle by index % 3)
const CAREER_ORDER = [
  "Data Science", "Software Engineering", "Product Management", "Digital Marketing",
  "User Experience Design UX", "Civil Services", "Investment Banking", "Medicine",
  "Law", "Architecture", "Aviation", "Culinary Arts", "Psychology", "Cyber Security",
  "Artificial Intelligence", "Blockchain Technology", "Cloud Computing",
  "Robotics Engineering", "Sustainability", "Drone Technology", "Ethical Hacking",
  "Full Stack Development", "DevOps", "Game Development", "Bioinformatics",
  "Content Creation", "Social Media Management", "Financial Analysis",
  "Interior Design", "Event Management", "Fashion Design", "Journalism",
  "Veterinary Science", "Nutrition and Dietetics", "Sports Management",
  "Supply Chain Management", "Human Resource Management", "Sales Management",
  "Actuarial Science", "Renewable Energy Engineering", "Internet of Things",
  "Mobile Application Development", "Software Testing and Quality Assurance",
  "Hardware and Networking", "Information Technology Business Analysis",
  "User Interface Design", "Graphic Design", "Product Design", "Industrial Design",
  "Visual Merchandising", "Animation", "Multimedia and Gaming", "Photography",
  "Sound Engineering", "Image Consulting", "Fine Arts", "Performing Arts",
  "Public Relations", "Advertising", "Corporate Communication", "Creative Writing",
  "Interpretation and Translation", "Business Management", "Entrepreneurship",
  "Strategy Consulting", "Project Management", "Operations Management",
  "Retail Management", "Growth Marketing", "Performance Marketing",
  "Brand Management", "Chartered Accountancy", "Cost and Management Accounting",
  "Company Secretaryship", "Financial Planning", "Risk Management", "Economics",
  "Biotechnology Research", "Clinical Research", "Biomedical Engineering",
  "Pharmacology", "Genetics", "Environmental Science", "Nanotechnology",
  "Dentistry", "Physiotherapy", "Sports Physiotherapy", "Optometry", "Audiology",
  "Medical Laboratory Sciences", "Radiology Technology", "Nursing",
  "Occupational Therapy", "Mechanical Engineering", "Civil Engineering",
  "Electrical Engineering", "Electronics Engineering", "Aerospace Engineering",
  "Chemical Engineering", "Industrial Quality Engineering", "Urban Planning",
  "Construction Management", "Landscape Design", "Climate Science",
  "Agricultural Engineering", "Agri Business Management", "Food Technology",
  "Dairy Technology", "Forestry", "Wildlife Biology", "Air Traffic Management",
  "Cabin Services", "Maritime Studies", "Logistics and Transportation Management",
  "Hotel Management", "Travel and Tourism Management", "Sports Coaching",
  "Professional Sports", "Physical Training", "School Education",
  "Higher Education and Academia", "Corporate Training", "Education Administration",
  "Library Sciences", "Career Counselling", "Mentoring and Coaching",
  "Forensic Science", "Law Enforcement Studies", "Disaster Management",
  "Defence Services", "Economic Services", "Staff Selection Services",
  "Investment Advisory", "Sustainability Analytics", "Health Informatics",
  "Agriculture Research", "Pilot", "Airforce",
];

export default function CareerLibraryClient() {
  const router = useRouter();
  const [careers, setCareers] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchCareers = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/careers?sortBy=name`);
    const data = await res.json();
    setCareers(data.careers || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCareers();
  }, [fetchCareers]);

  // Order careers exactly as the original page (by embedded order list)
  const orderedCareers = useCallback(() => {
    const map = new Map(careers.map((c) => [c.name, c]));
    return CAREER_ORDER.map((name) => map.get(name)).filter(Boolean);
  }, [careers]);

  const trendingCareers = orderedCareers();

  const stats = [
    { ...STAT_CARDS[0], value: trendingCareers.length },
    { ...STAT_CARDS[1], value: trendingCareers.filter((c: any) => c.demandLevel === "High").length },
    { ...STAT_CARDS[2], value: new Set(trendingCareers.flatMap((c: any) => c.topIndustries || [])).size },
  ];

  const clean = (v?: string) => (typeof v === "string" ? v.replace(/^\?+/, "") : v || "");

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/careers?search=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data.careers || []);
      setShowDropdown(true);
      setActiveIndex(-1);
    }, 150);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToCareer(slug: string) {
    setShowDropdown(false);
    router.push(`/career-library/${slug}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (suggestions.length > 0) {
      goToCareer(suggestions[0].slug);
    } else if (trendingCareers.length > 0) {
      goToCareer(trendingCareers[0].slug);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        goToCareer(suggestions[activeIndex].slug);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  }

  return (
    <div className="space-y-12 p-6 pt-20 max-w-7xl mx-auto">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-accent to-primary p-8 md:p-12 text-white shadow-xl">
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
            <Sparkles className="h-3.5 w-3.5" /> Career Library
          </span>
          <h1 className="mt-4 text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            Explore{" "}
            <span className="text-blue-200">
              New Age Careers
            </span>
          </h1>
          <p className="text-base md:text-lg text-white/85 mt-4 max-w-3xl mx-auto">
            Role insights, opportunities, growth scope, and steps to become one — explore the careers of tomorrow, today.
          </p>

          {/* SEARCH FORM */}
          <form
            onSubmit={handleSearchSubmit}
            className="bg-white rounded-2xl shadow-2xl p-2 md:p-3 flex flex-col md:flex-row gap-3 relative z-10 w-full max-w-2xl mx-auto mt-8"
          >
            <div className="relative group text-left w-full md:flex-1 h-16" ref={dropdownRef}>
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <Input
                ref={inputRef}
                type="text"
                name="careerName"
                autoComplete="off"
                value={query}
                placeholder="E.g., Data Scientist, Pilot, Chef..."
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => query && setShowDropdown(true)}
                className="w-full pl-14 pr-4 h-full rounded-xl border-slate-200 text-slate-800 focus-visible:ring-accent/30 text-lg font-medium"
              />
              {showDropdown && suggestions.length > 0 && (
                <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-[9999]">
                  {suggestions.map((s, i) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => goToCareer(s.slug)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors ${
                        activeIndex === i ? "bg-accent/10" : "hover:bg-accent/5"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Briefcase className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate text-slate-800">{s.title}</p>
                          {s.salaryEntry && (
                            <p className="text-xs text-muted-foreground">
                              {s.salaryEntry} · Growth {s.jobGrowth || "—"}
                            </p>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="bg-accent hover:bg-accent/90 text-white font-bold h-16 px-8 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg w-full md:w-auto text-lg"
            >
              <span>Explore</span>
              <Sparkles className="h-5 w-5" />
            </button>
          </form>
        </div>
      </section>

      {/* STATS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="flex items-center gap-4 rounded-2xl border bg-card p-5 transition-shadow hover:shadow-md">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${s.grad} text-white shadow-md`}>
                <Icon className="h-6 w-6" />
              </span>
              <div>
                <p className="text-2xl font-bold leading-none">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* EXPLORE NEW AGE CAREERS */}
      <div>
        <div className="text-center mb-8">
          <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
            Explore New Age Careers
          </h3>
          <p className="text-muted-foreground mt-2">
            Pick a career to dive into salaries, pathways, and the skills you&apos;ll need.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5 min-h-[160px] flex flex-col items-center gap-3">
                <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                <div className="h-3 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {trendingCareers.map((c: any, idx: number) => {
              const badge = TRENDING_BADGES[idx % TRENDING_BADGES.length];
              const style = CAREER_STYLES[c.name] || { iconType: "generic", bg: "bg-slate-100", text: "text-slate-600" };
              const Icon = ICONS[style.iconType] || FaLayerGroup;
              const grad = GRADIENTS[style.iconType] || GRADIENTS.generic;
              return (
                <button
                  key={c.id}
                  onClick={() => goToCareer(c.slug)}
                  className="group flex flex-col text-left rounded-2xl border bg-card p-5 text-center transition-all hover:-translate-y-1.5 hover:shadow-xl hover:border-accent/40"
                >
                  <div className="flex items-start justify-between">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${grad} text-white shadow-md transition-transform group-hover:scale-110 group-hover:-rotate-3`}>
                      <Icon className="h-6 w-6" />
                    </span>
                    <Badge className={`${badge.color} text-[10px] border`}>{badge.icon} {badge.label}</Badge>
                  </div>
                  <p className="mt-4 text-sm md:text-base font-semibold leading-snug group-hover:text-accent transition-colors min-h-[2.5rem]">
                    {c.title}
                  </p>
                  <div className="mt-3 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                    <span className="rounded-full bg-muted px-2 py-0.5">💰 {clean(c.salaryEntry) || "—"}</span>
                  </div>
                  <div className="mt-auto flex items-center justify-center gap-1 pt-3 text-sm font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}