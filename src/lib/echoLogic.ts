import type { EchoMessage } from "./types";

/** 上一轮是否在追问（多种措辞） */
export function wasClarifying(text: string): boolean {
  return /具体想问|哪一块|哪一层|哪个方面|哪个市场|想问哪|状态.*对位|对位.*盘口|球员还是|还是盘口/.test(
    text,
  );
}

export function isAck(q: string): boolean {
  return /^(是|对|好|嗯|哦|行|可以|ok|OK|yes|嗯嗯|好的|对的|是的)[.。!！…]*$/i.test(
    q.trim(),
  );
}

export function isShortPhrase(q: string): boolean {
  const t = q.trim();
  if (!t) return true;
  if (/[？?]/.test(t)) return false;
  if (
    /会不会|能不能|值不值|多少|为什么|怎么|是否|概率|合理|进球吗|夺冠/.test(t)
  ) {
    return false;
  }
  const chars = t.replace(/\s/g, "");
  // 约 1–6 字且无完整问句结构 → 短词
  return chars.length <= 6;
}

export function isRepeat(q: string, lastUser?: string): boolean {
  if (!lastUser) return false;
  const a = q.trim();
  const b = lastUser.trim();
  if (a === b) return true;
  if (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a))) {
    return true;
  }
  return false;
}

/** 连续短词/重复轮数（看最近用户消息） */
export function countShortStreak(history: EchoMessage[], current: string): number {
  let n = isShortPhrase(current) || isAck(current) ? 1 : 0;
  if (n === 0) return 0;
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.role !== "user") continue;
    if (isShortPhrase(m.content) || isAck(m.content)) n++;
    else break;
  }
  return n;
}

export type MarketSnap = {
  champion?: { argentina?: string; spain?: string };
  regular_time?: { spain?: string; draw?: string; argentina?: string };
  goals_over_2_5?: string;
  penalty_yes?: string;
  duo_yes?: string;
};

export function formatMarkets(markets?: MarketSnap | null): string {
  if (!markets) {
    return "阿根廷夺冠、总进球、双骄进球等五个市场的价格在桌上——刷新页面后会带上实时数。";
  }
  const a = markets.champion?.argentina ?? "—";
  const g = markets.goals_over_2_5 ?? "—";
  const d = markets.duo_yes ?? "—";
  const p = markets.penalty_yes ?? "—";
  const rt = markets.regular_time;
  const rtLine = rt
    ? `常规时间 西${rt.spain}/平${rt.draw}/阿${rt.argentina}`
    : "";
  return `阿根廷夺冠 ${a}、总进球大于2.5 ${g}、双骄进球 ${d}、点球 ${p}${rtLine ? `、${rtLine}` : ""}`;
}

/** 用户在回答「追问」时的方向 */
export function resolveFollowUpTopic(q: string): "market" | "player" | "tactical" | "other" {
  const t = q.trim();
  if (/市场|定价|盘口|赔率|概率|价格/.test(t)) return "market";
  if (/球员|状态|梅西|亚马尔|罗德里|佩德里|阿尔瓦雷斯|莫拉塔/.test(t))
    return "player";
  if (/战术|对位|防线|绞杀|反击|控球/.test(t)) return "tactical";
  return "other";
}

export function substanceForFollowUp(
  topic: ReturnType<typeof resolveFollowUpTopic>,
  priorUserShort: string | undefined,
  markets?: MarketSnap | null,
): string {
  const who = priorUserShort?.replace(/\s/g, "") || "";
  const prices = formatMarkets(markets);

  if (topic === "market") {
    return `市场定价指的是五个盘口的隐含概率：${prices}。你想追问哪个市场，直接说名字。`;
  }
  if (topic === "tactical") {
    return "西班牙靠高位防线和中场绞杀控节奏；阿根廷吃反击推进速度。对位关键在边路——亚马尔拉扯 vs 莫利纳/罗梅罗一侧的回收。你想看哪一侧？";
  }
  if (/梅西/.test(who)) {
    return "梅西决赛触球位置往往比联赛后撤，射门距离变远；但西班牙高位防线怕单刀。你想深入触球位置，还是单刀转化？";
  }
  if (topic === "player") {
    return "球员层：梅西决赛触球往往更靠后；亚马尔吃边路一对一；罗德里管中场绞杀的节拍。你点一个名字。";
  }
  if (/亚马尔/.test(who)) {
    return "亚马尔吃的是边路一对一和传中成功率；阿根廷边翼卫插上时他身后会空。你想看他的射门转化，还是对位消耗？";
  }
  if (/总进球|进球/.test(who)) {
    return `近 10 届决赛场均 2.3 球，2.5 线略高。当前大于 2.5 市场在 ${markets?.goals_over_2_5 ?? "桌上"}。你想拆历史均值，还是两队风格？`;
  }
  if (/点球/.test(who)) {
    return `决赛点球历史概率大约 18% 量级（加时路径更长）。当前点球市场 ${markets?.penalty_yes ?? "在桌上"}。你想看加时路径，还是门将对位？`;
  }
  if (/冠军|夺冠|阿根廷|西班牙/.test(who)) {
    return `冠军盘：${prices}。近 10 届南美对欧洲常规时间胜率 29%——和夺冠盘不是同一层。你想盯常规时间还是含加时捧杯？`;
  }
  return `那就落到盘口上：${prices}。点一个市场名，我往下拆。`;
}

export function clarifyOnce(): string {
  // 禁用句不能出现；换一套等价追问
  return "具体想问哪一块？状态、对位，还是盘口？";
}

export function buildEchoFallback(
  question: string,
  history: EchoMessage[],
  markets?: MarketSnap | null,
): string {
  const q = question.trim();
  if (!q) {
    return "如果你想继续，可以提一个具体问题，比如「梅西会不会进球」。";
  }

  if (isAck(q)) {
    return "如果你想继续，可以提一个具体问题，比如「阿根廷夺冠概率合理吗？」";
  }

  const lastAssistant = [...history]
    .reverse()
    .find((m) => m.role === "assistant")?.content;
  const lastUser = [...history]
    .reverse()
    .find((m) => m.role === "user")?.content;
  const shortStreak = countShortStreak(history, q);

  if (shortStreak >= 3) {
    return "如果你暂时没有问题，我可以等你。想好了再问。";
  }

  // 上一轮刚追问过 → 本轮短词视为「回答追问」→ 实质内容
  if (lastAssistant && wasClarifying(lastAssistant) && isShortPhrase(q)) {
    const topic = resolveFollowUpTopic(q);
    // 上一轮用户的短词（如「梅西」「市场」）作上下文
    return substanceForFollowUp(topic, lastUser, markets);
  }

  if (isRepeat(q, lastUser) && isShortPhrase(q)) {
    return "你刚才问过这个了。你是想换一个方向，还是深入追问某一点？";
  }

  // 完整问题 → 实质答
  if (!isShortPhrase(q)) {
    if (/c罗|cristiano|罗纳尔多|姆巴佩|mbappé|mbappe/i.test(q)) {
      return "你问的人不在这场名单里。决赛是西班牙对阿根廷。你是不是想问梅西或者亚马尔？";
    }
    if (/该押|买哪个|押哪个|建议我/.test(q)) {
      return "没人能替你做决定。先点名一个市场：冠军、常规时间、总进球、点球，或双骄。";
    }
    if (/你觉得|会不会赢|能赢吗|谁赢/.test(q)) {
      const a = markets?.champion?.argentina;
      return a
        ? `我不做预测。阿根廷夺冠盘 ${a}，近 10 届南美对欧洲常规时间胜率 29%。差距你看到了。`
        : "我不做预测。近 10 届南美对欧洲常规时间胜率 29%，夺冠盘另算。差距你自己看。";
    }
    if (/2\.5|超过.*球|大于.*球/.test(q) || /总进球.*(会|吗|呢)/.test(q)) {
      const g = markets?.goals_over_2_5;
      return g
        ? `近 10 届决赛场均 2.3 球，2.5 线略高。西班牙高位防线碰上阿根廷反击另算。当前大于 2.5 在 ${g}。`
        : "近 10 届决赛场均 2.3 球，2.5 线略高于历史均值。西班牙高位防线碰上阿根廷反击，另算一笔。";
    }
    if (/梅西.*(进球|会不会)|进球.*梅西/.test(q)) {
      return "西班牙高位防线过去 5 场被打了 12 次单刀，但梅西决赛触球往往更靠后。拆开看，你自己选。";
    }
    if (/合理|定价|市场/.test(q) && /夺冠|阿根廷|冠军/.test(q)) {
      return `冠军盘现在：${formatMarkets(markets)}。和「常规时间胜率 29%」不是同一层。你盯哪一层？`;
    }
    // 通用完整问：给一点信息并指路
    return `${formatMarkets(markets)}。把问题收成一句带对象的，我往下拆。`;
  }

  // 短词且上一轮没有追问 → 追问一次
  return clarifyOnce();
}
