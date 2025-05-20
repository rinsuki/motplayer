export function escapeHTML(str: string) {
    return str.split("").map(x => "&#" + x.charCodeAt(0) + ";").join("")
}