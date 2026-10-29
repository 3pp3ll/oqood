// عقود — دالة قراءة العقود المصوّرة (سكانر أو جوال)
// للمالك فقط. تستقبل صور الصفحات بالترتيب، وتفرّغ نص العقد عبر نموذج يقرأ الصور في OpenRouter،
// وتشيل البيانات الشخصية وتحط مكانها خانات. المفتاح من أسرار Supabase (OPENROUTER_KEY).
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const DEFAULT_MODEL = Deno.env.get("OCR_MODEL") || "google/gemini-2.5-flash";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const PROMPT = `أنت تفرّغ نص عقد عربي من صور صفحاته (مصوّرة بالسكانر أو الجوال). الصور مرتبة حسب صفحات العقد.
المطلوب:
1. انسخ نص العقد كما هو بدقة وبنفس ترتيب البنود وترقيمها وصياغتها. لا تلخّص ولا تعيد الصياغة ولا تضف شيئاً من عندك.
2. تجاهل الكليشة المكررة في أعلى وأسفل كل صفحة (الشعار، العنوان البريدي، الهاتف، السجل التجاري، أرقام الصفحات، ختم الشركة).
3. الجداول: اكتب كل صف في سطر، والخلايا مفصولة بـ " | "، وابدأ بصف العناوين.
4. أخفِ البيانات الشخصية وضع مكانها خانة بين قوسين مربعين:
   أسماء الأشخاص ← [اسم الطرف الأول] أو [اسم الطرف الثاني] أو [اسم الموظف] حسب السياق،
   رقم الهوية أو الإقامة ← [رقم الهوية]، الجوال والهاتف ← [رقم الجوال]، الإيميل ← [البريد الإلكتروني]،
   الآيبان والحسابات ← [رقم الآيبان]، التوقيعات بخط اليد ← تُحذف.
   أسماء الشركات والمكاتب والجهات تبقى كما هي.
5. إذا كلمة غير واضحة في الصورة اكتب أقرب قراءة لها وبعدها (؟).
6. أخرج النص فقط بدون أي مقدمة أو تعليق أو Markdown، واترك سطراً فارغاً بين البنود.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST فقط" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const userDb = createClient(url, anon, { global: { headers: { Authorization: req.headers.get("Authorization") || "" } } });
  const { data: u } = await userDb.auth.getUser();
  if (!u?.user) return json({ error: "سجّل دخولك أولاً." }, 401);
  const { data: prof } = await userDb.from("profiles").select("is_admin").eq("id", u.user.id).single();
  if (!prof?.is_admin) return json({ error: "هذي الخاصية للمالك فقط." }, 403);

  const key = Deno.env.get("OPENROUTER_KEY") || "";
  if (!key) return json({ error: "مفتاح الإدارة غير مضبوط في السيرفر (OPENROUTER_KEY)." }, 500);

  let body: { images?: string[] };
  try { body = await req.json(); } catch { return json({ error: "طلب غير صالح." }, 400); }
  const images = (body.images || []).filter((x) => typeof x === "string" && /^data:image\/(jpeg|png|webp);base64,/.test(x));
  if (!images.length) return json({ error: "ما وصلت صور." }, 400);
  if (images.length > 6) return json({ error: "أرسل 6 صفحات كحد أقصى في الطلب الواحد." }, 400);
  if (images.some((x) => x.length > 3_000_000)) return json({ error: "صورة كبيرة مرة، صغّرها وجرب." }, 400);

  let model = DEFAULT_MODEL;
  if (service) {
    const admin = createClient(url, service);
    const { data: st } = await admin.from("site_settings").select("value").eq("key", "site").maybeSingle();
    const m = st?.value?.ocrModel;
    if (typeof m === "string" && /^[\w.-]+\/[\w.:-]+$/.test(m)) model = m;
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "X-Title": "oqood-ocr" },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 12000,
      messages: [{ role: "user", content: [{ type: "text", text: PROMPT }, ...images.map((u) => ({ type: "image_url", image_url: { url: u } }))] }],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    return json({ error: `تعذّرت القراءة من النموذج (${res.status}). ${t.slice(0, 300)}` }, 502);
  }
  const data = await res.json();
  const text = String(data?.choices?.[0]?.message?.content || "").replace(/^```\w*\n?|```$/g, "").trim();
  if (!text) return json({ error: "النموذج ما رجّع نص. جرّب صور أوضح." }, 502);
  return json({ text, model });
});
