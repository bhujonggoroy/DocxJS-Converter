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
  if (!markdown) return '';
  let s = markdown;

  // 1. Multi-part subscripts with commas: F_v1, v2 / F_v2, v1 / F_1, v / F_v, 1
  s = s.replace(/\bF_\{?v?1\s*,\s*v?2\}?/gi, 'F<sub>ν₁, ν₂</sub>')
       .replace(/\bF_\{?v?2\s*,\s*v?1\}?/gi, 'F<sub>ν₂, ν₁</sub>')
       .replace(/\bF_\{?1\s*,\s*v\}?/gi, 'F<sub>1, ν</sub>')
       .replace(/\bF_\{?v\s*,\s*1\}?/gi, 'F<sub>ν, 1</sub>')
       .replace(/\bF_\{?ν1\s*,\s*ν2\}?/gi, 'F<sub>ν₁, ν₂</sub>')
       .replace(/\bF_\{?ν2\s*,\s*ν1\}?/gi, 'F<sub>ν₂, ν₁</sub>')
       .replace(/\bF_\{?ν₁\s*,\s*ν₂\}?/gi, 'F<sub>ν₁, ν₂</sub>')
       .replace(/\bF_\{?ν₂\s*,\s*ν₁\}?/gi, 'F<sub>ν₂, ν₁</sub>')
       .replace(/\bF_\{?1\s*,\s*ν\}?/gi, 'F<sub>1, ν</sub>');

  // 2. Chi-square forms with degrees of freedom: chi^2_v1, chi^2_v2, chi^2_v, chi^2_k
  s = s.replace(/\\?chi\^?2_\{?v?([1₁])\}?/gi, 'χ²<sub>ν₁</sub>')
       .replace(/\\?chi\^?2_\{?v?([2₂])\}?/gi, 'χ²<sub>ν₂</sub>')
       .replace(/\\?chi\^?2_\{?v\}?/gi, 'χ²<sub>ν</sub>')
       .replace(/\\?chi\^?2_\{?([0-9a-zA-Zνμk]+)\}?/gi, 'χ²<sub>$1</sub>')
       .replace(/\\?chi\^?2\b/gi, 'χ²');

  // 3. Student t forms: t_v^2, t_ν^2, t^2_v, t^2_ν, t_v, t_ν
  s = s.replace(/\b\*?t\*?_\{?[vν]\}?\^2\b/gi, 't<sub>ν</sub><sup>2</sup>')
       .replace(/\b\*?t\*?\^2_\{?[vν]\}?\b/gi, 't<sub>ν</sub><sup>2</sup>')
       .replace(/\b\*?t\*?_\{?[vν]\}?\b/gi, 't<sub>ν</sub>')
       .replace(/\b\*?t\*?ᵥ\^2\b/gi, 't<sub>ν</sub><sup>2</sup>')
       .replace(/\b\*?t\*?ᵥ\b/gi, 't<sub>ν</sub>');

  // 4. LaTeX nu with subscripts
  s = s.replace(/\\*nu<sub>([0-9]+)<\/sub>/gi, (m, n) => {
    const subMap: Record<string, string> = { '1': '₁', '2': '₂', '3': '₃', '4': '₄' };
    return 'ν' + (subMap[n] || n);
  });
  s = s.replace(/\\*nu_([0-9]+)/gi, (m, n) => {
    const subMap: Record<string, string> = { '1': '₁', '2': '₂', '3': '₃', '4': '₄' };
    return 'ν' + (subMap[n] || n);
  });

  // 5. Underscore parenthesized or braced: _(something), _{something}
  s = s.replace(/_\(([^)]+)\)/g, '<sub>$1</sub>')
       .replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
       .replace(/_\[([^\]]+)\]/g, '<sub>$1</sub>')
       .replace(/\^\(([^)]+)\)/g, '<sup>$1</sup>')
       .replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>');

  // 6. Spelled-out Greek names & LaTeX macros
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

  // 7. Math symbols & relations
  s = s.replace(/\\sim/g, '~')
       .replace(/\\approx/g, '≈')
       .replace(/\\le(q)?\b/g, '≤')
       .replace(/\\ge(q)?\b/g, '≥')
       .replace(/\\neq\b/g, '≠')
       .replace(/\\pm\b/gi, '±')
       .replace(/\\times\b/gi, '×')
       .replace(/\\cdot\b/gi, '·')
       .replace(/\\infty\b/gi, '∞')
       .replace(/\\partial\b/gi, '∂')
       .replace(/\\sqrt\{([^}]+)\}/g, '√($1)')
       .replace(/\\text\{([^}]+)\}/g, '$1')
       .replace(/\\mathrm\{([^}]+)\}/g, '$1')
       .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1) / ($2)');

  // 8. Latin v vs Greek nu in degrees of freedom (Fisher F, Student t, Chi-square)
  s = s.replace(/\bv1\b/g, 'ν₁')
       .replace(/\bv2\b/g, 'ν₂')
       .replace(/\bv([₁1])\b/g, 'ν₁')
       .replace(/\bv([₂2])\b/g, 'ν₂')
       .replace(/\bν[1]\b/g, 'ν₁')
       .replace(/\bν[2]\b/g, 'ν₂');

  // 9. Fix statistical degrees of freedom in subscripts
  s = s.replace(/<sub>([^<]*)v([12])([^<]*)<\/sub>/gi, '<sub>$1ν$2$3</sub>')
       .replace(/<sub>([^<]*)v([₁₂])([^<]*)<\/sub>/gi, '<sub>$1ν$2$3</sub>')
       .replace(/<sub>([^<]*)\bv\b([^<]*)<\/sub>/gi, '<sub>$1ν$2</sub>')
       .replace(/<sub>([^<]*)ᵥ([^<]*)<\/sub>/gi, '<sub>$1ν$2</sub>');

  // 10. Superscript power on closing sub tags e.g. </sub>^2 or </sub>²
  s = s.replace(/<\/sub>\^([0-9]+)/g, '</sub><sup>$1</sup>')
       .replace(/<\/sub>²/g, '</sub><sup>2</sup>')
       .replace(/<\/sub>³/g, '</sub><sup>3</sup>');

  // 11. Convert raw single underscore identifier if still following a variable
  s = s.replace(/([a-zA-Zχ])_([0-9a-zA-Zνμσαβγ]+)/g, '$1<sub>$2</sub>');
  s = s.replace(/([a-zA-Zχ])\^([0-9a-zA-Zνμσαβγ]+)/g, '$1<sup>$2</sup>');

  // 12. Clean nested/adjacent tags
  s = s.replace(/<sub><sub>/g, '<sub>').replace(/<\/sub><\/sub>/g, '</sub>');
  s = s.replace(/<sup><sup>/g, '<sup>').replace(/<\/sup><\/sup>/g, '</sup>');
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
      defaultModel: 'gemini-3.1-flash-lite',
      serverSecured: true,
    });
  });

  // Secure server-side AI conversion route (keeps GEMINI_API_KEY hidden from browser)
  app.post('/api/convert', async (req, res) => {
    try {
      const { text, apiKey, model = 'gemini-3.1-flash-lite' } = req.body;

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: 'Text is required for conversion.' });
      }

      // Collect available keys: prioritize system environment key, fallback to client-supplied key if any
      const candidateKeys: string[] = [];
      if (process.env.GEMINI_API_KEY) {
        candidateKeys.push(process.env.GEMINI_API_KEY.trim());
      }
      if (apiKey && typeof apiKey === 'string' && apiKey.trim()) {
        const trimmed = apiKey.trim();
        if (!candidateKeys.includes(trimmed)) {
          candidateKeys.push(trimmed);
        }
      }

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

      // Build prioritized list of candidate models (avoiding gemini-3.6-flash which has strict 20 RPM limits)
      let requested = model;
      if (requested.includes('2.0') || requested.includes('2.5') || requested === 'gemini-3.6-flash') {
        requested = 'gemini-3.1-flash-lite';
      }

      const candidateModels = Array.from(
        new Set([requested, 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'])
      );

      let resultText = '';
      let usedModel = '';
      let lastError: any = null;

      // Try keys and models in order
      if (candidateKeys.length > 0) {
        outerLoop: for (const keyToTry of candidateKeys) {
          const ai = new GoogleGenAI({ apiKey: keyToTry });
          for (const candidate of candidateModels) {
            try {
              console.log(`Attempting conversion with model: ${candidate}`);
              const response = await ai.models.generateContent({
                model: candidate,
                contents: prompt,
              });

              resultText = response.text || '';
              if (resultText && resultText.trim()) {
                usedModel = candidate;
                break outerLoop;
              }
            } catch (err: any) {
              lastError = err;
              const msg = err?.message || String(err);
              console.warn(`Model ${candidate} failed with key:`, msg);

              const isRateOrQuotaOrOverload =
                msg.includes('503') ||
                msg.includes('high demand') ||
                msg.includes('UNAVAILABLE') ||
                msg.includes('429') ||
                msg.includes('RESOURCE_EXHAUSTED') ||
                msg.includes('Quota exceeded') ||
                msg.includes('free_tier_requests');

              if (isRateOrQuotaOrOverload) {
                await new Promise((r) => setTimeout(r, 300));
                continue;
              } else {
                continue;
              }
            }
          }
        }
      }

      // If AI models were completely unavailable or hit external quota limits, fallback to built-in academic normalizer
      if (!resultText || !resultText.trim()) {
        console.warn('Falling back to built-in academic normalizer engine');
        resultText = postProcessEquations(text);
        usedModel = 'built-in-math-engine';
      }

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

      res.json({ text: resultText, modelUsed: usedModel });
    } catch (err: any) {
      console.error('Conversion fallback error:', err);
      // Even in catch, return normalized text so user operation never fails
      const fallbackCleaned = postProcessEquations(req.body?.text || '');
      if (fallbackCleaned) {
        return res.json({ text: fallbackCleaned, modelUsed: 'built-in-math-engine' });
      }
      res.status(500).json({ error: 'Failed to process document.' });
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
