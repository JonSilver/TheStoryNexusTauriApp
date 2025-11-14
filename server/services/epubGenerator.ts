import type { InferSelectModel } from "drizzle-orm";
import epubModule from "epub-gen-memory";
import type { schema } from "../db/client.js";

const epub = epubModule.default || epubModule;

type Story = InferSelectModel<typeof schema.stories>;
type Chapter = InferSelectModel<typeof schema.chapters>;

/**
 * Converts Lexical JSON content to HTML
 */
const convertLexicalToHtml = (jsonContent: string): string => {
    const editorState = JSON.parse(jsonContent);
    if (!editorState.root?.children) return "";

    const processNode = (node: any): string => {
        if (node.type === "text") return node.text || "";
        if (node.type === "linebreak") return "<br>";
        if (node.type === "paragraph") {
            const childrenHtml = node.children?.map(processNode).join("") || "";
            return `<p>${childrenHtml}</p>`;
        }
        if (node.type === "heading" && node.tag) {
            const childrenHtml = node.children?.map(processNode).join("") || "";
            return `<${node.tag}>${childrenHtml}</${node.tag}>`;
        }
        if (node.children) return node.children.map(processNode).join("");
        return "";
    };

    return editorState.root.children.map(processNode).join("");
};

/**
 * Generates an EPUB file from story and chapters
 */
export const generateEpub = async (story: Story, chapters: Chapter[]): Promise<Buffer> => {
    const chapterHtmls = chapters.map(chapter => convertLexicalToHtml(chapter.content));

    const epubChapters = [
        {
            title: "",
            content: `
                <div class="cover-page">
                    <h1 class="cover-title">${story.title}</h1>
                    <p class="cover-author">by ${story.author}</p>
                    ${story.synopsis ? `<div class="cover-synopsis"><p><strong>Synopsis</strong></p><p>${story.synopsis}</p></div>` : ""}
                </div>
            `,
            excludeFromToc: true,
            beforeToc: true
        },
        ...chapters.map((chapter, idx) => ({
            title: `Chapter ${chapter.order}: ${chapter.title}`,
            content: chapterHtmls[idx]
        }))
    ];

    const css = `
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            line-height: 1.6;
            margin: 1em;
        }
        .cover-page {
            text-align: center;
            padding-top: 0;
            page-break-after: always;
        }
        .cover-title {
            font-size: 2.5em;
            font-weight: bold;
            margin-bottom: 0.5em;
        }
        .cover-author {
            font-size: 1.5em;
            font-style: italic;
            margin-bottom: 2em;
        }
        .cover-synopsis {
            margin-top: 3em;
            text-align: left;
            max-width: 80%;
            margin-left: auto;
            margin-right: auto;
        }
        .chapter {
            page-break-before: always;
        }
        .chapter-title {
            font-size: 1.5em;
            font-weight: bold;
            margin-top: 2em;
            margin-bottom: 1em;
            text-align: center;
        }
        .chapter-content {
            text-align: justify;
        }
        p {
            margin: 1em 0;
            text-indent: 1.5em;
        }
        p:first-child {
            text-indent: 0;
        }
        h1, h2, h3, h4, h5, h6 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: bold;
        }
    `;

    const options = {
        title: story.title,
        author: story.author,
        ...(story.synopsis && { description: story.synopsis }),
        lang: story.language || "en",
        css
    };

    return await epub(options, epubChapters);
};
