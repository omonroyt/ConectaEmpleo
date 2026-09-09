// Genera public/demo/cv-ejemplo.pdf: un PDF mínimo válido escrito a mano (sin dependencias),
// usado por documents.uploadCV en el flujo de demo del candidato.
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "public", "demo");
mkdirSync(outDir, { recursive: true });

const lines = [
  "CV de ejemplo - Conecta Empleo",
  "Candidato Demo",
  "Auxiliar administrativo / operativo",
  "",
  "Experiencia:",
  "- 2 anios en logistica y atencion a clientes.",
  "",
  "Este documento es un PDF minimo generado para la demo del flujo de carga de CV.",
];

const content = lines.map((line, i) => `BT /F1 12 Tf 50 ${750 - i * 18} Td (${line.replace(/[()\\]/g, "")}) Tj ET`).join("\n");

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  null, // el stream (objeto 5) se arma aparte, con su propio Length
];

let pdf = "%PDF-1.4\n";
const offsets = [];

function addObject(index, body) {
  offsets[index] = pdf.length;
  pdf += `${index} 0 obj\n${body}\nendobj\n`;
}

addObject(1, objects[0]);
addObject(2, objects[1]);
addObject(3, objects[2]);
addObject(4, objects[3]);
addObject(5, `<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

const xrefStart = pdf.length;
pdf += `xref\n0 6\n0000000000 65535 f \n`;
for (let i = 1; i <= 5; i++) {
  pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
}
pdf += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

writeFileSync(join(outDir, "cv-ejemplo.pdf"), pdf, "latin1");
console.log("public/demo/cv-ejemplo.pdf generado.");
