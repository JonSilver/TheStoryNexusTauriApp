import { useEffect, useCallback } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import { debounce } from "lodash";
import { useToolbarState } from "../../context/ToolbarContext";
import { $isElementNode, type LexicalNode } from "lexical";
import { countWords } from "@/utils/textUtils";

export function WordCountPlugin() {
    const [editor] = useLexicalComposerContext();
    const { updateToolbarState } = useToolbarState();

    const updateWordCount = useCallback(
        debounce(() => {
            let text = "";
            editor.getEditorState().read(() => {
                const root = editor._editorState._nodeMap.get("root");
                if (root && $isElementNode(root)) {
                    function traverse(node: LexicalNode) {
                        if ($isElementNode(node)) {
                            const children = node.getChildren();
                            if (children.length === 0 && node.getTextContent) {
                                // Element node with no children, treat as leaf
                                text += node.getTextContent() + " ";
                            } else {
                                children.forEach(traverse);
                            }
                        } else if (node.getTextContent) {
                            text += node.getTextContent() + " ";
                        }
                    }
                    root.getChildren().forEach(traverse);
                }
            });
            updateToolbarState("wordCount", countWords(text));
        }, 500),
        [editor, updateToolbarState]
    );

    useEffect(() => {
        const unregister = editor.registerUpdateListener(() => {
            updateWordCount();
        });
        return () => {
            unregister();
            updateWordCount.cancel();
        };
    }, [editor, updateWordCount]);

    return null;
}
