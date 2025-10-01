import yahooFinance from "yahoo-finance2";

export default async function YahooFinanceTest() {
  const symbol = "068270.KS";
  let quote = null;
  let error = null;

  try {
    quote = await yahooFinance.quote(symbol);
  } catch (err) {
    if (err instanceof Error) {
      error = err.message;
    } else {
      error = "An unknown error occurred.";
    }
    console.error(err);
  }

  return (
    <div>
      <h1>Yahoo Finance Test for {symbol}</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {quote && (
        <pre>
          <code>{JSON.stringify(quote, null, 2)}</code>
        </pre>
      )}
    </div>
  );
}
