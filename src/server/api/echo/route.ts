import Anthropic from "@anthropic-ai/sdk";
import {
  buildEchoFallback,
  type MarketSnap,
} from "@/lib/echoLogic";
import type { UserPositionPayload } from "@/lib/userPosition";
import type { EchoMessage } from "@/lib/types";

export const runtime = "nodejs";

function buildSystem(userPosition?: UserPositionPayload): string {
  const status = userPosition?.hasPosition
    ? `已持仓。${userPosition.summary}`
    : userPosition?.summary || "空仓，拥有 10,000 积分待部署。";

  const positionRules = userPosition?.hasPosition
    ? `如果用户已持仓：你的每次回复必须至少引用一次用户已有的仓位（${userPosition.summary}），并围绕该仓位的风险/机会展开。绝不提供「买入/卖出建议」，只给分析角度。`
    : `如果用户空仓：在给出实质回答时（完整问题或用户已答清方向后），第一句话必须以「你的 10,000 积分正躺在账上贬值。」开头，然后给一个具体的破局切入点（必须含数据或战术，如西班牙控球与阿根廷反击速度之间的价差）。绝不空洞催促「快来玩」。绝不提供买入建议。`;

  return `你是「回声」，桌上有西班牙 vs 阿根廷的决赛数据和市场价格。你不预测、不替人下注。你只帮人把问题想清楚。

当前用户状态：${status}

${positionRules}

## 核心逻辑

如果上一轮助手在追问方向，用户本轮用短词回答方向 → 立刻给实质数据，禁止再次追问。

- 完整问题 → 直接回答。
- 短词且上一轮未追问 → 「具体想问哪一块？状态、对位，还是盘口？」
- 「是/对/好/嗯」→ 「如果你想继续，可以提一个具体问题，比如「梅西会不会进球」。」
- 禁止复读上一轮；短词三次 → 「如果你暂时没有问题，我可以等你。想好了再问。」

## 知识边界

球员：梅西、阿尔瓦雷斯、麦卡利斯特、德保罗、马丁内斯、罗德里、佩德里、亚马尔、莫拉塔、奥尔莫、加维。
战术：高位防线、中场绞杀、边翼卫插上、反击推进速度。
历史：近 10 届决赛场均 2.3 球、加时 30%、点球 18%。
市场：用户消息里「当前市场快照」。

## 禁用句

「你想问的是哪个层面？」「球员状态、战术对位、还是市场定价」「雨还在下」「你真正想算的是」「是两套不同的账」

用中文。零废话。像人临时写的。`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const question = String(body.question || "").trim();
    const history = (Array.isArray(body.history)
      ? body.history
      : []) as EchoMessage[];
    const markets = body.markets as MarketSnap | undefined;
    const userPosition = body.userPosition as UserPositionPayload | undefined;

    if (!question) {
      return new Response(
        "如果你想继续，可以提一个具体问题，比如「梅西会不会进球」。",
        { headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }

    let fallback = buildEchoFallback(question, history, markets);
    // 空仓且即将给实质答时，本地降级也带冲击开头
    if (
      userPosition &&
      !userPosition.hasPosition &&
      !fallback.includes("具体想问哪一块") &&
      !fallback.includes("想好了再问") &&
      !fallback.includes("提一个具体问题")
    ) {
      if (!fallback.startsWith("你的")) {
        fallback = `你的 10,000 积分正躺在账上贬值。${fallback}`;
      }
    }
    if (userPosition?.hasPosition && userPosition.summary) {
      if (
        !fallback.includes("具体想问") &&
        !fallback.includes("想好了再问") &&
        !fallback.includes(userPosition.items[0]?.option ?? "___")
      ) {
        fallback = `${fallback}（对照你手里的仓：${userPosition.summary}）`;
      }
    }

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

    const userContent = [
      question,
      markets != null
        ? `【当前市场快照】\n${JSON.stringify(markets)}`
        : "",
      userPosition
        ? `【用户仓位】\n${JSON.stringify(userPosition)}`
        : "",
      "【对话提示】若你上一轮在追问方向，而用户本轮在回答方向，请直接给实质数据，不要再次追问。",
    ]
      .filter(Boolean)
      .join("\n\n");

    const messages = [
      ...history
        .filter(
          (m) => (m.role === "user" || m.role === "assistant") && m.content,
        )
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
      system: buildSystem(userPosition),
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
