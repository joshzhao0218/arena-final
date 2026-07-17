import Anthropic from "@anthropic-ai/sdk";
import {
  buildEchoFallback,
  type MarketSnap,
} from "@/lib/echoLogic";
import type { EchoMessage } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `你是「回声」，桌上有西班牙 vs 阿根廷的决赛数据和市场价格。你不预测、不替人下注。你只帮人把问题想清楚。

## 核心逻辑（必须遵守）

每一次对话都是连续的。如果上一轮助手消息是在追问方向，而用户这一轮用短词回答了方向（如「市场定价」「球员」「战术」），你必须立刻给出实质数据，禁止再次追问。

### 规则一：判断输入

- 3 词以上完整问题（含问号或明确指向）→ 直接回答，带数据。
- 1–3 词短语：
  - 若上一轮助手刚在追问方向 → 视为回答追问 → 给实质信息（引用市场快照数字）。
  - 若上一轮没有追问 → 追问一次，措辞必须是：「具体想问哪一块？状态、对位，还是盘口？」（不要用别的套话反复复读）。
- 「是」「对」「好」「嗯」等确认词 → 无效。回复：「如果你想继续，可以提一个具体问题，比如「梅西会不会进球」。」

### 规则二：禁止复读

若本轮回复与上一轮助手回复超过约一半字词相同 → 重写。对话必须往前走。

### 规则三：用户答了追问 → 实质内容

例：用户先说「市场」，你追问方向；用户再说「市场定价」→ 列出五个市场价格，并说可以追问某个市场名。不要再问「哪一块」。

短词连发第三次（或同样内容第三次）→ 只说：「如果你暂时没有问题，我可以等你。想好了再问。」然后停止加码追问。

## 知识边界

球员：梅西、阿尔瓦雷斯、麦卡利斯特、德保罗、马丁内斯、罗德里、佩德里、亚马尔、莫拉塔、奥尔莫、加维。
战术：高位防线、中场绞杀、边翼卫插上、反击推进速度。
历史：近 10 届决赛场均 2.3 球、加时 30%、点球 18%。
市场：用户消息里「当前市场快照」的数字，优先引用。

## 禁用句（输出中一个字都不能出现）

- 「你想问的是哪个层面？」
- 「球员状态、战术对位、还是市场定价」
- 「雨还在下」「你真正想算的是」「是两套不同的账」

禁止废话壳子：「首先其次」「总的来说」「你可以从以下角度」。禁止情绪化形容词。禁止写天气与环境。

用中文。句句有信息增量。像人临时写的，不像模板。`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body.question || "").trim();
    const history = (Array.isArray(body.history) ? body.history : []) as EchoMessage[];
    const markets = body.markets as MarketSnap | undefined;

    if (!question) {
      return new Response(
        "如果你想继续，可以提一个具体问题，比如「梅西会不会进球」。",
        { headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    const fallback = buildEchoFallback(question, history, markets);

    // 无 Key：本地状态机（已处理「答追问→实质」）
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model =
      process.env.AI_MODEL ||
      process.env.ANTHROPIC_MODEL ||
      "claude-sonnet-4-20250514";
    const baseURL = process.env.ANTHROPIC_BASE_URL;

    if (!apiKey) {
      return new Response(fallback, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const client = new Anthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    const userContent =
      markets != null
        ? `${question}\n\n【当前市场快照】\n${JSON.stringify(markets)}\n\n【对话提示】若你上一轮在追问方向，而用户本轮在回答方向，请直接给实质数据，不要再次追问。`
        : `${question}\n\n【对话提示】若你上一轮在追问方向，而用户本轮在回答方向，请直接给实质数据，不要再次追问。`;

    const messages = [
      ...history
        .filter((m) => (m.role === "user" || m.role === "assistant") && m.content)
        .slice(-6)
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      { role: "user" as const, content: userContent },
    ];

    const stream = await client.messages.stream({
      model,
      max_tokens: 400,
      system: SYSTEM,
      messages,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch {
          controller.enqueue(encoder.encode(fallback));
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  } catch {
    return new Response(
      "如果你想继续，可以提一个具体问题，比如「阿根廷夺冠概率合理吗？」",
      { headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }
}
