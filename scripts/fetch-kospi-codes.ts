import fs from "fs/promises";
import path from "path";
import { KrxSecurityRepository } from "../src/core/infrastructure/security-krx.infra";

async function main() {
  console.log("Fetching KOSPI market securities from KRX...");

  try {
    const securities = await KrxSecurityRepository.getMarketSecurities("KOSPI");

    if (!securities || securities.length === 0) {
      console.error("No securities found. Exiting.");
      return;
    }

    const codeList = securities.map((security) => ({
      symbol: security.symbol,
      name: security.name,
    }));

    const outputPath = path.join(process.cwd(), "kospi_codes.json");
    await fs.writeFile(outputPath, JSON.stringify(codeList, null, 2));

    console.log(`Successfully fetched and saved ${codeList.length} KOSPI codes to ${outputPath}`);
  } catch (error) {
    console.error("An error occurred during the fetch process:", error);
    process.exit(1);
  }
}

main();
