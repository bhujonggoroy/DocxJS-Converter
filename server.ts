import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function postProcessEquations(markdown: string): string {
  let s = markdown;

  // LaTeX nu with subscripts
  s = s.replace(/\\*nu<sub>([0-9]+)<\/sub>/gi, (m, n) => {
    const subMap: Record<string, string> = { '1': '₁', '2': '₂', '3': '₃', '4': '₄' };
    return 'ν' + (subMap[n] || n);
  });
  s = s.replace(/\\*nu_([0-9]+)/gi, (m, n) => {
    const subMap: Record<string, string> = { '1': '₁', '2': '₂', '3': '₃', '4': '₄' };
    return 'ν' + (subMap[n] || n);
  });

  // Spelled-out Greek names & LaTeX macros
  s = s.replace(/\\*chi\b/gi, 'χ')
       .replace(/\\*alpha\b/gi, 'α')
       .replace(/\\*beta\b/gi, 'β')
       .replace(/\\*gamma\b/gi, 'γ')
       .replace(/\\*delta\b/gi, 'δ')
       .replace(/\\*theta\b/gi, 'θ')
       .replace(/\\*lambda\b/gi, 'λ')
       .replace(/\\*mu\b/gi, 'μ')
       .replace(/\\*nu\b/gi, 'ν')
       .replace(/\\*pi\b/gi, 'π')
       .replace(/\\*sigma\b/gi, 'σ')
       .replace(/\\*omega\b/gi, 'ω');

  // Math symbols & relations
  s = s.replace(/\\sim/g, '~')
       .replace(/\\approx/g, '≈')
       .replace(/\\le(q)?\b/g, '≤')
       .replace(/\\ge(q)?\b/g, '≥')
       .replace(/\\neq\b/g, '≠')
       .replace(/\\pm\b/g, '±')
       .replace(/\\times\b/g, '×')
       .replace(/\\cdot\b/g, '·')
       .replace(/\\infty\b/g, '∞')
       .replace(/\\partial\b/g, '∂')
       .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
       .replace(/\\text\{([^}]+)\}/g, '$1')
       .replace(/\\mathrm\{([^}]+)\}/g, '$1')
       .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)');

  // Underscore followed by parens/braces anywhere (e.g. *F*_(v₁, v₂), χ²_(v₁), F_(1, v))
  s = s.replace(/_\(([^)]+)\)/g, '<sub>$1</sub>')
       .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
       .replace(/_\[([^\]]+)\]/g, '<sub>$1</sub>');

  // Fix \nu or ν followed by subscript tag: ν<sub>1</sub> -> ν₁
  s = s.replace(/\\?ν<sub>([0-9]+)<\/sub>/gi, (m, n) => {
    const subMap: Record<string, string> = { '1': '₁', '2': '₂', '3': '₃', '4': '₄' };
    return 'ν' + (subMap[n] || n);
  });
  s = s.replace(/\\ν/g, 'ν');

  // Latin v vs Greek nu in degrees of freedom (Fisher F, Student t, Chi-square)
  s = s.replace(/\bv[₁1]\b/gi, 'ν₁')
       .replace(/\bv[₂2]\b/gi, 'ν₂')
       .replace(/([(/ \t])v[₁1]([)/ \t,])/gi, '$1ν₁$2')
       .replace(/([(/ \t])v[₂2]([)/ \t,])/gi, '$1ν₂$2')
       .replace(/v[₁1]/gi, 'ν₁')
       .replace(/v[₂2]/gi, 'ν₂');

  // Fix statistical degrees of freedom in subscripts
  s = s.replace(/<sub>([^<]*)v([12])([^<]*)<\/sub>/gi, '<sub>$1ν$2$3</sub>')
       .replace(/<sub>([^<]*)v([₁₂])([^<]*)<\/sub>/gi, '<sub>$1ν$2$3</sub>')
       .replace(/<sub>([^<]*)\bv\b([^<]*)<\/sub>/gi, '<sub>$1ν$2</sub>')
       .replace(/<sub>([^<]*)ᵥ([^<]*)<\/sub>/gi, '<sub>$1ν$2</sub>');

  // Chi-squared with degrees of freedom: χ²_v1, χ²_(v₁), χ²_1
  s = s.replace(/χ\^?2_([0-9a-zA-Zν₁₂]+)/gi, 'χ²<sub>$1</sub>');

  // Subscript / superscript on t: *t*ᵥ², t_v^2, t_v²
  s = s.replace(/(\*?t\*?)ᵥ²/gi, '$1<sub>ν</sub><sup>2</sup>')
       .replace(/(\*?t\*?)_v\^?2/gi, '$1<sub>ν</sub><sup>2</sup>')
       .replace(/(\*?t\*?)_v²/gi, '$1<sub>ν</sub><sup>2</sup>')
       .replace(/(\*?t\*?)_ν\^?2/gi, '$1<sub>ν</sub><sup>2</sup>')
       .replace(/(\*?t\*?)_ν²/gi, '$1<sub>ν</sub><sup>2</sup>')
       .replace(/(\*?t\*?)_v\b/gi, '$1<sub>ν</sub>')
       .replace(/(\*?t\*?)ᵥ\b/gi, '$1<sub>ν</sub>')
       .replace(/(\*?t\*?)_ν\b/gi, '$1<sub>ν</sub>');

  // Superscript 2 on subscripts e.g. <sub>ν</sub>²
  s = s.replace(/<sub>([0-9a-zA-Zνμσαβγ]+)<\/sub>²/g, '<sub>$1</sub><sup>2</sup>');

  // Convert raw single underscore identifier if still following a variable
  s = s.replace(/([a-zA-Zχ])_([0-9a-zA-Zνμσαβγ]+)/g, '$1<sub>$2</sub>');
  s = s.replace(/([a-zA-Zχ])\^([0-9a-zA-Zνμσαβγ]+)/g, '$1<sup>$2</sup>');

  // Clean adjacent tags
  s = s.replace(/<\/sub><sub>/g, '');
  s = s.replace(/<\/sup><sup>/g, '');

  return s;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Check server configuration & key availability
  app.get('/api/status', (req, res) => {
    const hasServerKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      status: 'ok',
      hasServerKey,
      defaultModel: 'gemini-3.6-flash',
      serverSecured: true,
    });
  });

  // Secure server-side AI conversion route (keeps GEMINI_API_KEY hidden from browser)
  app.post('/api/convert', async (req, res) => {
    try {
      const { text, apiKey, model = 'gemini-3.6-flash' } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Text is required for conversion.' });
      }

      const activeKey = apiKey?.trim() || process.env.GEMINI_API_KEY;
      if (!activeKey) {
        return res.status(400).json({
          error: 'No Gemini API key found. Please provide an API key or configure GEMINI_API_KEY.',
        });
      }

      // Initialize Google GenAI client lazily & securely
      const ai = new GoogleGenAI({ apiKey: activeKey });

      const prompt = `You are an expert academic mathematical document formatter and typesetter.
Transform the user's raw study notes from Google NotebookLM into professional, publication-quality academic notes for Microsoft Word (.docx) export.

CRITICAL EQUATION & MATHEMATICAL STANDARDS:
1. SUBSCRIPTS & SUPERSCRIPTS:
   - NEVER leave raw underscores (e.g. '_v1', '_v2', '_1, v', 't_v') or raw carets (e.g. '^2', '^n') in the text.
   - Wrap ALL subscripts in HTML <sub>...</sub> tags and superscripts in HTML <sup>...</sup> tags:
     * 'F_v1, v2' -> 'F<sub>ν₁, ν₂</sub>'
     * 'chi^2_v1' or 'χ²_v1' -> 'χ²<sub>ν₁</sub>'
     * 'chi^2_v2' or 'χ²_v2' -> 'χ²<sub>ν₂</sub>'
     * 'F_1, v = t_v^2' or 'F_1, v = t_v²' -> 'F<sub>1, ν</sub> = t<sub>ν</sub>²'
     * 'E(F) = v2 / (v2 - 2)' -> 'E(F) = ν₂ / (ν₂ - 2) for ν₂ > 2'
     * '1 / F ~ F_v2, v1' -> '1 / F ~ F<sub>ν₂, ν₁</sub>'

2. GREEK LETTERS & STATISTICAL SYMBOLS:
   - In statistical distributions (Fisher's F-distribution, Student's t-distribution, degrees of freedom) and physics, degrees of freedom is ALWAYS the Greek letter nu: ν, ν₁, ν₂. NEVER use Latin 'v'.
   - Use standard mathematical symbols: χ (chi), μ (mu), σ (sigma), α (alpha), β (beta), λ (lambda), θ (theta), ε (epsilon), etc.
   - Use proper mathematical relations: ~ (distributed as), ≈ (approximately), ± (plus-minus), ∓, ×, ·, ÷, √, ∑, ∫, ≤, ≥, ≠, ≡.

3. FRACTIONS & FORMULA DISPLAY:
   - For standalone key formulas and definitions, present them cleanly using display equation blocks:
     $$F = \\frac{U / \\nu_1}{V / \\nu_2}$$
     where U ~ χ²<sub>ν₁</sub> and V ~ χ²<sub>ν₂</sub>
   - Or clean display notation with clear division:
     F = (U / ν₁) ÷ (V / ν₂)

4. STRICT PRESERVATION:
   - Preserve 100% of the original content, theorems, explanations, examples, and details.
   - Do NOT summarize or omit anything.

5. OUTPUT FORMAT:
   - Output ONLY clean Markdown text with <sub> and <sup> tags for equations.
   - Do NOT wrap in \`\`\`markdown code blocks.
   - Do NOT add polite introductory or concluding remarks.

RAW NOTES FROM NOTEBOOKLM:

${text}`;

      // Support gemini-3.6-flash or gemini-3.8-flash (fallback safely if user specifies older model)
      const selectedModel = model.includes('2.0') || model.includes('2.5') ? 'gemini-3.6-flash' : model;

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
      });

      let resultText = response.text || '';
      resultText = resultText.trim();
      if (resultText.startsWith('```markdown')) {
        resultText = resultText.slice(11);
      } else if (resultText.startsWith('```')) {
        resultText = resultText.slice(3);
      }
      if (resultText.endsWith('```')) {
        resultText = resultText.slice(0, -3);
      }

      // Post-process to ensure no stray underscores or broken subscripts remain
      resultText = postProcessEquations(resultText.trim());

      res.json({ text: resultText });
    } catch (err: any) {
      console.error('Conversion error:', err);
      const errMsg = err?.message || 'Failed to process document with Gemini AI.';
      res.status(500).json({ error: errMsg });
    }
  });

  // Mount Vite middleware in development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
