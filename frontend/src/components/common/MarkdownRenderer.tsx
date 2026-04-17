"use client";

import { useMemo } from "react";

/**
 * 轻量级 Markdown 渲染组件（无外部依赖）
 * 支持：标题、粗体、斜体、代码块、行内代码、列表、链接、表格
 */
export default function MarkdownRenderer({ content }: { content: string }) {
  const html = useMemo(() => renderMarkdown(content), [content]);

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        fontSize: "14px",
        lineHeight: "1.75",
        color: "var(--text-hi)",
        wordBreak: "break-word",
      }}
    />
  );
}

function renderMarkdown(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;
  let inTable = false;
  let inList = false;
  let listType = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块
    if (line.trimStart().startsWith("```")) {
      if (inCodeBlock) {
        result.push("</code></pre>");
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        const lang = line.trimStart().slice(3).trim();
        result.push(`<pre style="background:rgba(0,0,0,0.3);border:1px solid var(--glass-border);border-radius:10px;padding:16px;overflow-x:auto;margin:12px 0"><code${lang ? ` class="language-${lang}"` : ""}>`);
      }
      continue;
    }
    if (inCodeBlock) {
      result.push(escapeHtml(line));
      continue;
    }

    // 空行
    if (line.trim() === "") {
      if (inList) { result.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }
      if (inTable) { result.push("</tbody></table>"); inTable = false; }
      continue;
    }

    // 表格
    if (line.includes("|") && line.trim().startsWith("|")) {
      const cells = line.split("|").filter(c => c.trim() !== "");
      // 检查是否是分隔行
      if (cells.every(c => /^[\s\-:]+$/.test(c))) continue;

      if (!inTable) {
        inTable = true;
        result.push("<table style='width:100%;border-collapse:collapse;margin:12px 0'><tbody>");
      }
      result.push("<tr>");
      cells.forEach((cell, idx) => {
        const tag = i === 0 || (inTable && result.filter(r => r.includes("<tr>")).length <= 1) ? "th" : "td";
        const align = cell.trim().startsWith(":") && cell.trim().endsWith(":") ? "center" : cell.trim().endsWith(":") ? "right" : "left";
        result.push(`<${tag} style='border:1px solid var(--glass-border);padding:8px 12px;text-align:${align};font-size:13px'>${inlineMarkdown(cell.trim())}</${tag}>`);
      });
      result.push("</tr>");
      continue;
    }
    if (inTable) { result.push("</tbody></table>"); inTable = false; }

    // 标题
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = inlineMarkdown(headingMatch[2]);
      const sizes = { 1: "20px", 2: "18px", 3: "16px", 4: "15px", 5: "14px", 6: "13px" };
      result.push(`<h${level} style='font-size:${sizes[level as keyof typeof sizes]};font-weight:700;margin:16px 0 8px;color:var(--text-hi)'>${text}</h${level}>`);
      continue;
    }

    // 无序列表
    const ulMatch = line.match(/^[\s]*[-*+]\s+(.+)/);
    if (ulMatch) {
      if (!inList || listType !== "ul") {
        if (inList) result.push(listType === "ul" ? "</ul>" : "</ol>");
        result.push("<ul style='padding-left:20px;margin:8px 0'>");
        inList = true; listType = "ul";
      }
      result.push(`<li style='margin:4px 0;color:var(--text-hi)'>${inlineMarkdown(ulMatch[1])}</li>`);
      continue;
    }

    // 有序列表
    const olMatch = line.match(/^[\s]*\d+\.\s+(.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        if (inList) result.push(listType === "ul" ? "</ul>" : "</ol>");
        result.push("<ol style='padding-left:20px;margin:8px 0'>");
        inList = true; listType = "ol";
      }
      result.push(`<li style='margin:4px 0;color:var(--text-hi)'>${inlineMarkdown(olMatch[1])}</li>`);
      continue;
    }

    // 关闭列表
    if (inList) { result.push(listType === "ul" ? "</ul>" : "</ol>"); inList = false; }

    // 普通段落
    result.push(`<p style='margin:8px 0'>${inlineMarkdown(line)}</p>`);
  }

  // 关闭未闭合的标签
  if (inCodeBlock) result.push("</code></pre>");
  if (inList) result.push(listType === "ul" ? "</ul>" : "</ol>");
  if (inTable) result.push("</tbody></table>");

  return result.join("\n");
}

function inlineMarkdown(text: string): string {
  // 行内代码
  text = text.replace(/`([^`]+)`/g, '<code style="background:rgba(0,240,255,0.08);padding:2px 6px;border-radius:4px;font-size:13px;font-family:monospace;color:var(--cyan)">$1</code>');
  // 粗体
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 斜体
  text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // 链接
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:var(--cyan);text-decoration:underline">$1</a>');
  return escapeHtml(text, true);
}

function escapeHtml(str: string, skipProcessed = false): string {
  if (skipProcessed) return str; // inlineMarkdown 已处理，不再转义
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
