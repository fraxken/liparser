// Import Node.js Dependencies
import path from "path";
import fs from "fs/promises";

// Import Third-party Dependencies
import conformance from "@nodesecure/licenses-conformance";

// Import Internal Dependencies
import { parsePackageLicense, getLicenseFromString } from "./src/utils.js";

async function parseLicense(dest) {
  if (typeof dest !== "string") {
    throw new TypeError("dest must be a string!");
  }
  const licenses = [];
  const uniqueLicenseIds = [];
  let hasMultipleLicenses = false;

  const packageStr = await fs.readFile(path.join(dest, "package.json"), "utf-8");
  const detectedName = parsePackageLicense(JSON.parse(packageStr));
  const license = conformance(detectedName);
  uniqueLicenseIds.push(...license.uniqueLicenseIds);
  license.from = "package.json";
  licenses.push(license);

  const licenseFiles = (await fs.readdir(dest, { withFileTypes: true }))
    .filter((dirent) => dirent.isFile())
    .map((dirent) => dirent.name)
    .filter((value) => value.toLowerCase().includes("license"));

  for (const file of licenseFiles) {
    const str = await fs.readFile(path.join(dest, file), "utf-8");
    const licenseName = getLicenseFromString(str);
    if (licenseName !== "unknown license") {
      const license = conformance(licenseName);
      if (Reflect.has(license, "error")) {
        continue;
      }
      license.from = file;
      licenses.push(license);

      for (const localLicenseName of license.uniqueLicenseIds) {
        if (!uniqueLicenseIds.includes(localLicenseName)) {
          hasMultipleLicenses = true;
        }
        uniqueLicenseIds.push(localLicenseName);
      }
    }
  }

  return {
    uniqueLicenseIds: [...new Set(uniqueLicenseIds)],
    hasMultipleLicenses,
    licenses
  };
}

export default parseLicense;
