const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });
  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.message || "请求失败");
  }
  return data.data;
}
