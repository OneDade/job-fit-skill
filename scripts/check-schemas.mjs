import { readFile } from "node:fs/promises";
const source = await readFile("src/schemas.ts", "utf8"); const readme = await readFile("README.md", "utf8");
for (const value of ["1.0.0", "analyze", "optimize-resume", "render-resume", "delete-local-data"]) if (!source.includes(value) || !readme.includes(value)) { console.error(`schema/docs drift: ${value}`); process.exit(1); }
console.log("schema drift: OK");
