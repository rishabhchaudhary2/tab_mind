function getDomain(url: string) {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    const parts = hostname.split(".");

    if (parts.length >= 2) {
        return parts[parts.length - 2];
    }

    return hostname;
}

export { getDomain };