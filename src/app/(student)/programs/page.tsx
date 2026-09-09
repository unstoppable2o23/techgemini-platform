import { Metadata } from "next";
import ProgramSearchClient from "./program-search-client";

export const metadata: Metadata = {
  title: "Program Explorer",
  description: "Search the curated program catalog by qualification, discipline, and institution offer. Exact qualification labels, conservative admission routes, no invented figures.",
};

export default function ProgramsPage() {
  return <ProgramSearchClient />;
}