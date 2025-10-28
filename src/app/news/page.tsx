"use client";

import React from "react";
import { NewsListSection } from "@/components/news/NewsListSection";

export default function NewsPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <NewsListSection variant="full" showHeader={true} showFilter={true} />
    </div>
  );
}
