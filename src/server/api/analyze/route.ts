import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { AnalystResponse } from "@/lib/types";

export const runtime = "nodejs";

const SYSTEM = `你是一位冷静、刻薄但精准的决赛分析师，只关注 2026 世界杯决赛：西班牙 vs 阿根廷。

允许引用的球员姓名（白名单，禁止编造任何名单外姓名）：
西班牙：罗德里、佩德里、亚马尔、莫拉塔、奥尔莫、库巴尔西、卡马文加（若出场）、西蒙
阿根廷：梅西、阿尔瓦雷斯、麦卡利斯特、恩佐·费尔南德斯、马丁内斯（门将）、德保罗、莫利纳、迪马利亚

给定五个市场的聚合数据（当前价格、成交量、最近变化），输出一个 JSON：
{
  "verdict": "市场整体倾向谁？偏差多少？",
  "tacticalRead": "赔率对应的场上战术含义",
  "sharpMove": "异常资金流动",
  "edge": "一个非显而易见的交易观察，必须引用白名单内真实球员或战术，绝不说「一切皆有可能」"
}

CRITICAL：只引用上述已知真实姓名，禁止编造球员（如「佩德雷霍斯」「罗马尔达斯」等幻觉名）。返回纯 JSON。值内引号用「」。绝不说「足球是圆的」。用中文回复。`;

const FALLBACK: AnalystResponse = {
  verdict:
    "市场将阿根廷定价为微弱热门，但西班牙控球骨架的定价尚未完全消化。",
  tacticalRead:
    "大于 2.5 球定价偏高，市场预期开放对攻，而非罗德里主导的沉闷控球决赛。",
  sharpMove: "双骄进球市场成交相对清淡，叙事溢价尚未被大单证伪。",
  edge:
    "市场过度回味阿根廷半决赛的韧性，却低估佩德里衔接与亚马尔边路撕裂的持续威胁。",
};

function extractJson(text: string): AnalystResponse | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const obj = JSON.parse(candidate.slice(start, end + 1)) as AnalystResponse;
    if (obj.verdict && obj.tacticalRead && obj.sharpMove && obj.edge) return obj;
    return null;
  } catch {
    return null;
  }
}

async function callModel(
  client: Anthropic,
  model: string,
  userPayload: string,
): Promise<string> {
  const msg = await client.messages.create({
    model,
    max_tokens: 800,
    system: SYSTEM,
    messages: [{ role: "user", content: userPayload }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.AI_MODEL || process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";
    const baseURL = process.env.ANTHROPIC_BASE_URL;

    if (!apiKey) {
      return NextResponse.json(FALLBACK);
    }

    const client = new Anthropic({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });

    const userPayload = JSON.stringify({
      instruction: "请输出严格 JSON（verdict/tacticalRead/sharpMove/edge）。中文。",
      markets: body.markets,
      positions: body.positions ?? [],
    });

    let text = await callModel(client, model, userPayload);
    let parsed = extractJson(text);

    if (!parsed) {
      text = await callModel(
        client,
        model,
        userPayload + "\n\n上次无法解析。请只返回纯 JSON，不要 markdown。",
      );
      parsed = extractJson(text);
    }

    return NextResponse.json(parsed ?? FALLBACK);
  } catch {
    return NextResponse.json(FALLBACK);
  }
}
