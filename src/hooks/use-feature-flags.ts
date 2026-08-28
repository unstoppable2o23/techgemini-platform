"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export interface StudentFeatureFlags {
  collegeSearch: boolean;
  collegeFinder: boolean;
  aiOddsCalculator: boolean;
  mockTests: boolean;
  scholarshipHub: boolean;
  appointments: boolean;
  webinars: boolean;
  analytics: boolean;
  careerLibrary: boolean;
}

const EMPTY_FLAGS: StudentFeatureFlags = {
  collegeSearch: false,
  collegeFinder: false,
  aiOddsCalculator: false,
  mockTests: false,
  scholarshipHub: false,
  appointments: false,
  webinars: false,
  analytics: false,
  careerLibrary: false,
};

const ALL_ENABLED: StudentFeatureFlags = {
  collegeSearch: true,
  collegeFinder: true,
  aiOddsCalculator: true,
  mockTests: true,
  scholarshipHub: true,
  appointments: true,
  webinars: true,
  analytics: true,
  careerLibrary: true,
};

export function useFeatureFlags() {
  const { data: session } = useSession();
  const [flags, setFlags] = useState<StudentFeatureFlags>(ALL_ENABLED);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.role === "STUDENT") {
      fetch("/api/student/feature-flags")
        .then((res) => res.json())
        .then((data) => setFlags(data.flags || EMPTY_FLAGS))
        .catch(() => setFlags(EMPTY_FLAGS))
        .finally(() => setLoading(false));
    } else {
      setFlags(ALL_ENABLED);
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (session?.user?.role !== "STUDENT") return;
    function onFocus() {
      fetch("/api/student/feature-flags")
        .then((res) => res.json())
        .then((data) => setFlags(data.flags || EMPTY_FLAGS))
        .catch(() => {});
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [session]);

  return { flags, loading };
}
