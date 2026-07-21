export function pathWithSearchParams(path, params) {
  const urlSearchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (Array.isArray(value)) {
      for (const item of value) urlSearchParams.append(key, item);
    } else if (typeof value === "string") {
      urlSearchParams.append(key, value);
    }
  }

  const query = urlSearchParams.toString();
  return `${path}${query ? `?${query}` : ""}`;
}
