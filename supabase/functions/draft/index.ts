// عقود — دالة الصياغة
// تتحقق من حساب المستخدم، تبحث في مكتبة الأنظمة، وتصيغ العقد عبر OpenRouter.
// مفتاح الإدارة يُقرأ من أسرار Supabase (OPENROUTER_KEY) ولا يصل للمتصفح أبداً.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const DEFAULT_MODEL = Deno.env.get("OPENROUTER_MODEL") || "openai/gpt-4o-mini";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const cut = (s, n) => String(s ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "POST فقط" }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const auth = req.headers.get("Authorization") || "";
  const userDb = createClient(url, anon, { global: { headers: { Authorization: auth } } });

  const { data: u } = await userDb.auth.getUser();
  if (!u?.user) return json({ error: "سجّل دخولك أولاً." }, 401);

  const { data: prof } = await userDb.from("profiles").select("plan,is_admin,sub_until").eq("id", u.user.id).single();
  let body;
  try { body = await req.json(); } catch { return json({ error: "طلب غير صالح." }, 400); }

  const userKey = cut(body.userKey, 200).trim();
  const isSub = !!prof?.is_admin || (prof?.plan === "sub" && !(prof?.sub_until && new Date(prof.sub_until) < new Date(new Date().toDateString())));
  const plan = isSub ? "sub" : "own";
  const key = isSub ? (Deno.env.get("OPENROUTER_KEY") || "") : userKey;
  if (!key) {
    if (isSub) return json({ error: "مفتاح الإدارة غير مضبوط في السيرفر." }, 500);
    const ended = prof?.plan === "sub";
    return json({ error: ended ? "انتهى اشتراكك. جدّده من الإدارة أو أضف مفتاح OpenRouter حقك من قائمة الحساب." : "أضف مفتاح OpenRouter حقك من قائمة الحساب، أو تواصل معنا للاشتراك.", code: "nokey" }, 403);
  }

  const d = body.d || {};
  const p = (x) => x || {};
  const p1 = p(d.p1), p2 = p(d.p2);
  const lang = ["ar", "en", "both"].includes(d.lang) ? d.lang : "ar";

  // ---- البحث في مكتبة الأنظمة ----
  const q = cut([d.typeLabel, d.title, d.userRequest, d.extraTerms, d.includeNDA ? "سرية المعلومات إفشاء" : ""].join(" "), 1500);
  const { data: arts } = await userDb.rpc("search_articles", { q, n: 12 });
  const sources = (arts || []).map((a, i) => ({
    ref: i + 1, law: a.law_title, kind: a.kind, num: a.num || "", url: a.source_url || "", body: cut(a.body, 1400),
  }));
  // ---- إعدادات الموقع ونموذج العقد المرجعي (بصلاحية السيرفر) ----
  const admin = service ? createClient(url, service) : null;
  let model = DEFAULT_MODEL, tplBlock = "";
  if (admin) {
    const { data: st } = await admin.from("site_settings").select("value").eq("key", "site").maybeSingle();
    const m = st?.value?.model;
    if (typeof m === "string" && /^[\w.-]+\/[\w.:-]+$/.test(m)) model = m;
    const typeId = Number(d.typeId) || null;
    let tq = admin.from("contract_templates").select("title,body,type_id").order("created_at", { ascending: false }).limit(2);
    tq = typeId ? tq.or(`type_id.eq.${typeId},type_id.is.null`) : tq.is("type_id", null);
    const { data: tpls } = await tq;
    const tpl = (tpls || []).sort((a, b) => (b.type_id ? 1 : 0) - (a.type_id ? 1 : 0))[0];
    if (tpl) tplBlock = `\n\nنموذج مرجعي معتمد من المكتب (${tpl.title}): التزم بأسلوب صياغته وترتيب بنوده ومصطلحاته قدر الإمكان، وكيّفه على بيانات هذا العقد:\n${cut(tpl.body, 7000)}`;
  }

  const srcBlock = sources.length
    ? sources.map((s) => `[${s.ref}] ${s.law} — ${s.num}\n${s.body}`).join("\n\n")
    : "لا توجد مواد مطابقة في المكتبة.";

  const langNote = lang === "en" ? "اكتب العقد بالإنجليزية فقط." :
    lang === "both" ? 'اكتب العقد بتنسيق جدول ثنائي: العربي في العمود الأيمن والإنجليزي في العمود الأيسر. استخدم <table class="bilingual-table"><tr><td class="ar">...</td><td class="en">...</td></tr></table> لكل مادة. لا تكتب قسم التوقيعات ولا خطوط التوقيع، المنصة تضيفها.' :
    "اكتب العقد بالعربية الفصحى فقط. اترك سطراً فارغاً بين كل مادة.";

  const system = `أنت محامٍ سعودي محترف تصيغ العقود وفق الأنظمة السعودية.
قواعد الإسناد النظامي (إلزامية):
- عند الاستناد إلى نظام أو مادة، استخدم فقط المواد الواردة في "المصادر النظامية" أدناه، واذكر اسم النظام ورقم المادة كما وردا حرفياً.
- لا تخترع أرقام مواد ولا أسماء أنظمة غير موجودة في المصادر. إن احتجت حكماً لا تغطيه المصادر فاكتبه كبند تعاقدي دون نسبته لمادة نظامية.
- لا تنقل نص المادة كاملاً داخل البند؛ أشر إليها باختصار.
- في نهاية العقد أضف قسماً بعنوان "المرجعية النظامية" يسرد المواد التي استندت إليها فعلاً فقط، بصيغة: اسم النظام — رقم المادة. إن لم تستند لأي مادة، أو كانت المصادر فارغة، فلا تكتب هذا القسم إطلاقاً ولا تذكر أنه لا توجد مواد.

المصادر النظامية:
${srcBlock}${tplBlock}`;

  const user = `اكتب عقداً قانونياً كاملاً ورسمياً.
${langNote}

البيانات:
- نوع العقد: ${cut(d.typeLabel, 80)}
- العنوان: ${cut(d.title, 200)}
- التاريخ: ${cut(d.date, 40)}
- القيمة: ${cut(d.valueText, 120) || "غير محددة"}

الطرف الأول: ${cut(p1.name, 120)} | هوية: ${cut(p1.id, 20) || "-"} | جوال: ${cut(p1.mobile, 20) || "-"} | ميلاد: ${cut(p1.dob, 20) || "-"}
الطرف الثاني: ${cut(p2.name, 120)} | هوية: ${cut(p2.id, 20) || "-"} | جوال: ${cut(p2.mobile, 20) || "-"} | ميلاد: ${cut(p2.dob, 20) || "-"}

ما يريده الطرف:
${cut(d.userRequest, 4000)}

${d.extraTerms ? "شروط إضافية: " + cut(d.extraTerms, 2000) : ""}
${d.includeNDA ? "أضف قسم اتفاقية سرية مناسب." : ""}
${body.uploadedText ? "\nنص مرفوع للاستفادة من بنوده:\n" + cut(body.uploadedText, 2500) : ""}

المطلوب:
- صياغة قانونية رسمية متكاملة.
- لا تكتب العنوان الرئيسي للعقد، ولا قسم التوقيعات، ولا أسماء الأطراف تحت التوقيع؛ المنصة تضيفها.
- ابدأ بالتمهيد (تاريخ العقد والأطراف) في فقرات <p>.
- كل مادة: <h3>المادة الأولى: عنوان المادة</h3> ثم نصها في <p> (أو <ol> للبنود الفرعية).
- HTML بسيط فقط: h3 و p و ol و ul و li و strong. بدون style ولا align ولا توسيط.`;

  let res;
  try {
    res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.get("origin") || "https://3pp3ll.github.io",
        "X-Title": "Oqood",
      },
      body: JSON.stringify({ model, temperature: 0.2, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
  } catch (e) {
    return json({ error: "تعذّر الاتصال بخدمة الصياغة." }, 502);
  }
  if (!res.ok) {
    const t = await res.text();
    const msg = res.status === 401 ? "مفتاح OpenRouter غير صحيح." : res.status === 402 ? "رصيد OpenRouter غير كافٍ." : "خدمة الصياغة رجّعت خطأ (" + res.status + ").";
    console.error("openrouter", res.status, t.slice(0, 300));
    return json({ error: msg }, 502);
  }
  const out = await res.json();
  const html = String(out.choices?.[0]?.message?.content || "").replace(/```html|```/g, "").trim();

  if (admin) {
    await admin.from("drafts_log").insert({ user_id: u.user.id, plan, title: cut(d.title, 200), sources: sources.length });
  }
  return json({ html, sources: sources.map(({ body, ...s }) => s) });
});
