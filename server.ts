import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

      const prompt = `You are an expert academic document formatter and LaTeX-to-Unicode math converter.
The user provides raw study notes or summaries copied from Google NotebookLM. These notes often contain raw or messy LaTeX math expressions ($...$, $$...$$, \\frac, \\sqrt, \\int, etc.), inconsistent formatting, and uneven line breaks.

YOUR STRICT DIRECTIVES:
1. PRESERVE 100% OF THE ORIGINAL CONTENT:
   - Do NOT summarize, condense, delete, or skip any notes, examples, or definitions.
   - Maintain every single concept, theorem, proof, and detail provided.

2. CONVERT ALL LATEX & MATH EXPRESSIONS INTO CLEAN UNICODE NOTATION:
   Standard Word (.docx) files without equation plugins cannot render raw LaTeX commands.
   Convert ALL math and LaTeX syntax into clean, standard Unicode mathematical characters suitable for plain typography:
   - Superscripts: x², x³, xⁿ, e⁻ˣ, 10⁵
   - Subscripts: x₀, x₁, aᵢ, H₂O
   - Fractions: Use clean slash format (e.g. (a + b) / c or a/b or ½, ⅓, ¼ where appropriate)
   - Roots: √x, ∛(x + y), √(b² - 4ac)
   - Operators & Sums: ±, ∓, ×, ÷, ·, ∑, ∏, ∫, ∮, ∂, ∇, ∞, ≈, ≠, ≤, ≥, ≡, ∝, ∈, ∉, ⊂, ⊆, ∪, ∩
   - Arrows: →, ←, ↔, ⇒, ⇐, ⇔
   - Greek Letters: α, β, γ, δ, ε, θ, λ, μ, π, ρ, σ, τ, φ, ψ, ω, Δ, Γ, Θ, Λ, Σ, Φ, Ψ, Ω
   - Vectors: use bold **v** or arrow v⃗
   - Strip all LaTeX syntax wrappers like \\text{...}, \\mathbf{...}, $, $$, \\left, \\right, \\displaystyle, etc.

3. STRUCTURE AS STANDARD MARKDOWN:
   - Use # for Document / Major Subject Title (Heading 1)
   - Use ## for Main Sections / Topics (Heading 2)
   - Use ### for Subtopics / Concepts (Heading 3)
   - Use **bold** for key terms, definitions, and variable names
   - Use *italic* for emphasis
   - Use - for bullet points
   - Use 1., 2., 3. for numbered sequential steps
   - Use > for key theorems, laws, formulas, or takeaways

4. OUTPUT FORMAT:
   - Output ONLY the clean Markdown text.
   - Do NOT wrap the entire response in a markdown code block (do not start with \`\`\`markdown).
   - Do NOT add polite commentary like "Here is your converted text" or "Hope this helps".

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

      res.json({ text: resultText.trim() });
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
