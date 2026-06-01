import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size limits for images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Endpoint for Logo Generation
app.post("/api/logo/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "الرجاء إدخال وصف للشعار المطلوب" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(403).json({ 
      error: "مفتاح API الخاص بـ Gemini غير مهيأ في السيرفر. يرجى توفير مفتاح في ملف الإعدادات." 
    });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `${prompt}. A premium clean minimalist vector logo badge with smooth gradients, centered on a solid background, modern tech and luxury corporate branding, high resolution 1K, no text, no captions.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    let base64Image = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          base64Image = part.inlineData.data;
          break;
        }
      }
    }

    if (base64Image) {
      return res.json({ 
        success: true, 
        imageUrl: `data:image/png;base64,${base64Image}` 
      });
    } else {
      return res.status(500).json({ 
        error: "لم يقم النموذج بإرجاع بيانات الصورة المتوقعة." 
      });
    }
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    return res.status(500).json({ 
      error: error?.message || "فشل توليد الشعار عبر الذكاء الاصطناعي بسبب خطأ في الخادم." 
    });
  }
});

// Start the server with Vite middleware support
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
