const originalFetch = window.fetch;

window.fetch = async (...args) => {
  let [resource, config] = args;
  const token = localStorage.getItem("cbt_token");

  if (token) {
    if (!config) config = {};
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`
    };
  }

  try {
    const impersonateRaw = sessionStorage.getItem("cbt_impersonate");
    if (impersonateRaw) {
      const impersonate = JSON.parse(impersonateRaw);
      if (impersonate?.id) {
        if (!config) config = {};
        config.headers = {
          ...config.headers,
          "X-Company-Override": String(impersonate.id)
        };
      }
    }
  } catch {
    // ignore malformed impersonation data
  }

  const response = await originalFetch(resource, config);

  if (response.status === 401 && window.location.pathname !== "/" && window.location.pathname !== "/login/candidate") {
    localStorage.removeItem("cbt_token");
    sessionStorage.removeItem("cbt_impersonate");
    window.location.href = "/";
  }

  return response;
};
