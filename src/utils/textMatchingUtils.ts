/**
 * 文字匹配工具函数
 * @description 提供文字匹配相关的辅助工具函数
 */

import type {
  ScreenTextElement,
  MatchMode,
  MatchContext,
} from '../types';

/**
 * 睡眠函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 在指定区域中查找文字
 */
export function findTextInRegion(
  elements: ScreenTextElement[],
  targetText: string,
  region: { x: number; y: number; width: number; height: number },
  matchMode: MatchMode = MatchMode.CONTAINS
): ScreenTextElement | null {
  const inRegionElements = elements.filter(
    (element) =>
      element.x >= region.x &&
      element.y >= region.y &&
      element.x <= region.x + region.width &&
      element.y <= region.y + region.height
  );

  return inRegionElements.find((element) =>
    isTextMatched(element.text, targetText, matchMode)
  ) || null;
}

/**
 * 查找最近的文字元素
 */
export function findNearestText(
  elements: ScreenTextElement[],
  targetText: string,
  reference: { x: number; y: number },
  matchMode: MatchMode = MatchMode.CONTAINS,
  maxDistance?: number
): ScreenTextElement | null {
  const matched = elements.filter((element) =>
    isTextMatched(element.text, targetText, matchMode)
  );

  if (matched.length === 0) {
    return null;
  }

  const withDistance = matched.map((element) => ({
    element,
    distance: calculateDistance(
      reference.x,
      reference.y,
      element.x + element.width / 2,
      element.y + element.height / 2
    ),
  }));

  const filtered = maxDistance
    ? withDistance.filter((item) => item.distance <= maxDistance)
    : withDistance;

  if (filtered.length === 0) {
    return null;
  }

  return filtered
    .sort((a, b) => a.distance - b.distance)[0].element;
}

/**
 * 计算两点之间的距离
 */
function calculateDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

/**
 * 判断文字是否匹配
 */
export function isTextMatched(
  text: string,
  target: string,
  mode: MatchMode
): boolean {
  switch (mode) {
    case MatchMode.EXACT:
      return text === target;
    case MatchMode.CONTAINS:
      return text.toLowerCase().includes(target.toLowerCase());
    case MatchMode.STARTS_WITH:
      return text.toLowerCase().startsWith(target.toLowerCase());
    case MatchMode.ENDS_WITH:
      return text.toLowerCase().endsWith(target.toLowerCase());
    case MatchMode.REGEX:
      try {
        const regex = new RegExp(target, 'i');
        return regex.test(text);
      } catch {
        return false;
      }
    default:
      return text.toLowerCase().includes(target.toLowerCase());
  }
}

/**
 * 计算两个字符串的相似度（0-1）
 */
export function calculateSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  const longerLength = longer.length;
  if (longerLength === 0) {
    return 1.0;
  }

  const distance = editDistance(longer, shorter);
  return (longerLength - distance) / longerLength;
}

/**
 * 计算编辑距离（Levenshtein 距离）
 */
export function editDistance(s1: string, s2: string): number {
  const costs = new Array(s2.length + 1).fill(0);
  for (let i = 0; i < s2.length + 1; i++) {
    costs[i] = i;
  }

  for (let i = 1; i < s1.length + 1; i++) {
    let nw = i - 1;
    costs[0] = i;

    for (let j = 1; j < s2.length + 1; j++) {
      const cj =
        Math.min(
          1 + Math.min(costs[j], costs[j - 1]),
          s1[i - 1] === s2[j - 1] ? nw : nw + 1
        );
      nw = costs[j];
      costs[j] = cj;
    }
  }

  return costs[s2.length];
}

/**
 * 计算屏幕文字元素的哈希值
 */
export function calculateElementHash(element: ScreenTextElement): string {
  const str = `${element.text}:${element.x.toFixed(0)}:${element.y.toFixed(0)}`;
  
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * 计算屏幕所有文字的哈希值
 */
export function calculateScreenHash(elements: ScreenTextElement[]): string {
  let hash = 0;
  for (const element of elements) {
    hash ^= element.text.length;
    hash ^= Math.floor(element.x);
    hash ^= Math.floor(element.y);
  }
  
  return Math.abs(hash).toString(36);
}

/**
 * 比较两组屏幕文字是否相似
 */
export function isScreenSimilar(
  elements1: ScreenTextElement[],
  elements2: ScreenTextElement[],
  threshold: number = 0.9
): boolean {
  if (elements1.length === 0 && elements2.length === 0) {
    return true;
  }

  if (Math.abs(elements1.length - elements2.length) > elements1.length * 0.2) {
    return false;
  }

  let matchedCount = 0;
  for (const e1 of elements1) {
    const matched = elements2.find(
      (e2) =>
        e1.text === e2.text &&
        Math.abs(e1.x - e2.x) < 10 &&
        Math.abs(e1.y - e2.y) < 10
    );
    if (matched) {
      matchedCount++;
    }
  }

  const similarity = matchedCount / elements1.length;
  return similarity >= threshold;
}

/**
 * 从屏幕文字中提取关键词
 */
export function extractKeywords(texts: string[], minLength: number = 2): string[] {
  const allText = texts.join(' ');
  const words = allText.split(/\s+/);
  
  const frequency = new Map<string, number>();
  for (const word of words) {
    if (word.length >= minLength) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  }
  
  return Array.from(frequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
}

/**
 * 格式化文字元素为字符串
 */
export function formatScreenText(elements: ScreenTextElement[]): string {
  return elements
    .map((element) => `[${element.x.toFixed(0)}, ${element.y.toFixed(0)}] ${element.text}`)
    .join('\n');
}

/**
 * 导出屏幕文字为 JSON
 */
export function exportScreenTextsToJSON(elements: ScreenTextElement[]): string {
  return JSON.stringify(elements, null, 2);
}

/**
 * 过滤屏幕文字（只保留包含特定关键词的）
 */
export function filterTextsByKeywords(
  elements: ScreenTextElement[],
  keywords: string[]
): ScreenTextElement[] {
  return elements.filter((element) =>
    keywords.some((keyword) =>
      element.text.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

/**
 * 按区域分组文字元素
 */
export function groupTextsByRegion(
  elements: ScreenTextElement[],
  regions: Array<{ x: number; y: number; width: number; height: number; name: string }>
): Map<string, ScreenTextElement[]> {
  const groups = new Map<string, ScreenTextElement[]>();
  
  for (const region of regions) {
    const inRegion = elements.filter(
      (element) =>
        element.x >= region.x &&
        element.y >= region.y &&
        element.x <= region.x + region.width &&
        element.y <= region.y + region.height
    );
    groups.set(region.name, inRegion);
  }
  
  return groups;
}

/**
 * 去重屏幕文字（相同文字和位置）
 */
export function deduplicateTexts(
  elements: ScreenTextElement[],
  tolerance: number = 5
): ScreenTextElement[] {
  const seen = new Set<string>();
  const result: ScreenTextElement[] = [];
  
  for (const element of elements) {
    const key = `${element.text}:${Math.floor(element.x / tolerance)}:${Math.floor(element.y / tolerance)}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      result.push(element);
    }
  }
  
  return result;
}

/**
 * 按位置排序屏幕文字
 */
export function sortTextsByPosition(
  elements: ScreenTextElement[],
  order: 'top-to-bottom' | 'bottom-to-top' | 'left-to-right' | 'right-to-left' = 'top-to-bottom'
): ScreenTextElement[] {
  return [...elements].sort((a, b) => {
    switch (order) {
      case 'top-to-bottom':
        return a.y - b.y;
      case 'bottom-to-top':
        return b.y - a.y;
      case 'left-to-right':
        return a.x - b.x;
      case 'right-to-left':
        return b.x - a.x;
    }
  });
}

/**
 * 计算文字元素的中心点
 */
export function getElementCenter(element: ScreenTextElement): { x: number; y: number } {
  return {
    x: element.x + element.width / 2,
    y: element.y + element.height / 2,
  };
}

/**
 * 检查元素是否在屏幕可视区域
 */
export function isElementVisible(
  element: ScreenTextElement,
  screenWidth: number,
  screenHeight: number
): boolean {
  return (
    element.x >= 0 &&
    element.y >= 0 &&
    element.x + element.width <= screenWidth &&
    element.y + element.height <= screenHeight
  );
}

/**
 * 查找最大的文字元素
 */
export function findLargestText(elements: ScreenTextElement[]): ScreenTextElement | null {
  if (elements.length === 0) {
    return null;
  }
  
  return elements.reduce((max, current) =>
    current.width * current.height > max.width * max.height ? current : max
  );
}

/**
 * 查找最小的文字元素
 */
export function findSmallestText(elements: ScreenTextElement[]): ScreenTextElement | null {
  if (elements.length === 0) {
    return null;
  }
  
  return elements.reduce((min, current) =>
    current.width * current.height < min.width * min.height ? current : min
  );
}

