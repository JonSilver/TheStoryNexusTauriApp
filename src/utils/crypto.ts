export const randomUUID = (): string => {
    if (typeof window !== "undefined" && window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    throw new Error("crypto.randomUUID is not available");
};
