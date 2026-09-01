"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Globe, GraduationCap, MapPin, ExternalLink, CheckCircle2, AlertCircle, Clock, Info } from "lucide-react";

function freshnessBadge(freshness: string) {
  switch (freshness) {
    case "CURRENT":
      return <Badge variant="default" className="bg-green-600">Current</Badge>;
    case "RECENT":
      return <Badge variant="secondary">Recent</Badge>;
    case "HISTORICAL":
      return <Badge variant="outline">Historical</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function verificationBadge(status: string) {
  if (status === "VERIFIED") {
    return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Verified program</Badge>;
  }
  if (status === "CATEGORY_BASED") {
    return <Badge variant="secondary">Relevant institution</Badge>;
  }
  return <Badge variant="outline">Not yet verified</Badge>;
}

export default function UniversityProfilePage({ params, searchParams }: { params: { id: string }; searchParams: { dataset?: string; careerId?: string; studentId?: string } }) {
  const id = params.id;
  const dataset = (searchParams.dataset as "indian" | "global") || "global";
  const careerId = searchParams.careerId;
  const studentId = searchParams.studentId;

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      const url = `/api/universities/${id}/profile?dataset=${dataset}${careerId ? `&careerId=${careerId}` : ""}${studentId ? `&studentId=${studentId}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        setError(res.status === 404 ? "Institution not found" : "Failed to load profile");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setProfile(data);
      setLoading(false);
    }
    if (id) fetchProfile();
  }, [id, dataset, careerId, studentId]);

  if (loading) return <div className="p-6 pt-20 max-w-4xl mx-auto text-center text-muted-foreground">Loading profile...</div>;
  if (error) return <div className="p-6 pt-20 max-w-4xl mx-auto text-center text-destructive">{error}</div>;
  if (!profile) return null;

  const identity = profile.identity;
  const isEmpty = profile.isEmpty;

  return (
    <div className="space-y-6 p-6 pt-20 max-w-4xl mx-auto">
      {/* Identity */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            {identity.name}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <MapPin className="h-4 w-4" />
            {identity.country || "Not available"} {identity.state && identity.state !== "Not available" ? `· ${identity.state}` : ""} {identity.city && identity.city !== "Not available" ? `· ${identity.city}` : ""}
            <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded">{identity.dataset === "indian" ? "India institution" : "International university"}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Type: {identity.type} · Institution Type: {identity.institutionType} · Management: {identity.management || "Not available"}
          </p>
          {identity.website && identity.website !== "Not available" && (
            <a href={identity.website.startsWith("http") ? identity.website : `https://${identity.website}`} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1 mt-1">
              <ExternalLink className="h-3 w-3" /> {identity.website}
            </a>
          )}
        </div>
        {identity.qsRank && identity.qsRank !== "Not available" && (
          <Badge variant="outline">QS Rank: {identity.qsRank}</Badge>
        )}
      </div>

      {/* Career context (when opened from matching flow) */}
      {profile.studentContext && profile.studentContext.pathwayChain && (
        <Card className="border-accent">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> How this connects to you
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">{profile.studentContext.pathwayChain}</p>
            {profile.studentContext.fitTierLabel && (
              <div className="flex items-center gap-2">
                <Badge className={profile.studentContext.fitTier === "STRONG_FIT" ? "bg-green-600" : profile.studentContext.fitTier === "GOOD_FIT" ? "bg-blue-600" : profile.studentContext.fitTier === "POTENTIAL_FIT" ? "bg-amber-600" : "bg-muted"}>{profile.studentContext.fitTierLabel}</Badge>
                <span className="text-xs text-muted-foreground">{profile.studentContext.fitTierExplanation}</span>
              </div>
            )}
            {profile.studentContext.reasons && profile.studentContext.reasons.length > 0 && (
              <ul className="text-xs text-muted-foreground list-disc ml-4">
                {profile.studentContext.reasons.slice(0, 3).map((r: string, i: number) => <li key={i}>{r}</li>)}
              </ul>
            )}
            <p className="text-xs">Match: {profile.studentContext.matchScore ?? "Not available"} · Confidence: {profile.studentContext.confidenceScore ?? "Not available"}</p>
            <p className="text-xs text-muted-foreground italic">Fit describes how well this matches your profile — not your chance of admission.</p>
          </CardContent>
        </Card>
      )}

      {/* Programs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" /> Programs
            <span className="text-xs font-normal text-muted-foreground">({profile.programs.total} total, {profile.programs.verifiedCount} verified)</span>
            {profile.freshness.overall !== "UNKNOWN" && freshnessBadge(profile.freshness.overall)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEmpty ? (
            <div className="text-center py-8 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No verified programs on record for this institution yet.</p>
              <p className="text-xs mt-1">Programs will appear here once verified via official institution sources.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(profile.programs.byDegree).map(([degree, progs]: [string, any]) => (
                <div key={degree}>
                  <h3 className="font-medium text-sm mb-2">{degree}</h3>
                  <div className="space-y-2">
                    {(progs as any[]).map((prog: any) => (
                      <div key={prog.id} className="border rounded-lg p-3 flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium text-sm">{prog.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {prog.level || "Not available"} {prog.studyMode ? `· ${prog.studyMode}` : ""} {prog.duration ? `· ${prog.duration}` : ""}
                            {prog.specializationName ? ` · ${prog.specializationName}` : ""}
                          </p>
                          {prog.sourceUrl && (
                            <a href={prog.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline flex items-center gap-1 mt-1">
                              <ExternalLink className="h-3 w-3" /> Source
                            </a>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {verificationBadge(prog.verificationStatus)}
                          {freshnessBadge(prog.freshness)}
                          <span className="text-xs text-muted-foreground">
                            {prog.verifiedAt ? `verified ${new Date(prog.verifiedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}` : "verified date unknown"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {/* Category-based fallback note */}
              {profile.programs.verifiedCount < profile.programs.total && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Some programs are “Relevant institution” (category-based) — exact program not yet verified.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Explicit absence markers */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Profile details</CardTitle>
        </CardHeader>
        <CardContent className="text-xs space-y-1 text-muted-foreground">
          <p>Country: {identity.country}</p>
          <p>State: {identity.state}</p>
          <p>District: {identity.district}</p>
          <p>Website: {identity.website}</p>
          <p>QS Rank: {identity.qsRank}</p>
          <p className="pt-2 flex items-center gap-1"><Clock className="h-3 w-3" /> Freshness: {profile.freshness.overall} {profile.freshness.overall !== "UNKNOWN" ? `· most recent verified ${new Date().toLocaleDateString()}` : ""}</p>
        </CardContent>
      </Card>

      {/* Future-proofing note (hidden, for Phase 20/21) */}
      <div className="text-xs text-muted-foreground text-center">
        Profile API supports future fit tiers (Strong/Good/Potential/Explore) and comparison — no refactor needed for Phase 20/21.
      </div>
    </div>
  );
}
