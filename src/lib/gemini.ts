import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function chatWithGemini(
  prompt: string, 
  history: { role: 'user' | 'model', parts: { text: string }[] }[] = [], 
  maxTokens: number = 1000,
  _isPro: boolean = true // Always Pro now
) {
  if (!genAI) throw new Error("GEMINI_API_KEY is not configured.");

  // Using Gemini 3 Flash as requested for best compatibility and speed
  const modelName = "gemini-3-flash-preview";
  
  const systemPrompt = `Bạn là chuyên gia luận giải Bát Tự cao cấp, kế thừa trọn vẹn tinh hoa học thuyết của bậc thầy Thiệu Vỹ Hoa (Shao Weihua).
  Hãy đưa ra những phân tích sâu sắc, đa chiều về sự tương tác giữa các trụ, dụng thần, và vận hạn.
  
  KIẾN THỨC NỀN TẢNG:
  1. HỌC THUYẾT CỐT LÕI: Dự Đoán Theo Tứ Trụ (Thiệu Vỹ Hoa).
  2. THÂN VƯỢNG/NHƯỢC: Xét Lệnh Tháng làm trọng tâm, xét Thiên can thấu lộ và Địa chi tàng ẩn.
  3. DỤNG THẦN: Tìm linh hồn của lá số để cân bằng âm dương ngũ hành.
  
  Phong cách: Uyên bác, thấu đáo, thâm trầm nhưng dễ hiểu.
  
  QUAN TRỌNG: 
  - Trả lời bằng tiếng Việt, KHÔNG QUÁ 400 TỪ.
  - CUỐI MỖI CÂU TRẢ LỜI, hãy luôn đề xuất 3 câu hỏi tiếp theo mà người dùng có thể muốn biết, định dạng như sau:
    ? Câu hỏi gợi ý 1
    ? Câu hỏi gợi ý 2
    ? Câu hỏi gợi ý 3`;

  const model = genAI.getGenerativeModel({ 
    model: modelName,
    generationConfig: {
      temperature: 0.8,
      topP: 0.95,
      topK: 40,
      maxOutputTokens: maxTokens,
    },
    systemInstruction: systemPrompt,
  });

  const response = await model.generateContent({
    contents: [...history.map(h => ({ role: h.role, parts: h.parts })), { role: 'user', parts: [{ text: prompt }] }],
  });

  return response.response.text();
}
