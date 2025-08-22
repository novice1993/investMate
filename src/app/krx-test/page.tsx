"use client";

import { useState } from "react";

export default function KrxTestPage() {
  const [rawData, setRawData] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchKrxData = async () => {
    setLoading(true);
    setError(null);
    setRawData("");
    try {
      const response = await fetch("/api/krx/securities?market=KOSPI");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch data");
      }
      const data = await response.json();
      setRawData(JSON.stringify(data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">KRX Data Fetch Test</h1>
      <button onClick={handleFetchKrxData} disabled={loading} className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400">
        {loading ? "Loading..." : "Fetch KOSPI Securities"}
      </button>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 border border-red-400 rounded">
          <p className="font-bold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {rawData && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Raw Fetched Data</h2>
          <pre className="bg-gray-100 p-4 rounded mt-2 overflow-auto max-h-[600px]">{rawData}</pre>
        </div>
      )}
    </div>
  );
}
