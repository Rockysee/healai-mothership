import type { Metadata } from "next";
import SiloShell from "@/components/SiloShell";
import AIGuruSection from "@/components/AIGuruSection";

export const metadata: Metadata = {
  title: "AI Guru · AIrJun",
  description: "Chat with deep-persona AI Gurus — Werner Chat, Gen-AI Fox and more. Get guided insight on learning, growth and resilience.",
};

export default function MentorPage() {
  return (
    <SiloShell title="AI Guru" accent="#f59e0b">
      <AIGuruSection />
    </SiloShell>
  );
}
