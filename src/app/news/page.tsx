"use client";

import { Navigation } from "@/components/common/Navigation";
import { NewsListSection } from "@/components/news/NewsListSection";

export default function NewsPage() {
  return (
    <div className="min-h-screen bg-light-gray-5">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6">
        <NewsListSection variant="full" showHeader={true} showFilter={true} />
      </div>
    </div>
  );
}
